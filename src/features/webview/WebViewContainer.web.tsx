import { useState, type CSSProperties } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/**
 * Web branch of the WebView container. `react-native-webview` has no web implementation,
 * so the browser build renders the page in an iframe instead.
 */
export function WebViewContainer({ url }: { url: string }) {
  const { colors } = useTheme();
  const [loaded, setLoaded] = useState(false);

  return (
    <View style={[styles.root, { backgroundColor: colors.paper }]}>
      <iframe
        key={url}
        src={url}
        title="WebView"
        onLoad={() => setLoaded(true)}
        style={frameStyle}
      />
      {loaded ? null : (
        <View style={[styles.loading, { backgroundColor: colors.paper }]}>
          <ActivityIndicator color={colors.muted} />
        </View>
      )}
    </View>
  );
}

const frameStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  border: 'none',
  backgroundColor: '#FFFFFF',
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
