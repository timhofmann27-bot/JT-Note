import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { contactsAPI, chatsAPI } from '../../src/utils/api';
import { COLORS, FONTS, SPACING, ROLES } from '../../src/utils/theme';

type TabType = 'contacts' | 'requests' | 'addcode';

export default function ContactsScreen() {
  const [tab, setTab] = useState<TabType>('contacts');
  const [contacts, setContacts] = useState<any[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [codeMsg, setCodeMsg] = useState('');
  const [codeSending, setCodeSending] = useState(false);
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const [cRes, rRes] = await Promise.all([contactsAPI.list(), contactsAPI.requests()]);
      setContacts(cRes.data.contacts || []);
      setIncoming(rRes.data.incoming || []);
      setOutgoing(rRes.data.outgoing || []);
    } catch (e) { console.log('Load error', e); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleStartChat = async (contactId: string) => {
    try {
      const res = await chatsAPI.create({ participant_ids: [contactId], is_group: false });
      router.push({ pathname: '/chat/[id]', params: { id: res.data.chat.id } });
    } catch (e) { console.log(e); }
  };

  const handleSendCode = async () => {
    if (!code.trim()) return;
    setCodeSending(true); setCodeMsg('');
    try {
      await contactsAPI.addByCode(code.trim());
      setCodeMsg('Anfrage gesendet!');
      setCode('');
      loadData();
    } catch (e: any) {
      setCodeMsg(e?.response?.data?.detail || 'Fehler beim Senden');
    } finally { setCodeSending(false); }
  };

  const handleAccept = async (id: string) => {
    try { await contactsAPI.acceptRequest(id); loadData(); }
    catch (e) { console.log(e); }
  };

  const handleReject = async (id: string) => {
    try { await contactsAPI.rejectRequest(id); loadData(); }
    catch (e) { console.log(e); }
  };

  const filtered = contacts.filter((c: any) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.callsign?.toLowerCase().includes(search.toLowerCase()) ||
    c.username?.toLowerCase().includes(search.toLowerCase())
  );

  const renderContact = ({ item }: { item: any }) => {
    const roleInfo = ROLES[item.role as keyof typeof ROLES] || ROLES.soldier;
    return (
      <TouchableOpacity testID={`contact-${item.id}`} style={styles.contactItem} onPress={() => handleStartChat(item.id)} activeOpacity={0.7}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={20} color={COLORS.textSecondary} />
          </View>
          <View style={[styles.statusDot, { backgroundColor: item.status === 'online' ? COLORS.online : COLORS.offline }]} />
        </View>
        <View style={styles.contactInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.contactName}>{item.name}</Text>
            <Ionicons name="shield-checkmark" size={12} color={COLORS.success} />
          </View>
          <Text style={styles.callsign}>@{item.username} · {item.callsign}</Text>
          <View style={styles.roleRow}>
            <Ionicons name={roleInfo.icon as any} size={10} color={roleInfo.color} />
            <Text style={[styles.roleText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
          </View>
        </View>
        <TouchableOpacity testID={`chat-with-${item.id}`} style={styles.chatBtn} onPress={() => handleStartChat(item.id)}>
          <Ionicons name="chatbubble" size={18} color={COLORS.primaryLight} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderRequest = ({ item, type }: { item: any; type: 'in' | 'out' }) => (
    <View style={styles.requestItem}>
      <View style={styles.avatar}>
        <Ionicons name="person-outline" size={20} color={COLORS.textMuted} />
      </View>
      <View style={[styles.contactInfo, { marginLeft: 14 }]}>
        <Text style={styles.contactName}>{item.requester_name || item.requester_username}</Text>
        <Text style={styles.callsign}>@{item.requester_username} · {item.requester_callsign}</Text>
        <Text style={styles.requestTime}>{type === 'in' ? 'Möchte dich hinzufügen' : 'Warte auf Bestätigung'}</Text>
      </View>
      {type === 'in' ? (
        <View style={styles.requestActions}>
          <TouchableOpacity testID={`accept-${item.id}`} style={styles.acceptBtn} onPress={() => handleAccept(item.id)}>
            <Ionicons name="checkmark" size={18} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity testID={`reject-${item.id}`} style={styles.rejectBtn} onPress={() => handleReject(item.id)}>
            <Ionicons name="close" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      ) : (
        <Ionicons name="time-outline" size={20} color={COLORS.textMuted} />
      )}
    </View>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primaryLight} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* 3 Tabs */}
      <View style={styles.tabRow}>
        {([
          { key: 'contacts' as TabType, label: 'KONTAKTE', count: contacts.length, icon: 'people' },
          { key: 'requests' as TabType, label: 'ANFRAGEN', count: incoming.length, icon: 'notifications' },
          { key: 'addcode' as TabType, label: 'CODE', count: null, icon: 'key' },
        ] as const).map(t => (
          <TouchableOpacity key={t.key} testID={`tab-${t.key}`} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Ionicons name={t.icon as any} size={14} color={tab === t.key ? COLORS.primaryLight : COLORS.textMuted} />
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            {t.count !== null && t.count > 0 && (
              <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{t.count}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* TAB 1: Contacts */}
      {tab === 'contacts' && (
        <>
          {contacts.length > 0 && (
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} />
              <TextInput testID="contact-search" style={styles.searchInput} value={search} onChangeText={setSearch}
                placeholder="Kontakte durchsuchen..." placeholderTextColor={COLORS.textMuted} />
            </View>
          )}
          {filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Noch keine Kontakte</Text>
              <Text style={styles.emptySubtitle}>Füge jemanden über seinen Add-Code hinzu.</Text>
              <TouchableOpacity testID="go-to-code-tab" style={styles.emptyBtn} onPress={() => setTab('addcode')}>
                <Ionicons name="key" size={16} color={COLORS.primaryLight} />
                <Text style={styles.emptyBtnText}>Code eingeben</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList data={filtered} renderItem={renderContact} keyExtractor={item => item.id}
              ItemSeparatorComponent={() => <View style={styles.separator} />} />
          )}
        </>
      )}

      {/* TAB 2: Requests */}
      {tab === 'requests' && (
        <>
          {incoming.length === 0 && outgoing.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Keine offenen Anfragen</Text>
              <Text style={styles.emptySubtitle}>Wenn jemand deinen Code verwendet, erscheint hier eine Anfrage.</Text>
            </View>
          ) : (
            <FlatList
              data={[...incoming.map(r => ({ ...r, _type: 'in' })), ...outgoing.map(r => ({ ...r, _type: 'out' }))]}
              renderItem={({ item }) => renderRequest({ item, type: item._type as 'in' | 'out' })}
              keyExtractor={item => item.id}
              ListHeaderComponent={incoming.length > 0 ? <Text style={styles.sectionHeader}>EINGEHEND ({incoming.length})</Text> : null}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </>
      )}

      {/* TAB 3: Enter Code */}
      {tab === 'addcode' && (
        <View style={styles.codeContainer}>
          <View style={styles.codeIcon}>
            <Ionicons name="key" size={40} color={COLORS.primaryLight} />
          </View>
          <Text style={styles.codeTitle}>Add-Code eingeben</Text>
          <Text style={styles.codeSubtitle}>Gib den persönlichen Add-Code eines anderen Nutzers ein, um eine Kontaktanfrage zu senden.</Text>
          <View style={styles.codeInputRow}>
            <TextInput testID="add-code-input" style={styles.codeInput} value={code} onChangeText={setCode}
              placeholder="z.B. FUNK-7X4P9Q" placeholderTextColor={COLORS.textMuted}
              autoCapitalize="characters" autoCorrect={false} maxLength={12} />
            <TouchableOpacity testID="submit-code-btn" style={[styles.codeSubmitBtn, (!code.trim() || codeSending) && { opacity: 0.4 }]}
              onPress={handleSendCode} disabled={!code.trim() || codeSending}>
              {codeSending ? <ActivityIndicator size="small" color={COLORS.white} /> : <Ionicons name="send" size={18} color={COLORS.white} />}
            </TouchableOpacity>
          </View>
          {codeMsg ? (
            <View style={[styles.codeMsgBox, codeMsg.includes('gesendet') ? styles.codeMsgSuccess : styles.codeMsgError]}>
              <Ionicons name={codeMsg.includes('gesendet') ? 'checkmark-circle' : 'alert-circle'} size={16}
                color={codeMsg.includes('gesendet') ? COLORS.success : COLORS.danger} />
              <Text style={[styles.codeMsgText, { color: codeMsg.includes('gesendet') ? COLORS.success : COLORS.danger }]}>{codeMsg}</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  tabRow: { flexDirection: 'row', marginHorizontal: 12, marginTop: 8, marginBottom: 4, gap: 6 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.surface },
  tabActive: { backgroundColor: COLORS.primaryDark, borderWidth: 1, borderColor: COLORS.primary },
  tabText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.5 },
  tabTextActive: { color: COLORS.primaryLight },
  tabBadge: { backgroundColor: COLORS.primaryLight, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { fontSize: 9, fontWeight: '700', color: COLORS.white },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, marginHorizontal: 12, marginTop: 8, marginBottom: 4, borderRadius: 12, paddingHorizontal: 14, height: 42, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.sizes.md, marginLeft: 10 },
  contactItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  avatarContainer: { position: 'relative', marginRight: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  statusDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: COLORS.background },
  contactInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactName: { fontSize: FONTS.sizes.base, fontWeight: '600', color: COLORS.textPrimary },
  callsign: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontWeight: '500', letterSpacing: 0.5, marginTop: 1 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  roleText: { fontSize: FONTS.sizes.xs, fontWeight: '500' },
  chatBtn: { padding: 10, borderRadius: 20, backgroundColor: COLORS.surfaceLight },
  requestItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  requestTime: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, fontStyle: 'italic' },
  requestActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.danger },
  sectionHeader: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 2, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  separator: { height: 1, backgroundColor: COLORS.divider, marginLeft: 74 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16 },
  emptySubtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 4, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryDark, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 16, borderWidth: 1, borderColor: COLORS.primary },
  emptyBtnText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.primaryLight },
  codeContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  codeIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.primary, marginBottom: 20 },
  codeTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.textPrimary },
  codeSubtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20, maxWidth: 300 },
  codeInputRow: { flexDirection: 'row', marginTop: 24, gap: 8, width: '100%', maxWidth: 320 },
  codeInput: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, height: 50, color: COLORS.textPrimary, fontSize: FONTS.sizes.lg, fontWeight: '700', letterSpacing: 2, textAlign: 'center' },
  codeSubmitBtn: { width: 50, height: 50, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  codeMsgBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  codeMsgSuccess: { backgroundColor: 'rgba(74,222,128,0.1)' },
  codeMsgError: { backgroundColor: 'rgba(196,75,75,0.1)' },
  codeMsgText: { fontSize: FONTS.sizes.sm, fontWeight: '500' },
});
