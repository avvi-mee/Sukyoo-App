// Single source of truth for the senior app's accessibility posture.
// Every shared component in src/components reads from here — bump a value
// once and every one of the 24 mockup screens picks it up.

export const colors = {
  bg: '#FAF5EE',
  surface: '#FFFFFF',
  ink: '#1A1A1A',
  inkMuted: '#5A5550',
  border: '#E7DFD3',
  coral: '#D9622B', // HealthHub accent
  coralTint: '#FBE7DA',
  green: '#3E8E5B', // Ecommerce accent
  greenTint: '#E3F1E8',
  amber: '#C98A1D', // Events/Tour accent
  amberTint: '#F8ECD6',
  red: '#C0392B', // Entertainment accent + danger/SOS
  redTint: '#F8DEDA',
  statusNormal: '#3E8E5B',
  statusLow: '#C98A1D',
  statusHigh: '#C0392B',
} as const;

export const spacing = {
  xs: 6,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  card: 20,
  button: 16,
  chip: 999,
} as const;

// Minimum touch target per Android/iOS accessibility guidance, generous for
// senior users specifically.
export const minTouchTarget = 60;

// Base sizes before the user's in-app font-scale multiplier is applied.
export const fontSize = {
  body: 18,
  label: 15,
  title: 24,
  headline: 30,
} as const;

export const fontScaleSteps = {
  default: 1,
  large: 1.15,
  extraLarge: 1.3,
} as const;

export type FontScaleKey = keyof typeof fontScaleSteps;
