import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listTodos } from '@/api/todos';
import type { Todo, TodoFilter } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { AppScreen } from '@/components/AppScreen';
import { Avatar } from '@/components/Avatar';
import { BrandMark } from '@/components/BrandMark';
import { ProgressRing } from '@/components/ProgressRing';
import { RefreshIcon, SparkleIcon, TrashIcon } from '@/components/Icons';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToast } from '@/components/Toast';
import { firstName, formatDateLabel, greetingFor, shortTitle } from '@/lib/format';
import { EditSheet } from './EditSheet';
import { EmptyState } from './EmptyState';
import { FilterTabs } from './FilterTabs';
import { TodoComposer } from './TodoComposer';
import { TodoItem } from './TodoItem';
import {
  TODOS_KEY,
  useClearCompleted,
  useCreateTodo,
  useDeleteTodo,
  useEditTodo,
  useToggleTodo,
} from './mutations';
import { ProfileSheet } from '@/features/profile/ProfileSheet';
import { DebugPanel } from '@/features/debug/DebugPanel';
import { WebViewSheet } from '@/features/webview/WebViewSheet';

export function TodoScreen() {
  const { user, signOut } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<TodoFilter>('all');
  const [openTodoId, setOpenTodoId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [webViewOpen, setWebViewOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [today, setToday] = useState(() => new Date());
  const composerRef = useRef<ComponentRef<typeof TextInput>>(null);
  const webViewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webViewPending = useRef(false);

  const todosQuery = useQuery({
    queryKey: TODOS_KEY,
    queryFn: listTodos,
    enabled: Boolean(user),
  });

  const createTodo = useCreateTodo();
  const toggleTodo = useToggleTodo();
  const editTodo = useEditTodo();
  const deleteTodo = useDeleteTodo();
  const clearCompleted = useClearCompleted();

  useEffect(() => {
    const timer = setInterval(() => setToday(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (webViewTimer.current) clearTimeout(webViewTimer.current);
    };
  }, []);

  function openWebView() {
    webViewPending.current = true;
    setProfileOpen(false);
  }

  function handleProfileClosed() {
    if (!webViewPending.current) return;
    webViewPending.current = false;
    if (webViewTimer.current) clearTimeout(webViewTimer.current);
    // iOS presents only one modal at a time. The account sheet's native modal is
    // fully dismissed by now; give UIKit a beat before presenting the next one.
    webViewTimer.current = setTimeout(
      () => setWebViewOpen(true),
      Platform.OS === 'ios' ? 100 : 0,
    );
  }

  const todos = useMemo(() => todosQuery.data ?? [], [todosQuery.data]);
  const counts = useMemo(
    () => ({
      all: todos.length,
      active: todos.filter((todo) => !todo.completed).length,
      done: todos.filter((todo) => todo.completed).length,
    }),
    [todos],
  );

  const sortedTodos = useMemo(
    () =>
      [...todos].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.position !== b.position) return b.position - a.position;
        return b.id - a.id;
      }),
    [todos],
  );

  const visibleTodos = useMemo(() => {
    if (filter === 'active') return sortedTodos.filter((todo) => !todo.completed);
    if (filter === 'done') return sortedTodos.filter((todo) => todo.completed);
    return sortedTodos;
  }, [filter, sortedTodos]);

  const allDone = counts.all > 0 && counts.active === 0;

  if (!user) return null;

  const lightImpact = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const successImpact = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  function alertError(message: string) {
    showToast({ message, tone: 'danger' });
  }

  async function handleAdd(title: string) {
    if (filter === 'done') setFilter('all');
    try {
      await createTodo.mutateAsync({ title });
      successImpact();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '添加失败，请重试';
      showToast({
        message,
        tone: 'danger',
        actionLabel: '重试',
        onAction: () => {
          void handleAdd(title).catch(() => undefined);
        },
      });
      throw caught;
    }
  }

  function handleToggle(todo: Todo) {
    if (todo.id < 0) return;
    lightImpact();
    toggleTodo.mutate(
      { id: todo.id, completed: !todo.completed },
      {
        onError: (caught) =>
          alertError(caught instanceof Error ? caught.message : '更新失败，请重试'),
      },
    );
  }

  function handleDelete(todo: Todo): boolean {
    if (todo.id < 0) return false;
    if (editing?.id === todo.id) setEditing(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);

    deleteTodo.mutate(todo, {
      onSuccess: () => {
        showToast({
          message: `已删除「${shortTitle(todo.title)}」`,
          actionLabel: '撤销',
          onAction: () => {
            void createTodo
              .mutateAsync({ title: todo.title, completed: todo.completed })
              .catch((caught: unknown) =>
                alertError(caught instanceof Error ? caught.message : '撤销失败，请重试'),
              );
          },
        });
      },
      onError: (caught) =>
        alertError(caught instanceof Error ? caught.message : '删除失败，请重试'),
    });
    return true;
  }

  async function handleSave(title: string) {
    if (!editing) return;
    await editTodo.mutateAsync({ id: editing.id, title });
    successImpact();
  }

  function handleClearCompleted() {
    clearCompleted.mutate(undefined, {
      onSuccess: (deleted) => {
        if (deleted > 0) successImpact();
        showToast({
          message: deleted > 0 ? `已清除 ${deleted} 件已完成任务` : '没有可清除的任务',
          tone: 'success',
        });
      },
      onError: (caught) =>
        alertError(caught instanceof Error ? caught.message : '清除失败，请重试'),
    });
  }

  async function handleLogout() {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  }

  const dates = formatDateLabel(today);

  return (
    <AppScreen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <View style={styles.topRow}>
            <BrandMark size="sm" />
            <Pressable
              onPress={() => setProfileOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="打开账号菜单"
              hitSlop={8}
              style={styles.avatarButton}>
              <Avatar user={user} size={38} />
            </Pressable>
          </View>

          <View style={styles.greetingRow}>
            <View style={styles.greetingCopy}>
              <Text style={[styles.date, { color: colors.faint }]}>{dates}</Text>
              <Text style={[styles.greeting, { color: colors.ink }]} numberOfLines={1}>
                {greetingFor(today)}，{firstName(user.name)}
              </Text>
              <Text style={[styles.subline, { color: colors.muted }]}>
                {allDone
                  ? '清单清空了，去走走吧。'
                  : counts.active > 0
                    ? `还有 ${counts.active} 件小事，慢慢来。`
                    : '从一件小事开始。'}
              </Text>
            </View>
            <ProgressRing completed={counts.done} total={counts.all} />
          </View>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={todosQuery.isFetching && !todosQuery.isPending}
              onRefresh={() => void todosQuery.refetch()}
              tintColor={colors.muted}
              colors={[colors.accent]}
            />
          }>
          <View style={styles.tabs}>
            <FilterTabs
              filter={filter}
              counts={counts}
              onChange={(next) => {
                setOpenTodoId(null);
                setFilter(next);
              }}
            />
          </View>

          {todosQuery.isPending ? <TodoSkeleton colors={colors} /> : null}

          {todosQuery.isError ? (
            <ErrorState
              message={todosQuery.error instanceof Error ? todosQuery.error.message : '网络开了个小差'}
              colors={colors}
              retrying={todosQuery.isFetching}
              onRetry={() => void todosQuery.refetch()}
            />
          ) : null}

          {todosQuery.isSuccess && visibleTodos.length === 0 ? (
            <EmptyState
              filter={filter}
              onAdd={() => {
                composerRef.current?.focus();
              }}
              onShowAll={() => setFilter('all')}
            />
          ) : null}

          {todosQuery.isSuccess && visibleTodos.length > 0 ? (
            <View style={styles.list}>
              {visibleTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  pending={todo.id < 0}
                  openId={openTodoId}
                  onOpen={setOpenTodoId}
                  onToggle={() => handleToggle(todo)}
                  onEdit={() => setEditing(todo)}
                  onDelete={() => handleDelete(todo)}
                />
              ))}
            </View>
          ) : null}

          {counts.done > 0 && todosQuery.isSuccess ? (
            <View style={styles.clearRow}>
              <Pressable
                onPress={handleClearCompleted}
                disabled={clearCompleted.isPending}
                accessibilityRole="button"
                style={styles.clearButton}>
                <TrashIcon size={12} color={colors.faint} />
                <Text style={[styles.clearText, { color: colors.faint }]}>
                  清除已完成 · {counts.done}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {allDone && filter === 'all' ? (
            <Animated.View
              entering={FadeIn.delay(80)}
              style={[styles.allDone, { backgroundColor: colors.sageSoft }]}>
              <SparkleIcon size={17} color={colors.sage} />
              <Text style={[styles.allDoneText, { color: colors.sage }]}>
                今天的清单清空了。慢慢来，也很好。
              </Text>
            </Animated.View>
          ) : null}

          <View style={styles.bottomSpace} />
        </ScrollView>

        <TodoComposer
          inputRef={composerRef}
          onAdd={handleAdd}
          pending={createTodo.isPending}
          online
          bottomInset={insets.bottom}
        />
      </KeyboardAvoidingView>

      <EditSheet
        todo={editing}
        visible={editing !== null}
        onClose={() => setEditing(null)}
        onSave={handleSave}
        onDelete={() => (editing ? handleDelete(editing) : false)}
      />

      <ProfileSheet
        user={user}
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
        onLogout={() => void handleLogout()}
        onOpenDebug={() => {
          setProfileOpen(false);
          setDebugOpen(true);
        }}
        onOpenWebView={openWebView}
        onClosed={handleProfileClosed}
        logoutPending={signingOut}
      />

      <DebugPanel visible={debugOpen} onClose={() => setDebugOpen(false)} />

      <WebViewSheet visible={webViewOpen} onClose={() => setWebViewOpen(false)} />
    </AppScreen>
  );
}

