import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
} from 'react-native';

import { Sheet } from '@/components/Sheet';
import { TrashIcon } from '@/components/Icons';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Todo } from '@/api/types';
import { isSaveButtonActive } from './editFormState';

export function EditSheet({
  todo,
  visible,
  onClose,
  onSave,
  onDelete,
}: {
  todo: Todo | null;
  visible: boolean;
  onClose: () => void;
  onSave: (title: string) => Promise<void>;
  onDelete: () => boolean;
}) {
  const { colors } = useTheme();

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="编辑任务"
      description={todo ? `创建于 ${new Date(todo.createdAt).toLocaleDateString('zh-CN')}` : undefined}>
      {todo ? (
        <EditForm
          key={todo.id}
          todo={todo}
          colors={colors}
          onClose={onClose}
          onSave={onSave}
          onDelete={onDelete}
        />
      ) : null}
    </Sheet>
  );
}

function EditForm({
  todo,
  colors,
  onClose,
  onSave,
  onDelete,
}: {
  todo: Todo;
  colors: ReturnType<typeof useTheme>['colors'];
  onClose: () => void;
  onSave: (title: string) => Promise<void>;
  onDelete: () => boolean;
}) {
  const [title, setTitle] = useState(todo.title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = title.trim();
  const dirty = trimmed !== todo.title;
  const canSave = dirty && trimmed.length > 0 && !saving;

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View>
      <Text style={[styles.label, { color: colors.faint }]}>任务内容</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        autoFocus
        accessibilityLabel="任务内容"
        maxLength={200}
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
        selectionColor={colors.accent}
        style={[
          styles.input,
          {
            color: colors.ink,
            backgroundColor: colors.card,
            borderColor: colors.line,
          },
          Platform.OS === 'web' ? (webInputReset as TextStyle) : null,
        ]}
      />
      <View style={styles.metaRow}>
        <Text style={[styles.meta, { color: colors.faint }]}>修改后会立即同步</Text>
        <Text style={[styles.meta, { color: colors.faint }]}>{title.length}/200</Text>
      </View>

      {error ? (
        <Text style={[styles.error, { color: colors.accent, backgroundColor: colors.accentSoft }]}>
          {error}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            if (onDelete()) onClose();
          }}
          accessibilityRole="button"
          accessibilityLabel="删除任务"
          style={[styles.delete, { borderColor: colors.accentSoft, backgroundColor: `${colors.accent}0D` }]}>
          <TrashIcon size={17} color={colors.accent} />
        </Pressable>
        <Pressable
          onPress={() => void submit()}
          disabled={!canSave}
          accessibilityRole="button"
          style={[
            styles.save,
            {
              backgroundColor: isSaveButtonActive({ canSave, saving })
                ? colors.ink
                : colors.tabTrack,
            },
          ]}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.paper} />
          ) : (
            <Text style={[styles.saveText, { color: canSave ? colors.paper : colors.faint }]}>
              保存修改
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const webInputReset = { outlineStyle: 'none' };

const styles = StyleSheet.create({
  label: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    minHeight: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg,
    fontFamily: Fonts.sans,
    fontSize: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  meta: {
    fontFamily: Fonts.sans,
    fontSize: 10,
  },
  error: {
    marginTop: 10,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 20,
  },
  delete: {
    width: 50,
    height: 50,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  save: {
    flex: 1,
    height: 50,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '600',
  },
});
