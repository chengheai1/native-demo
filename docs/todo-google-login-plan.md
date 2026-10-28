# 「序」React Native Todo + Google 登录 · 实施计划

> 前端全部位于 `src/`，使用现有 Expo SDK 58 / React Native 0.88 工程；不再创建 `apps/web`。后端为根目录 `server/` 的轻量 FastAPI。

## 1. 目标与边界

- 用 React Native + Expo Router 实现一个手机端 Todo App，含 Google 登录、演示登录、任务 CRUD、筛选、进度和完整的加载/空/错误状态。
- 动效以 Reanimated 4 + Gesture Handler 实现，整体克制：短时淡入、平滑位移、必要的触感反馈，不做彩纸、弹跳或夸张转场。
- 后端继续使用 FastAPI + SQLite，显式 SQL、事务和索引；移动端用 Bearer Token，不依赖 Cookie。
- Google 凭据缺失时保留完整 OAuth 代码路径，并提供开箱即用的演示登录。

## 2. 技术栈

| 层 | 选型 |
| --- | --- |
| App | Expo SDK 58、React Native 0.88、React 19、TypeScript、Expo Router |
| 动效 | react-native-reanimated 4、react-native-gesture-handler 3 |
| 数据 | TanStack Query 5、expo-secure-store |
| 原生能力 | expo-web-browser、expo-linking、expo-haptics、expo-linear-gradient、react-native-svg |
| 后端 | Python 3.11、FastAPI、SQLite |
| 测试 | pytest（后端）、Node test（纯函数） |

## 3. 页面与路由

- `src/app/index.tsx`：启动/恢复会话，按登录态跳转
- `src/app/login.tsx`：品牌登录页、Google 登录、演示登录、错误提示
- `src/app/todos.tsx`：任务清单
- `src/app/_layout.tsx`：GestureHandlerRootView、SafeAreaProvider、QueryClient、AuthProvider、Toast、Stack

登录页：品牌字标、主张、Google 按钮、演示入口、OAuth 错误与后端连接错误。
清单页：日期/问候、完成进度环、全部/进行中/已完成、任务列表、底部输入条、清除已完成、全部完成提示、账号面板、调试面板。

## 4. 登录态

- 启动时从 `expo-secure-store` 读取 token；调 `/api/auth/me` 恢复用户。
- 登录成功后 token 只存 SecureStore，API 使用 `Authorization: Bearer`。
- 401 统一清空本地 token 并回登录页。
- 演示登录：`POST /api/auth/native/demo`，创建独立临时账号 + 3 条示例任务。

### Google OAuth（原生）

1. App 用 `WebBrowser.openAuthSessionAsync` 打开后端 `/api/auth/google/native/start?redirect=nativedemo://auth`。
2. 后端生成 state + PKCE，302 到 Google，state/redirect 入库并写 HttpOnly state cookie。
3. Google 回调到后端 `/api/auth/google/callback`；后端校验 state、换 token、拉 userinfo。
4. 后端创建一次性 login code（5 分钟有效、哈希存储），302 到 `nativedemo://auth?code=...`。
5. App 收到 deep link，调用 `/api/auth/native/exchange` 换 session token，存 SecureStore。
6. 所有任务接口通过 Bearer 鉴权；Expo Web 走 `/api/auth/google/web/start` → `/web-auth` 一次性 code 回跳。
7. Expo Go 联调时通过 `ALLOW_EXPO_GO_REDIRECTS=true` 允许 `exp://` 回调；正式包使用 `nativedemo://auth`。

## 5. 数据与 API

- `users`、`sessions`、`todos`、`oauth_states`、`login_codes`
- 索引：`todos(user_id, completed, position)`、`sessions(token_hash)`、`sessions(expires_at)`、`login_codes(expires_at)`
- 事务：用户+会话、任务 position、清除已完成、state 消费、一次性 code 消费
- API：
  - `GET /api/health`、`GET /api/auth/config`
  - `GET /api/auth/google/native/start`、`GET /api/auth/google/callback`
  - `POST /api/auth/native/exchange`、`POST /api/auth/native/demo`
  - `GET /api/auth/me`、`POST /api/auth/logout`
  - `GET/POST /api/todos`、`PATCH/DELETE /api/todos/{id}`、`POST /api/todos/clear-completed`

## 6. 动效（克制版）

- 页面/内容：180–280ms 淡入，不做大幅位移
- 勾选：160ms 缩放 + 对勾出现，无弹簧回弹
- 筛选：220ms ease-out 滑块
- 进度环：480ms ease-out 进度
- 左滑展开操作区：手势跟手，宽度随滑动距离变化；按钮固定宽度，文字 16px、正常字重、居中不位移；todo 文案保持原布局并裁剪；当前行变灰；展开时右侧圆角收平并与操作区合并；右滑收起；切换筛选自动收起；同时只允许一行展开
- 底部面板：260ms 平滑上移；仅把手区域可下拉关闭
- Toast：180ms 淡入，140ms 淡出
- 无彩纸、无全屏弹跳、无夸张旋转
- 触感反馈只用于勾选/完成/删除等关键操作

## 7. 移动端适配

- `SafeAreaProvider` + `useSafeAreaInsets` 处理刘海和底部安全区
- `KeyboardAvoidingView` + 输入区在普通布局流中，键盘弹出时自然上移
- TextInput 16px，避免 iOS 聚焦缩放
- 输入条、列表、编辑面板支持键盘与滚动
- 账号面板内提供调试面板：窗口尺寸、safe area、键盘高度、API 地址、平台、字体缩放
- 真机调试：iOS Safari Web Inspector / Android Chrome `chrome://inspect`；`EXPO_PUBLIC_API_URL` 可覆盖 API 地址

## 8. 验证

- `npx tsc --noEmit`
- `npm run lint`
- `npm test`（纯函数）
- `cd server && .venv/bin/pytest`（19 tests）
- `npx expo export --platform ios` / `android`
- 真机需在 Expo Go 或 development build 中运行；Google 登录需配置凭据和 HTTPS 后端

## 9. 交付

- `src/`：完整 React Native 前端
- `server/`：FastAPI + SQLite + pytest
- `docs/`：本计划、界面截图
- 根 README：启动、OAuth、调试、测试、Docker 说明
