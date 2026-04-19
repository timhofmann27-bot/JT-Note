import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../utils/theme';

interface BiometricLockProps {
  children: React.ReactNode;
  enabled: boolean;
}

export default function BiometricLock({ children, enabled }: BiometricLockProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(!enabled);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    const authenticate = async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (!hasHardware || !isEnrolled) {
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'SS-Note entsperren',
          fallbackLabel: 'Abbrechen',
          disableDeviceFallback: true,
        });

        if (result.success) {
          setIsAuthenticated(true);
        } else {
          setError(result.error || 'Authentifizierung fehlgeschlagen');
        }
      } catch (e) {
        setError('Biometrie nicht verfügbar');
      } finally {
        setIsLoading(false);
      }
    };

    authenticate();
  }, [enabled]);

  const handleRetry = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'SS-Note entsperren',
        fallbackLabel: 'Abbrechen',
        disableDeviceFallback: true,
      });
      if (result.success) {
        setIsAuthenticated(true);
      } else {
        setError(result.error || 'Authentifizierung fehlgeschlagen');
      }
    } catch (e) {
      setError('Biometrie nicht verfügbar');
    } finally {
      setIsLoading(false);
    }
  };

  if (!enabled || isAuthenticated) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
        <Text style={styles.loadingText}>Entsperren...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.lockIcon}>
        <Ionicons name="lock-closed" size={48} color={COLORS.primaryLight} />
      </View>
      <Text style={styles.title}>SS-Note ist gesperrt</Text>
      <Text style={styles.subtitle}>Entsperre die App mit deiner Biometrie</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
          <Ionicons name="finger-print" size={20} color={COLORS.white} />
          <Text style={styles.retryBtnText}>Erneut versuchen</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  lockIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.primaryDark, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 2, borderColor: COLORS.primary },
  title: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: FONTS.sizes.base, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 },
  error: { fontSize: FONTS.sizes.sm, color: COLORS.danger, marginBottom: 16, textAlign: 'center' },
  loadingText: { fontSize: FONTS.sizes.base, color: COLORS.textSecondary, marginTop: 16 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryBtnText: { fontSize: FONTS.sizes.base, color: COLORS.white, fontWeight: FONTS.weights.bold },
});
