import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { RefreshIcon } from '@/components/Icons';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { APP_GREETING } from './messages';

type WebViewBridgeMessage = {
  type?: string;
};

/**
 * Native branch of the WebView container: a real `react-native-webview` (WKWebView / Android WebView).
 * The web branch lives in `WebViewContainer.web.tsx` and falls back to an iframe.
 */
export function WebViewContainer({
  url,
  onCloseRequest,
  onNavigate,
  onProgressChange,
}: {
  url: string;
  onCloseRequest?: () => void;
  onNavigate?: (page: { url: string; title?: string }) => void;
  onProgressChange?: (progress: number) => void;
}) {
  const { colors } = useTheme();
  // v14's `WebView` defaults its generic to `undefined`, which collapses props to
  // `never` once a ref is passed; `object` keeps WebViewProps intact.
  const webRef = useRef<WebView<object>>(null);
  const greetedRef = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function sendToWeb(payload: unknown) {
    webRef.current?.injectJavaScript(
      `window.__XU_WEBVIEW__ && typeof window.__XU_WEBVIEW__.receive === 'function' && window.__XU_WEBVIEW__.receive(${JSON.stringify(payload)}); true;`,
    );
  }

  function greetWeb() {
    if (greetedRef.current) return;
    greetedRef.current = true;
    sendToWeb({ type: 'message', text: APP_GREETING, sentAt: new Date().toISOString() });
  }

  function handleWebMessage(raw: string) {
    let message: WebViewBridgeMessage | null = null;
    try {
      message = JSON.parse(raw) as WebViewBridgeMessage;
    } catch {
      return;
    }
    if (!message) return;
    if (message.type === 'ready') {
      greetWeb();
      return;
    }
    if (message.type === 'close') {
      onCloseRequest?.();
    }
  }

  if (error) {
    return (
      <View style={[styles.error, { backgroundColor: colors.paper }]}>
        <Text style={[styles.errorTitle, { color: colors.ink }]}>网页没有打开</Text>
        <Text style={[styles.errorBody, { color: colors.muted }]}>{error}</Text>
        <Text style={[styles.errorUrl, { color: colors.faint }]} numberOfLines={2}>
          {url}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setError(null);
            setAttempt((value) => value + 1);
          }}
          style={[styles.retry, { backgroundColor: colors.ink }]}>
          <RefreshIcon size={14} color={colors.paper} />
          <Text style={[styles.retryText, { color: colors.paper }]}>重新加载</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <WebView
      ref={webRef}
      key={attempt}
      source={{ uri: url }}
      style={[styles.webview, { backgroundColor: colors.paper }]}
      containerStyle={[styles.webview, { backgroundColor: colors.paper }]}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      allowsBackForwardNavigationGestures
      startInLoadingState
      renderLoading={() => (
        <View style={[styles.loading, { backgroundColor: colors.paper }]}>
          <ActivityIndicator color={colors.muted} />
        </View>
      )}
      onMessage={({ nativeEvent }) => handleWebMessage(nativeEvent.data)}
      onNavigationStateChange={({ url: nextUrl, title: nextTitle }) => {
        if (nextUrl) onNavigate?.({ url: nextUrl, title: nextTitle });
      }}
      onLoadProgress={({ nativeEvent }) => onProgressChange?.(nativeEvent.progress)}
      onError={({ nativeEvent }) => {
        onProgressChange?.(1);
        setError(nativeEvent.description || '加载失败，请检查网络或网址');
      }}
      onHttpError={({ nativeEvent }) => {
        onProgressChange?.(1);
        setError(`服务器返回 HTTP ${nativeEvent.statusCode}`);
      }}
    />
  );
}

const styles = StyleSheet.create({
  webview: {
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
  error: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorTitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '600',
  },
  errorBody: {
    marginTop: Spacing.sm,
    maxWidth: 280,
    textAlign: 'center',
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 18,
  },
  errorUrl: {
    marginTop: Spacing.xs,
    maxWidth: 300,
    textAlign: 'center',
    fontFamily: Fonts.mono,
    fontSize: 9,
  },
  retry: {
    marginTop: Spacing.lg,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.lg,
  },
  retryText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '600',
  },
});
