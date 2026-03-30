import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { COLORS, FONTS, SPACING } from '../src/utils/theme';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [callsign, setCallsign] = useState('');
  const [passkey, setPasskey] = useState('');
  const [confirmPasskey, setConfirmPasskey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!username.trim() || !name.trim() || !passkey.trim()) {
      setError('Bitte alle Pflichtfelder ausfüllen');
      return;
    }
    if (username.length < 3) {
      setError('Username muss mindestens 3 Zeichen haben');
      return;
    }
    if (passkey !== confirmPasskey) {
      setError('Passkeys stimmen nicht überein');
      return;
    }
    if (passkey.length < 8) {
      setError('Passkey muss mindestens 8 Zeichen haben');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(username.trim(), passkey, name, callsign || undefined);
      router.replace('/(tabs)/chats');
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (typeof detail === 'string') setError(detail);
      else if (Array.isArray(detail)) setError(detail.map((d: any) => d.msg || JSON.stringify(d)).join('. '));
      else setError('Registrierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-add" size={32} color={COLORS.primaryLight} />
            </View>
            <Text style={styles.title}>ANONYME REGISTRIERUNG</Text>
            <Text style={styles.subtitle}>Kein Name · Keine E-Mail · Kein Tracking</Text>
          </View>

          <View style={styles.anonBadge}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
            <Text style={styles.anonText}>Keine personenbezogenen Daten nötig</Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="warning" size={16} color={COLORS.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>BENUTZERNAME *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="at-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput testID="register-username-input" style={styles.input} value={username} onChangeText={setUsername}
                placeholder="Wähle einen Username (z.B. hawk-7)" placeholderTextColor={COLORS.textMuted} autoCapitalize="none" autoCorrect={false} />
            </View>
            <Text style={styles.hint}>3-30 Zeichen, Buchstaben, Zahlen, - _ .</Text>

            <Text style={styles.label}>ANZEIGENAME *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput testID="register-name-input" style={styles.input} value={name} onChangeText={setName}
                placeholder="Kann ein Pseudonym sein" placeholderTextColor={COLORS.textMuted} />
            </View>

            <Text style={styles.label}>RUFZEICHEN</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="flag-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput testID="register-callsign-input" style={styles.input} value={callsign} onChangeText={setCallsign}
                placeholder="z.B. HAWK-7" placeholderTextColor={COLORS.textMuted} autoCapitalize="characters" />
            </View>

            <Text style={styles.label}>PASSKEY *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput testID="register-passkey-input" style={styles.input} value={passkey} onChangeText={setPasskey}
                placeholder="Min. 8 Zeichen (dein geheimer Schlüssel)" placeholderTextColor={COLORS.textMuted} secureTextEntry />
            </View>

            <Text style={styles.label}>PASSKEY BESTÄTIGEN *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="key-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput testID="register-confirm-passkey-input" style={styles.input} value={confirmPasskey} onChangeText={setConfirmPasskey}
                placeholder="Passkey wiederholen" placeholderTextColor={COLORS.textMuted} secureTextEntry />
            </View>

            <TouchableOpacity testID="register-submit-button" style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color={COLORS.white} /> : (
                <>
                  <Ionicons name="shield-checkmark" size={20} color={COLORS.white} />
                  <Text style={styles.registerBtnText}>ANONYM REGISTRIEREN</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity testID="go-to-login" onPress={() => router.back()} style={styles.loginLink}>
            <Text style={styles.loginText}>Bereits registriert? </Text>
            <Text style={styles.loginTextBold}>Anmelden</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: SPACING.xl },
  header: { alignItems: 'center', marginBottom: 8 },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.primaryDark, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.primary, marginBottom: 16,
  },
  title: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary, letterSpacing: 1 },
  subtitle: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 4 },
  anonBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(74,222,128,0.08)', borderRadius: 8, padding: 10, marginVertical: 12,
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.25)',
  },
  anonText: { fontSize: FONTS.sizes.xs, color: COLORS.success, fontWeight: FONTS.weights.medium },
  form: { gap: 2 },
  label: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold, color: COLORS.textSecondary, letterSpacing: 2, marginTop: 10, marginBottom: 4 },
  hint: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, height: 48,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.sizes.md },
  registerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 12, height: 52, marginTop: 20,
  },
  registerBtnText: { fontSize: FONTS.sizes.base, fontWeight: FONTS.weights.bold, color: COLORS.white, letterSpacing: 1 },
  loginLink: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  loginTextBold: { fontSize: FONTS.sizes.md, color: COLORS.primaryLight, fontWeight: FONTS.weights.semibold },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(196,75,75,0.15)', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: COLORS.danger,
  },
  errorText: { color: COLORS.danger, fontSize: FONTS.sizes.sm, flex: 1 },
});
