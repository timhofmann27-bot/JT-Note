import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal, ScrollView, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { messagesAPI, chatsAPI, typingAPI, contactsAPI } from '../../src/utils/api';
import { COLORS, FONTS, SPACING, SECURITY_LEVELS } from '../../src/utils/theme';

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [chat, setChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const [securityLevel, setSecurityLevel] = useState('UNCLASSIFIED');
  const [showSecMenu, setShowSecMenu] = useState(false);
  const [selfDestruct, setSelfDestruct] = useState<number | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const typingTimer = useRef<any>(null);
  const lastMsgId = useRef<string | null>(null);

  const loadChat = useCallback(async () => {
    if (!id) return;
    try {
      const [chatRes, msgsRes] = await Promise.all([
        chatsAPI.get(id), messagesAPI.list(id, 50),
      ]);
      setChat(chatRes.data.chat);
      setMessages(msgsRes.data.messages || []);
      if (msgsRes.data.messages?.length > 0) {
        lastMsgId.current = msgsRes.data.messages[msgsRes.data.messages.length - 1].id;
        const unread = msgsRes.data.messages
          .filter((m: any) => m.sender_id !== user?.id && !m.read_by?.includes(user?.id))
          .map((m: any) => m.id);
        if (unread.length > 0) messagesAPI.markRead(unread);
      }
      if (chatRes.data.chat?.is_group) {
        setGroupMembers(chatRes.data.chat.participants || []);
      }
    } catch (e) {
      console.log('Error loading chat', e);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => { loadChat(); }, [loadChat]);

  useEffect(() => {
    if (!id) return;
    const interval = setInterval(async () => {
      try {
        const res = await messagesAPI.poll(id, lastMsgId.current || undefined);
        if (res.data.messages?.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMsgs = res.data.messages.filter((m: any) => !existingIds.has(m.id));
            if (newMsgs.length === 0) return prev;
            return [...prev, ...newMsgs];
          });
          const lastNew = res.data.messages[res.data.messages.length - 1];
          lastMsgId.current = lastNew.id;
          const unread = res.data.messages
            .filter((m: any) => m.sender_id !== user?.id)
            .map((m: any) => m.id);
          if (unread.length > 0) messagesAPI.markRead(unread);
        }
        const typRes = await typingAPI.get(id);
        setTypingUsers(typRes.data.typing || []);
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [id, user]);

  const handleSend = async () => {
    if (!text.trim() || !id) return;
    setSending(true);
    try {
      const res = await messagesAPI.send({
        chat_id: id,
        content: text.trim(),
        security_level: securityLevel,
        self_destruct_seconds: selfDestruct,
      });
      setMessages(prev => [...prev, res.data.message]);
      lastMsgId.current = res.data.message.id;
      setText('');
      setSelfDestruct(null);
    } catch (e) {
      console.log('Error sending message', e);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (!id) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingAPI.set(id).catch(() => {});
    typingTimer.current = setTimeout(() => {}, 3000);
  };

  const getOtherParticipant = () => {
    if (!chat?.participants) return null;
    return chat.participants.find((p: any) => p.id !== user?.id) || chat.participants[0];
  };

  const getChatTitle = () => {
    if (chat?.is_group) return chat.name || 'Gruppe';
    return getOtherParticipant()?.name || 'Chat';
  };

  const getChatSubtitle = () => {
    if (chat?.is_group) return `${chat.participants?.length || 0} Teilnehmer`;
    const other = getOtherParticipant();
    return other?.status === 'online' ? 'Online' : 'Offline';
  };

  const getSecColor = (level: string) => {
    const found = SECURITY_LEVELS.find(s => s.key === level);
    return found?.color || COLORS.unclassified;
  };

  const getStatusIcon = (msg: any) => {
    if (msg.sender_id !== user?.id) return null;
    const participantCount = (chat?.participants?.length || 2) - 1;
    const readCount = (msg.read_by?.length || 0) - 1;
    const deliveredCount = (msg.delivered_to?.length || 0);
    if (readCount >= participantCount) return { name: 'checkmark-done', color: COLORS.primaryLight };
    if (deliveredCount >= participantCount) return { name: 'checkmark-done', color: COLORS.textMuted };
    return { name: 'checkmark', color: COLORS.textMuted };
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const getSenderName = (msg: any) => {
    if (!chat?.is_group || msg.sender_id === user?.id) return '';
    const sender = chat.participants?.find((p: any) => p.id === msg.sender_id);
    return sender?.name || msg.sender_name || 'Unbekannt';
  };

  const getSenderColor = (senderId: string) => {
    const colors = [COLORS.primary, '#4A90D9', '#7B68EE', '#20B2AA', '#FF6B6B', '#FFD93D', '#6BCB77'];
    let hash = 0;
    for (let i = 0; i < senderId.length; i++) hash = senderId.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitial = (name: string) => name?.charAt(0).toUpperCase() || '?';

  const getAvatarColor = (id: string) => {
    const colors = [COLORS.primary, '#4A90D9', '#7B68EE', '#20B2AA', '#FF6B6B', '#FFD93D', '#6BCB77'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const loadContacts = async () => {
    try {
      const res = await contactsAPI.list();
      setContacts(res.data.contacts || []);
    } catch (e) { console.log(e); }
  };

  const addMember = async (contactId: string) => {
    Alert.alert(
      'Teilnehmer hinzufügen',
      'Möchtest du diesen Kontakt zur Gruppe hinzufügen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Hinzufügen',
          onPress: async () => {
            try {
              await chatsAPI.create({
                participant_ids: [contactId],
                is_group: false,
              });
              Alert.alert('Erfolg', 'Kontakt wurde eingeladen');
              setShowGroupInfo(false);
            } catch (e: any) {
              Alert.alert('Fehler', e?.response?.data?.detail || 'Konnte nicht hinzufügen');
            }
          },
        },
      ]
    );
  };

  const renderMessage = ({ item, index }: { item: any; index: number }) => {
    const isMine = item.sender_id === user?.id;
    const statusIcon = getStatusIcon(item);
    const isEmergency = item.is_emergency;
    const showSenderName = chat?.is_group && !isMine;
    const senderName = getSenderName(item);
    const senderColor = getSenderColor(item.sender_id);

    const showDate = index === 0 || (
      new Date(item.created_at).toDateString() !== new Date(messages[index - 1]?.created_at).toDateString()
    );

    const showNameSeparator = chat?.is_group && !isMine && index > 0 &&
      messages[index - 1]?.sender_id !== item.sender_id &&
      new Date(item.created_at).toDateString() === new Date(messages[index - 1]?.created_at).toDateString();

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateLine} />
            <Text style={styles.dateText}>
              {new Date(item.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
            </Text>
            <View style={styles.dateLine} />
          </View>
        )}
        {showNameSeparator && (
          <View style={styles.nameSeparator}>
            <Text style={[styles.nameSeparatorText, { color: senderColor }]}>{senderName}</Text>
          </View>
        )}
        <View style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}>
          {!isMine && chat?.is_group && (
            <View style={[styles.msgAvatar, { backgroundColor: `${senderColor}33` }]}>
              <Text style={[styles.msgAvatarText, { color: senderColor }]}>{getInitial(senderName)}</Text>
            </View>
          )}
          <View style={[
            styles.msgBubble,
            isMine ? styles.sentBubble : styles.receivedBubble,
            isEmergency && styles.emergencyBubble,
          ]}>
            {isEmergency && (
              <View style={styles.emergencyBanner}>
                <Ionicons name="alert-circle" size={12} color={COLORS.danger} />
                <Text style={styles.emergencyText}>NOTFALL</Text>
              </View>
            )}
            {showSenderName && !showNameSeparator && (
              <Text style={[styles.senderName, { color: senderColor }]}>{senderName}</Text>
            )}
            {item.security_level !== 'UNCLASSIFIED' && (
              <View style={[styles.msgSecBadge, { borderColor: getSecColor(item.security_level) }]}>
                <Text style={[styles.msgSecText, { color: getSecColor(item.security_level) }]}>{item.security_level}</Text>
              </View>
            )}
            <Text style={styles.msgContent}>{item.content}</Text>
            <View style={styles.msgFooter}>
              {item.encrypted && <Ionicons name="lock-closed" size={9} color={COLORS.textMuted} />}
              {item.self_destruct_seconds && (
                <View style={styles.destructBadge}>
                  <Ionicons name="timer" size={9} color={COLORS.restricted} />
                  <Text style={styles.destructText}>{item.self_destruct_seconds}s</Text>
                </View>
              )}
              <Text style={styles.msgTime}>{formatTime(item.created_at)}</Text>
              {statusIcon && <Ionicons name={statusIcon.name as any} size={14} color={statusIcon.color} />}
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primaryLight} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity testID="chat-back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerInfo} onPress={() => { if (chat?.is_group) { setShowGroupInfo(true); loadContacts(); } }}>
          <View style={styles.headerTitleRow}>
            <View style={[styles.headerAvatar, { backgroundColor: chat?.is_group ? `${getAvatarColor(id || '')}33` : COLORS.surfaceLight }]}>
              <Ionicons name={chat?.is_group ? 'people' : 'person'} size={16} color={chat?.is_group ? getAvatarColor(id || '') : COLORS.textSecondary} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle} numberOfLines={1}>{getChatTitle()}</Text>
              <Text style={styles.headerSubtitle}>{getChatSubtitle()}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <View style={[styles.secIndicator, { backgroundColor: `${getSecColor(chat?.security_level || 'UNCLASSIFIED')}22`, borderColor: getSecColor(chat?.security_level || 'UNCLASSIFIED') }]}>
          <Ionicons name="shield-checkmark" size={12} color={getSecColor(chat?.security_level || 'UNCLASSIFIED')} />
          <Text style={[styles.secIndicatorText, { color: getSecColor(chat?.security_level || 'UNCLASSIFIED') }]}>E2E</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex} keyboardVerticalOffset={0}>
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="lock-closed" size={32} color={COLORS.primaryLight} />
              </View>
              <Text style={styles.emptyText}>Verschlüsselter Kanal bereit</Text>
              <Text style={styles.emptySubtext}>Nachrichten sind Ende-zu-Ende verschlüsselt</Text>
            </View>
          }
        />

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <View style={styles.typingBar}>
            <View style={styles.typingDots}>
              <View style={[styles.typingDot, styles.typingDot1]} />
              <View style={[styles.typingDot, styles.typingDot2]} />
              <View style={[styles.typingDot, styles.typingDot3]} />
            </View>
            <Text style={styles.typingText}>{typingUsers.map(t => t.name).join(', ')} tippt...</Text>
          </View>
        )}

        {/* Security level selector */}
        {showSecMenu && (
          <View style={styles.secMenu}>
            {SECURITY_LEVELS.map(level => (
              <TouchableOpacity
                key={level.key}
                testID={`sec-level-${level.key}`}
                style={[styles.secMenuItem, securityLevel === level.key && { backgroundColor: `${level.color}22` }]}
                onPress={() => { setSecurityLevel(level.key); setShowSecMenu(false); }}
              >
                <View style={[styles.secDot, { backgroundColor: level.color }]} />
                <Text style={[styles.secMenuText, { color: level.color }]}>{level.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              testID="self-destruct-toggle"
              style={[styles.secMenuItem, selfDestruct && { backgroundColor: `${COLORS.restricted}22` }]}
              onPress={() => setSelfDestruct(selfDestruct ? null : 30)}
            >
              <Ionicons name="timer" size={14} color={COLORS.restricted} />
              <Text style={[styles.secMenuText, { color: COLORS.restricted }]}>
                {selfDestruct ? `Selbstzerstörung: ${selfDestruct}s` : 'Selbstzerstörung'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputBar}>
          <TouchableOpacity testID="security-menu-btn" onPress={() => setShowSecMenu(!showSecMenu)} style={styles.secBtn}>
            <Ionicons name="shield" size={20} color={getSecColor(securityLevel)} />
          </TouchableOpacity>
          <View style={styles.inputContainer}>
            <TextInput
              testID="message-input"
              style={styles.input}
              value={text}
              onChangeText={(t) => { setText(t); handleTyping(); }}
              placeholder="Nachricht schreiben..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={4000}
            />
          </View>
          <TouchableOpacity
            testID="send-message-btn"
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="send" size={18} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Group Info Modal */}
      <Modal visible={showGroupInfo} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay} edges={['top', 'bottom']}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gruppeninfo</Text>
              <TouchableOpacity onPress={() => setShowGroupInfo(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalGroupInfo}>
              <View style={[styles.modalAvatar, { backgroundColor: `${getAvatarColor(id || '')}33` }]}>
                <Ionicons name="people" size={32} color={getAvatarColor(id || '')} />
              </View>
              <Text style={styles.modalGroupName}>{chat?.name || 'Gruppe'}</Text>
              <Text style={styles.modalGroupCount}>{groupMembers.length} Teilnehmer</Text>
            </View>

            <Text style={styles.modalSectionTitle}>TEILNEHMER</Text>
            <ScrollView style={styles.modalMembersList}>
              {groupMembers.map((member: any) => (
                <View key={member.id} style={styles.modalMember}>
                  <View style={[styles.modalMemberAvatar, { backgroundColor: `${getAvatarColor(member.id)}33` }]}>
                    <Text style={[styles.modalMemberAvatarText, { color: getAvatarColor(member.id) }]}>{getInitial(member.name)}</Text>
                  </View>
                  <View style={styles.modalMemberInfo}>
                    <Text style={styles.modalMemberName}>{member.name}</Text>
                    <Text style={styles.modalMemberCallsign}>{member.callsign}</Text>
                  </View>
                  {member.id === user?.id && (
                    <Text style={styles.modalMemberBadge}>Du</Text>
                  )}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalAddMember}
              onPress={() => {
                if (contacts.length === 0) loadContacts();
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primaryLight} />
              <Text style={styles.modalAddMemberText}>Teilnehmer einladen</Text>
            </TouchableOpacity>

            {contacts.length > 0 && (
              <ScrollView style={styles.modalContactsList}>
                <Text style={styles.modalSectionTitle}>KONTAKTE ZUM EINLADEN</Text>
                {contacts
                  .filter((c: any) => !groupMembers.find((m: any) => m.id === c.id))
                  .map((contact: any) => (
                    <TouchableOpacity
                      key={contact.id}
                      style={styles.modalContactItem}
                      onPress={() => addMember(contact.id)}
                    >
                      <View style={[styles.modalContactAvatar, { backgroundColor: `${getAvatarColor(contact.id)}33` }]}>
                        <Text style={[styles.modalContactAvatarText, { color: getAvatarColor(contact.id) }]}>{getInitial(contact.name)}</Text>
                      </View>
                      <View style={styles.modalContactInfo}>
                        <Text style={styles.modalContactName}>{contact.name}</Text>
                        <Text style={styles.modalContactCallsign}>{contact.callsign}</Text>
                      </View>
                      <Ionicons name="add" size={20} color={COLORS.primaryLight} />
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 8 },
  headerInfo: { flex: 1, marginLeft: 4 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: FONTS.sizes.base, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary },
  headerSubtitle: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 1 },
  secIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, marginRight: 8 },
  secIndicatorText: { fontSize: 10, fontWeight: FONTS.weights.bold, letterSpacing: 1 },

  // Messages
  messagesList: { padding: 12, paddingBottom: 4 },
  msgRow: { flexDirection: 'row', marginBottom: 4, maxWidth: '85%', alignItems: 'flex-end' },
  msgRowRight: { alignSelf: 'flex-end' },
  msgRowLeft: { alignSelf: 'flex-start' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 4 },
  msgAvatarText: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold },
  msgBubble: { borderRadius: 18, padding: 10, paddingBottom: 6, minWidth: 60 },
  sentBubble: { backgroundColor: COLORS.sentBubble, borderBottomRightRadius: 4 },
  receivedBubble: { backgroundColor: COLORS.receivedBubble, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  emergencyBubble: { backgroundColor: COLORS.emergency, borderColor: COLORS.danger, borderWidth: 1 },
  emergencyBanner: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  emergencyText: { fontSize: 10, fontWeight: FONTS.weights.bold, color: COLORS.danger, letterSpacing: 1 },
  senderName: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, marginBottom: 2 },
  msgSecBadge: { alignSelf: 'flex-start', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, borderWidth: 1, marginBottom: 4 },
  msgSecText: { fontSize: 8, fontWeight: FONTS.weights.bold, letterSpacing: 0.5 },
  msgContent: { fontSize: FONTS.sizes.md, color: COLORS.textPrimary, lineHeight: 20 },
  msgFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  msgTime: { fontSize: 10, color: COLORS.textMuted },
  destructBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  destructText: { fontSize: 9, color: COLORS.restricted },

  // Date separator
  dateSeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 8 },
  dateLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dateText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, paddingHorizontal: 12 },
  nameSeparator: { marginLeft: 40, marginBottom: 4 },
  nameSeparatorText: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold },

  // Empty
  emptyMessages: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.primary },
  emptyText: { fontSize: FONTS.sizes.base, fontWeight: FONTS.weights.semibold, color: COLORS.textPrimary, marginTop: 12 },
  emptySubtext: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 4 },

  // Typing
  typingBar: { paddingHorizontal: 16, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingDots: { flexDirection: 'row', gap: 3 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textMuted },
  typingDot1: { opacity: 0.4 },
  typingDot2: { opacity: 0.7 },
  typingDot3: { opacity: 1 },
  typingText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontStyle: 'italic' },

  // Security menu
  secMenu: {
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6,
  },
  secMenuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
  },
  secDot: { width: 8, height: 8, borderRadius: 4 },
  secMenuText: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, letterSpacing: 0.5 },

  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingVertical: 8,
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  secBtn: { padding: 10 },
  inputContainer: {
    flex: 1, backgroundColor: COLORS.surfaceLight, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16,
    maxHeight: 100, minHeight: 40, justifyContent: 'center',
  },
  input: { color: COLORS.textPrimary, fontSize: FONTS.sizes.md, paddingVertical: 8 },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginLeft: 6,
  },
  sendBtnDisabled: { opacity: 0.4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary },
  modalGroupInfo: { alignItems: 'center', padding: 24 },
  modalAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  modalGroupName: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary },
  modalGroupCount: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 4 },
  modalSectionTitle: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, color: COLORS.textMuted, letterSpacing: 2, paddingHorizontal: 16, paddingVertical: 12 },
  modalMembersList: { maxHeight: 200 },
  modalMember: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  modalMemberAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  modalMemberAvatarText: { fontSize: FONTS.sizes.base, fontWeight: FONTS.weights.bold },
  modalMemberInfo: { flex: 1 },
  modalMemberName: { fontSize: FONTS.sizes.base, fontWeight: FONTS.weights.semibold, color: COLORS.textPrimary },
  modalMemberCallsign: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  modalMemberBadge: { fontSize: FONTS.sizes.xs, color: COLORS.primaryLight, fontWeight: FONTS.weights.medium },
  modalAddMember: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  modalAddMemberText: { fontSize: FONTS.sizes.base, color: COLORS.primaryLight, fontWeight: FONTS.weights.semibold },
  modalContactsList: { maxHeight: 200 },
  modalContactItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  modalContactAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  modalContactAvatarText: { fontSize: FONTS.sizes.base, fontWeight: FONTS.weights.bold },
  modalContactInfo: { flex: 1 },
  modalContactName: { fontSize: FONTS.sizes.base, fontWeight: FONTS.weights.semibold, color: COLORS.textPrimary },
  modalContactCallsign: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
});
