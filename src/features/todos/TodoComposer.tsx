import { useRef, useState, type ComponentRef, type RefObject } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
} from 'react-native';

import { ArrowUpIcon } from '@/components/Icons';
import { PressableScale } from '@/components/PressableScale';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function TodoComposer({
  onAdd,
  pending,
  online,
  bottomInset,
  inputRef,
}: {
  onAdd: (title: string) => Promise<void>;
  pending: boolean;
  online: boolean;
  bottomInset: number;
  inputRef?: RefObject<ComponentRef<typeof TextInput> | null>;
}) {
  const { colors } = useTheme();
  const [value, setValue] = useState('');
  const localRef = useRef<ComponentRef<typeof TextInput>>(null);
  const fieldRef = inputRef ?? localRef;
  const canSubmit = value.trim().length > 0 && !pending && online;

  async function submit() {
    const title = value.trim();
    if (!title || pending) return;
    if (!online) return;
    setValue('');
    fieldRef.current?.blur();
    Keyboard.dismiss();
    try {
      await onAdd(title);
    } catch {
      setValue(title);
    }
  }

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingBottom: bottomInset + 10,
          borderTopColor: colors.line,
          backgroundColor: colors.paper,
        },
      ]}>
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.card,
            borderColor: colors.line,
            shadowColor: colors.shadow,
          },
        ]}>
        <TextInput
          ref={fieldRef}
          value={value}
          onChangeText={setValue}
          onSubmitEditing={() => void submit()}
          placeholder={online ? '写下一件要做的小事…' : '离线中，暂时无法添加'}
          placeholderTextColor={colors.faint}
          selectionColor={colors.accent}
          returnKeyType="done"
          blurOnSubmit={false}
          maxLength={200}
          editable={online}
          style={[
            styles.input,
            { color: colors.ink },
            Platform.OS === 'web' ? (webInputReset as TextStyle) : null,
          ]}
          accessibilityLabel="新任务"
        />
        <PressableScale
          onPress={() => void submit()}
          disabled={!canSubmit}
          accessibilityLabel="添加任务"
          style={styles.add}>
          <View
            style={[
              styles.addInner,
              { backgroundColor: canSubmit ? colors.ink : colors.tabTrack },
            ]}>
            {pending ? (
              <ActivityIndicator size="small" color={colors.paper} />
            ) : (
              <ArrowUpIcon size={18} color={canSubmit ? colors.paper : colors.faint} />
            )}
          </View>
        </PressableScale>
      </View>
      <Text style={[styles.hint, { color: colors.faint }]}>
        {online ? '轻点编辑 · 左滑显示操作' : '恢复网络后再试一次'}
      </Text>
    </View>
  );
}

const webInputReset = { outlineStyle: 'none' };

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 7,
  },
  inputBar: {
    minHeight: 56,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 6,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  input: {
    flex: 1,
    minHeight: 52,
    fontFamily: Fonts.sans,
    fontSize: 16,
    paddingVertical: 12,
  },
  add: {
    marginLeft: 8,
  },
  addInner: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    textAlign: 'center',
    fontFamily: Fonts.sans,
    fontSize: 9,
    letterSpacing: 0.5,
  },
});
