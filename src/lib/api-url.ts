import Constants from 'expo-constants';
import { Platform } from 'react-native';

function devHost(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const withoutScheme = hostUri.replace(/^[a-z]+:\/\//i, '');
    const host = withoutScheme.split('/')[0]?.split(':')[0];
    if (host) return host;
  }
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
}

/**
 * Override for a physical device / production:
 * EXPO_PUBLIC_API_URL=https://api.example.com
 *
 * The default reaches the FastAPI server running on the same machine as the
 * Expo dev server. Android emulators use 10.0.2.2 automatically.
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? `http://${devHost()}:8000`;
