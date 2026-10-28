# Todo Swipe Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为现有 Todo 左滑增加同步的文案弱化、边缘过渡阴影与操作内容位移动画。

**Architecture:** 保留 `TodoItem` 当前 Gesture Handler 手势和 `reveal` 共享值，仅在 Reanimated 样式与展示层增加派生动画。使用 React Native 0.88 已支持的 `backgroundImage` 线性渐变绘制卡片内右边缘阴影，不增加依赖。

**Tech Stack:** Expo SDK 58、React Native 0.88、React Native Gesture Handler 3.3、Reanimated 4.7、TypeScript。

## Global Constraints

- 不修改手势阈值、`ACTION_WIDTH = 172`、完成／删除业务逻辑或数据接口。
- 不引入新依赖，不改为 `Swipeable`。
- 所有效果由 `reveal` 同步驱动，浅色和深色主题共用主题色。
- 当前目录不是 Git 仓库，不执行提交步骤。

---

### Task 1: 同步左滑视觉状态

**Files:**
- Modify: `src/features/todos/TodoItem.tsx`
- Test: `src/features/todos/TodoItem.tsx` 的设备交互检查，以及项目现有静态检查。

**Interfaces:**
- Consumes: 现有 `reveal: SharedValue<number>`、`colors`、`todo.completed`。
- Produces: 不改变组件 props 或外部接口。

- [ ] **Step 1: 添加派生动画样式**

在现有 `actionsStyle` 后增加以下样式：标题从正常色过渡到 `colors.muted`，时间透明度降至 0.6，操作内容从右侧 28 px 跟动到原位，阴影在前 32 px 露出过程中渐显。

```tsx
const titleStyle = useAnimatedStyle(() => ({
  color: interpolateColor(
    reveal.value,
    [0, 48],
    [todo.completed ? colors.muted : colors.ink, colors.muted],
  ),
}));

const timeStyle = useAnimatedStyle(() => ({
  opacity: interpolate(reveal.value, [0, 48], [1, 0.6], Extrapolation.CLAMP),
}));

const actionsContentStyle = useAnimatedStyle(() => ({
  opacity: interpolate(reveal.value, [0, 32], [0.55, 1], Extrapolation.CLAMP),
  transform: [
    {
      translateX: interpolate(
        reveal.value,
        [0, ACTION_WIDTH],
        [28, 0],
        Extrapolation.CLAMP,
      ),
    },
  ],
}));

const edgeShadowStyle = useAnimatedStyle(() => ({
  opacity: interpolate(reveal.value, [0, 32], [0, 0.14], Extrapolation.CLAMP),
  backgroundImage: `linear-gradient(to right, transparent, ${colors.shadow})`,
}));
```

- [ ] **Step 2: 接入展示层**

用固定宽度内容容器包住两个操作按钮并应用 `actionsContentStyle`；将标题和时间改为 `Animated.Text` 并应用对应样式。在 `cardInner` 后添加不可响应触摸的阴影层：

```tsx
<Animated.View style={[styles.actionsContent, actionsContentStyle]}>
  {/* 保留两个现有操作 Pressable，不改变回调 */}
</Animated.View>

<Animated.View pointerEvents="none" style={[styles.edgeShadow, edgeShadowStyle]} />
```

补充样式：

```tsx
actionsContent: {
  width: ACTION_WIDTH,
  height: '100%',
  flexDirection: 'row',
},
edgeShadow: {
  position: 'absolute',
  top: 0,
  bottom: 0,
  right: 0,
  width: 20,
},
```

- [ ] **Step 3: 运行静态检查**

Run: `npm run lint && npm run typecheck`
Expected: 两个命令均以退出码 0 完成，无新增错误。

- [ ] **Step 4: 验证实际交互**

在 iOS 模拟器或可用预览中验证慢速左滑、松手展开、右滑收回和点击收回。预期文案与阴影随进度连续变化，操作内容无硬切感，展开后两个操作仍可点击，完全收回后阴影消失。
