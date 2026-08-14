// Family app's UI is a normal information-dense dashboard, not
// accessibility-scaled like the senior app — no font-scale system needed
// here, so this stays a plain color/spacing palette.
export const colors = {
  bg: '#F5F7FA',
  surface: '#FFFFFF',
  ink: '#161B22',
  inkMuted: '#5B6572',
  border: '#E1E6EC',
  primary: '#2B6CD9',
  primaryTint: '#E4EDFB',
  danger: '#C0392B',
  dangerTint: '#F8DEDA',
  success: '#3E8E5B',
} as const;

export const spacing = { xs: 6, sm: 12, md: 16, lg: 24, xl: 32 } as const;
export const radii = { card: 14, button: 10, chip: 999 } as const;
