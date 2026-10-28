import { Platform } from 'react-native';

export const Colors = {
  light: {
    paper: '#F6F1E7',
    paperAlt: '#EFE8DA',
    card: '#FFFDF8',
    swipeCard: '#ECE7DE',
    ink: '#1C1A17',
    muted: '#756E62',
    faint: '#A49B8C',
    line: '#E7DFD1',
    lineStrong: '#D3C9B7',
    accent: '#EF5B2A',
    accentSoft: '#FBE3D7',
    sage: '#6F826B',
    sageSoft: '#E7EEE3',
    overlay: 'rgba(28, 26, 23, 0.42)',
    shadow: '#1C1A17',
    tabTrack: 'rgba(28, 26, 23, 0.045)',
    white: '#FFFFFF',
  },
  dark: {
    paper: '#151412',
    paperAlt: '#0F0E0D',
    card: '#1E1C19',
    swipeCard: '#2A2724',
    ink: '#F2ECE1',
    muted: '#A79F92',
    faint: '#716A5F',
    line: '#2C2924',
    lineStrong: '#3A362F',
    accent: '#FF6B3D',
    accentSoft: '#3A2218',
    sage: '#9BB095',
    sageSoft: '#202A1E',
    overlay: 'rgba(0, 0, 0, 0.62)',
    shadow: '#000000',
    tabTrack: 'rgba(242, 236, 225, 0.06)',
    white: '#FFFFFF',
  },
} as const;

export type ThemeColors = (typeof Colors)[keyof typeof Colors];
export type ThemeMode = 'system' | 'light' | 'dark';

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
} as const;

export const Radii = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  '2xl': 32,
  full: 999,
} as const;

export const Fonts = {
  display: Platform.select({
    ios: 'Songti SC',
    android: 'serif',
    default: 'Georgia',
  }),
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
} as const;
