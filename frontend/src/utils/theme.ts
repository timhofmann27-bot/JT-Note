// SS-Note Theme - Dark Orange Variant
export const COLORS = {
  // Core - Dark background tones
  background: '#0A0A0A',
  surface: '#121212',
  surfaceLight: '#1E1E1E',
  surfaceHighlight: '#2A2A2A',
  
  // Accent - Dark Orange tones
  primary: '#FF8C00',      // Dark Orange
  primaryLight: '#FF9F1A',  // Lighter Orange
  primaryDark: '#E67300',   // Darker Orange
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#808080',
  
  // Status
  online: '#4CAF50',
  offline: '#606060',
  away: '#FFC107',
  
  // Security Levels
  unclassified: '#4CAF50',
  restricted: '#FF9800',
  confidential: '#FF5722',
  secret: '#F44336',
  
  // Message
  sentBubble: '#E67300',
  receivedBubble: '#1E1E1E',
  emergency: '#F44336',
  
  // Misc
  border: '#2A2A2A',
  divider: '#1E1E1E',
  inputBg: '#121212',
  danger: '#F44336',
  success: '#4CAF50',
  white: '#FFFFFF',
};

export const FONTS = {
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    hero: 32,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const SECURITY_LEVELS = [
  { key: 'UNCLASSIFIED', label: 'OFFEN', color: COLORS.unclassified },
  { key: 'RESTRICTED', label: 'VS-NfD', color: COLORS.restricted },
  { key: 'CONFIDENTIAL', label: 'VS-VERTRAULICH', color: COLORS.confidential },
  { key: 'SECRET', label: 'GEHEIM', color: COLORS.secret },
];

export const ROLES = {
  commander: { label: 'Kommandant', icon: 'star', color: COLORS.restricted },
  officer: { label: 'Offizier', icon: 'shield', color: COLORS.primaryLight },
  soldier: { label: 'Soldat', icon: 'person', color: COLORS.textSecondary },
};

