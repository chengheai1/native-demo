import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { APP_GREETING } from './messages';

type BridgeMessage = {
  type?: 'ready' | 'close' | 'message';
  text?: string;
};

type BridgeEnvelope = {
  source?: string;
  payload?: BridgeMessage;
};

/**
 * Web branch of the WebView container. `react-native-webview` has no web implementation,
 * so the browser build renders the page in an iframe and talks to it with `postMessage`.
 */
export function WebViewContainer({
  url,
  onCloseRequest,
}: {
  url: string;
  onCloseRequest?: () => void;
}) {
  const { colors } = useTheme();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let targetOrigin = '*';
    try {
      targetOrigin = new URL(url).origin;
    } catch {
      // Keep the wildcard fallback; normalizeWebViewUrl already rejects bad URLs.
    }

    const onMessage = (event: MessageEvent) => {
      const iframe = iframeRef.current;
      if (!iframe || event.source !== iframe.contentWindow) return;
      if (event.origin !== targetOrigin) return;

      const data = event.data as BridgeEnvelope | null;
      if (data?.source !== 'xu-webview') return;

      if (data.payload?.type === 'ready') {
        iframe.contentWindow?.postMessage(
          { source: 'xu-app', payload: { type: 'message', text: APP_GREETING } },
          targetOrigin,
        );
        return;
      }

      if (data.payload?.type === 'close') {
        onCloseRequest?.();
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onCloseRequest, url]);

  return (
    <View style={[styles.root, { backgroundColor: colors.paper }]}>
      <iframe
        ref={iframeRef}
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
