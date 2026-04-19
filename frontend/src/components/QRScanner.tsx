import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../utils/theme';
import { contactsAPI } from '../utils/api';

interface QRScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    const code = data.trim().toUpperCase();
    const addCodeMatch = code.match(/FUNK-[A-Z0-9]{6}/);

    if (addCodeMatch) {
      try {
        const res = await contactsAPI.addByCode(addCodeMatch[0]);
        Alert.alert('Erfolg', res.data.message || 'Kontaktanfrage gesendet!');
        onScan(addCodeMatch[0]);
      } catch (e: any) {
        Alert.alert('Fehler', e?.response?.data?.detail || 'Konnte Kontakt nicht hinzufügen');
        setScanned(false);
      }
    } else {
      Alert.alert('Unbekannter QR-Code', 'Dieser QR-Code enthält keinen gültigen SS-Note Add-Code.');
      setScanned(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Kamera-Berechtigung wird angefordert...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-off" size={48} color={COLORS.textMuted} />
        <Text style={styles.permissionText}>Kein Kamera-Zugriff</Text>
        <Text style={styles.permissionSubtext}>Bitte erlaube den Kamera-Zugriff in den Einstellungen</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Schließen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        enableTorch={flashOn}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.topBtn}>
            <Ionicons name="close" size={28} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>QR-Code scannen</Text>
          <TouchableOpacity onPress={() => setFlashOn(!flashOn)} style={styles.topBtn}>
            <Ionicons name={flashOn ? 'flash' : 'flash-off'} size={28} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Scanner frame */}
        <View style={styles.scannerFrame}>
          <View style={styles.scannerCorner}>
            <View style={[styles.cornerLine, styles.cornerTop]} />
            <View style={[styles.cornerLine, styles.cornerLeft]} />
          </View>
          <View style={styles.scannerCorner}>
            <View style={[styles.cornerLine, styles.cornerTop]} />
            <View style={[styles.cornerLine, styles.cornerRight]} />
          </View>
          <Animated.View style={[styles.scanLine, {
            transform: [{
              translateY: scanAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-120, 120],
              }),
            }],
          }]} />
          <View style={styles.scannerCorner}>
            <View style={[styles.cornerLine, styles.cornerBottom]} />
            <View style={[styles.cornerLine, styles.cornerLeft]} />
          </View>
          <View style={styles.scannerCorner}>
            <View style={[styles.cornerLine, styles.cornerBottom]} />
            <View style={[styles.cornerLine, styles.cornerRight]} />
          </View>
        </View>

        <Text style={styles.scanHint}>Halte den QR-Code in den Rahmen</Text>

        {scanned && (
          <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
            <Ionicons name="refresh" size={20} color={COLORS.white} />
            <Text style={styles.rescanText}>Erneut scannen</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  permissionText: { fontSize: FONTS.sizes.lg, color: COLORS.textPrimary, fontWeight: FONTS.weights.bold, marginTop: 16 },
  permissionSubtext: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 24 },
  closeBtn: { marginTop: 24, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  closeBtnText: { fontSize: FONTS.sizes.base, color: COLORS.white, fontWeight: FONTS.weights.bold },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 20, paddingTop: 60 },
  topBtn: { padding: 8 },
  topTitle: { fontSize: FONTS.sizes.lg, color: COLORS.white, fontWeight: FONTS.weights.bold },
  scannerFrame: { width: 250, height: 250, justifyContent: 'center', alignItems: 'center' },
  scannerCorner: { position: 'absolute' },
  cornerLine: { position: 'absolute', backgroundColor: COLORS.primaryLight },
  cornerTop: { width: 40, height: 3, top: 0 },
  cornerBottom: { width: 40, height: 3, bottom: 0 },
  cornerLeft: { width: 3, height: 40, left: 0 },
  cornerRight: { width: 3, height: 40, right: 0 },
  scanLine: { position: 'absolute', width: 240, height: 2, backgroundColor: COLORS.primaryLight, borderRadius: 1 },
  scanHint: { fontSize: FONTS.sizes.base, color: COLORS.white, marginTop: 32, textAlign: 'center', opacity: 0.8 },
  rescanBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  rescanText: { fontSize: FONTS.sizes.base, color: COLORS.white, fontWeight: FONTS.weights.medium },
});