function ErrorState({
  message,
  colors,
  retrying,
  onRetry,
}: {
  message: string;
  colors: ReturnType<typeof useTheme>['colors'];
  retrying: boolean;
  onRetry: () => void;
}) {
  return (
    <View style={[styles.errorCard, { borderColor: colors.line, backgroundColor: colors.card }]}>
      <View style={[styles.errorIcon, { backgroundColor: colors.tabTrack }]}>
        <RefreshIcon size={18} color={colors.muted} />
      </View>
      <Text style={[styles.errorTitle, { color: colors.ink }]}>清单没有加载出来</Text>
      <Text style={[styles.errorBody, { color: colors.muted }]}>{message}</Text>
      <Pressable
        onPress={onRetry}
        disabled={retrying}
        accessibilityRole="button"
        style={[styles.retry, { backgroundColor: colors.ink }]}>
        {retrying ? (
          <ActivityIndicator size="small" color={colors.paper} />
        ) : (
          <RefreshIcon size={14} color={colors.paper} />
        )}
        <Text style={[styles.retryText, { color: colors.paper }]}>重新加载</Text>
      </Pressable>
    </View>
  );
}

function TodoSkeleton({ colors }: { colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={styles.list} accessibilityLabel="正在加载任务">
      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          style={[styles.skeleton, { backgroundColor: colors.card, borderColor: colors.line }]}>
          <View style={[styles.skeletonCircle, { backgroundColor: colors.line }]} />
          <View style={styles.skeletonCopy}>
            <View
              style={[
                styles.skeletonLine,
                { backgroundColor: colors.line, width: `${58 - index * 7}%` },
              ]}
            />
            <View style={[styles.skeletonShort, { backgroundColor: colors.line }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingRow: {
    marginTop: Spacing['2xl'],
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  greetingCopy: {
    flex: 1,
  },
  date: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.5,
  },
  greeting: {
    marginTop: 6,
    fontFamily: Fonts.display,
    fontSize: 31,
    fontWeight: '600',
    letterSpacing: -0.6,
  },
  subline: {
    marginTop: 7,
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 18,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 16,
  },
  tabs: {
    marginBottom: 14,
  },
  list: {
    gap: 10,
  },
  clearRow: {
    alignItems: 'flex-end',
    marginTop: 12,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  clearText: {
    fontFamily: Fonts.sans,
    fontSize: 10,
  },
  allDone: {
    marginTop: 10,
    borderRadius: Radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 13,
  },
  allDoneText: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 18,
  },
  bottomSpace: {
    height: 20,
  },
  errorCard: {
    marginTop: 30,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 28,
    alignItems: 'center',
  },
  errorIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    marginTop: 14,
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '600',
  },
  errorBody: {
    marginTop: 7,
    maxWidth: 250,
    textAlign: 'center',
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 18,
  },
  retry: {
    marginTop: 18,
    minWidth: 112,
    height: 40,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 16,
  },
  retryText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '600',
  },
  skeleton: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
  },
  skeletonCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    opacity: 0.65,
  },
  skeletonCopy: {
    flex: 1,
    gap: 8,
  },
  skeletonLine: {
    height: 10,
    borderRadius: 5,
    opacity: 0.7,
  },
  skeletonShort: {
    width: 60,
    height: 7,
    borderRadius: 4,
    opacity: 0.5,
  },
});
