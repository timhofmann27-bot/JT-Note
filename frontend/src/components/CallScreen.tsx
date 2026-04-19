import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../utils/theme';
import { getSocket } from '../utils/api';

interface CallScreenProps {
  callId: string;
  remoteUserId: string;
  remoteName: string;
  callType: 'audio' | 'video';
  isIncoming: boolean;
  onEnd: () => void;
}

export default function CallScreen({ callId, remoteUserId, remoteName, callType, isIncoming, onEnd }: CallScreenProps) {
  const [callStatus, setCallStatus] = useState(isIncoming ? 'incoming' : 'calling');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<any>(null);

  const socket = getSocket();

  useEffect(() => {
    if (Platform.OS === 'web') {
      setupWebRTCCall();
    }

    if (!isIncoming && socket) {
      socket.on('call:answer', handleAnswer);
      socket.on('call:ice-candidate', handleRemoteIceCandidate);
      socket.on('call:reject', handleReject);
      socket.on('call:hangup', handleHangup);
    }

    if (isIncoming && socket) {
      socket.on('call:hangup', handleHangup);
    }

    return () => {
      if (socket) {
        socket.off('call:answer');
        socket.off('call:ice-candidate');
        socket.off('call:reject');
        socket.off('call:hangup');
      }
    };
  }, []);

  const setupWebRTCCall = async () => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });
      peerConnectionRef.current = pc;

      // Get local media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Remote stream
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setCallStatus('connected');
          startTimer();
        }
      };

      // ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('call_ice_candidate', {
            to: remoteUserId,
            candidate: event.candidate,
            call_id: callId,
          });
        }
      };

      if (isIncoming) {
        // Answer incoming call (offer received from parent)
      } else {
        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket?.emit('call_offer', {
          to: remoteUserId,
          offer: offer,
          call_type: callType,
          call_id: callId,
        });
      }
    } catch (err) {
      console.error('WebRTC setup failed', err);
      Alert.alert('Fehler', 'Kamera/Mikrofon nicht verfügbar');
      endCall();
    }
  };

  const handleAnswer = async (data: any) => {
    if (data.call_id !== callId || !peerConnectionRef.current) return;
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
    } catch (err) {
      console.error('Failed to set remote description', err);
    }
  };

  const handleRemoteIceCandidate = async (data: any) => {
    if (data.call_id !== callId || !peerConnectionRef.current || !data.candidate) return;
    try {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (err) {
      console.error('Failed to add ICE candidate', err);
    }
  };

  const handleReject = () => {
    setCallStatus('rejected');
    setTimeout(endCall, 1000);
  };

  const handleHangup = () => {
    setCallStatus('ended');
    endCall();
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const endCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (socket) {
      socket.emit('call_hangup', { to: remoteUserId, call_id: callId, reason: 'hangup' });
    }
    onEnd();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = !t.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => {
        t.enabled = !t.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const formatDuration = (sec: number) => {
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return `${min}:${s.toString().padStart(2, '0')}`;
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.notSupported}>Anrufe werden nur im Web unterstützt</Text>
        <TouchableOpacity style={styles.endBtn} onPress={onEnd}>
          <Ionicons name="close" size={24} color={COLORS.white} />
          <Text style={styles.endBtnText}>Schließen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {callType === 'video' && (
        <video
          ref={remoteVideoRef as any}
          autoPlay
          playsInline
          style={styles.remoteVideo}
        />
      )}

      <View style={styles.overlay}>
        <View style={styles.callInfo}>
          <View style={styles.callerAvatar}>
            <Ionicons
              name={callType === 'video' ? 'videocam' : 'call'}
              size={40}
              color={COLORS.white}
            />
          </View>
          <Text style={styles.callerName}>{remoteName}</Text>
          <Text style={styles.callStatus}>
            {callStatus === 'calling' ? 'Ruft an...' :
             callStatus === 'connected' ? formatDuration(duration) :
             callStatus === 'rejected' ? 'Abgelehnt' :
             callStatus === 'ended' ? 'Beendet' :
             'Eingehender Anruf...'}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlBtn} onPress={toggleMute}>
            <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color={COLORS.white} />
            <Text style={styles.controlLabel}>{isMuted ? 'Stumm' : 'Mikro'}</Text>
          </TouchableOpacity>

          {callType === 'video' && (
            <TouchableOpacity style={styles.controlBtn} onPress={toggleVideo}>
              <Ionicons name={isVideoEnabled ? 'videocam' : 'videocam-off'} size={24} color={COLORS.white} />
              <Text style={styles.controlLabel}>{isVideoEnabled ? 'Video' : 'Video aus'}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.controlBtn} onPress={toggleSpeaker}>
            <Ionicons name={isSpeakerOn ? 'volume-high' : 'volume-low'} size={24} color={COLORS.white} />
            <Text style={styles.controlLabel}>{isSpeakerOn ? 'Lautsprecher' : 'Hörer'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.endBtn} onPress={endCall}>
          <Ionicons name="call" size={28} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  notSupported: { fontSize: FONTS.sizes.lg, color: COLORS.textPrimary, fontWeight: FONTS.weights.bold, textAlign: 'center', marginTop: 40 },
  remoteVideo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  callInfo: { alignItems: 'center' },
  callerAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,140,0,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 2, borderColor: COLORS.primary },
  callerName: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.white, marginBottom: 8 },
  callStatus: { fontSize: FONTS.sizes.base, color: 'rgba(255,255,255,0.7)' },
  controls: { flexDirection: 'row', gap: 24, marginBottom: 20 },
  controlBtn: { alignItems: 'center', gap: 4 },
  controlLabel: { fontSize: FONTS.sizes.xs, color: 'rgba(255,255,255,0.7)' },
  endBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  endBtnText: { fontSize: FONTS.sizes.base, color: COLORS.white, fontWeight: FONTS.weights.bold },
});
