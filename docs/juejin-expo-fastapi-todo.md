# 用 Expo + FastAPI 做一个全栈 Todo：邮箱登录、乐观更新与 SQLite 事务实践

> GitHub 项目地址：[chengheai1/native-demo](https://github.com/chengheai1/native-demo)
>
> 技术栈：Expo SDK 58、React Native、TypeScript、TanStack Query、FastAPI、SQLite。

最近完成了一个名为「序 XU」的全栈 Todo 项目。它不是只有界面的 Demo：前端可以跑在 iOS、Android 和 Web 上，后端包含邮箱验证码登录、Bearer Token 会话、用户数据隔离、统一 API 响应和 Docker 部署脚本。

这篇文章会把前后端的关键流程拆开讲清楚，包括：

- Expo Router 如何组织页面与登录态路由
- 邮箱验证码如何换成 Bearer Token
- FastAPI 如何统一响应格式和鉴权
- TanStack Query 如何实现乐观更新与失败回滚
- SQLite 如何保证用户数据隔离和事务安全
- 如何通过环境变量完成本地开发与生产部署

项目已开源，欢迎 Star 和指正：[https://github.com/chengheai1/native-demo](https://github.com/chengheai1/native-demo)

## 一、项目效果

清单页包含任务筛选、完成进度、下拉刷新和空状态：

![Todo 清单页](https://raw.githubusercontent.com/chengheai1/native-demo/main/docs/screenshots/todos.png)

编辑任务使用底部 Sheet，同时支持浅色与深色主题：

![编辑任务](https://raw.githubusercontent.com/chengheai1/native-demo/main/docs/screenshots/edit.png)

![深色模式](https://raw.githubusercontent.com/chengheai1/native-demo/main/docs/screenshots/dark.png)

功能上目前支持：

- 邮箱验证码登录、退出登录、重启后恢复会话
- 新增、编辑、完成、删除任务
- 全部／进行中／已完成筛选
- 左滑展开操作、撤销删除、清除已完成
- 乐观更新、失败回滚、错误重试
- 系统／浅色／深色主题切换

## 二、整体架构

项目采用前后端同仓库结构，但没有引入复杂的 Monorepo 框架：

```text
native-demo/
├── src/                     Expo / React Native 前端
│   ├── app/                 Expo Router 页面
│   ├── api/                 请求封装与接口定义
│   ├── auth/                登录态、会话恢复
│   ├── features/            登录、Todo、账号等业务模块
│   ├── components/          通用组件
│   └── lib/                 API 地址、存储、格式化
├── server/
│   ├── app/                 FastAPI 应用
│   ├── tests/               pytest 测试
│   ├── .env.example         环境变量模板
│   └── deploy.sh            Docker 部署脚本
└── docs/                    截图与文章
```

一次典型请求会经过下面这条链路：

```text
React Native 页面
        │
        ▼
TanStack Query / AuthProvider
        │
        ▼
apiFetch：Bearer Token + 超时 + 错误处理
        │
        ▼
FastAPI 中间件：Origin 检查 + 统一响应
        │
        ▼
Depends(require_user)：校验 Session
        │
        ▼
Todo / Auth 路由
        │
        ▼
SQLite：参数化 SQL + 显式事务
```

这样做的好处是职责比较清晰：页面只关心交互，请求细节集中在 API 层，数据库操作集中在后端路由和数据库模块中。

## 三、先把项目跑起来

### 1. 启动 FastAPI

```bash
cd server
python3.11 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

健康检查地址：

```text
http://localhost:8000/api/health
```

本地开发不配置 SMTP 也可以登录：验证码会打印在后端日志里。生产环境则必须配置真实邮件服务，不能把开发模式直接带上线。

### 2. 启动 Expo

另开一个终端，在仓库根目录执行：

```bash
corepack enable
pnpm install
npx expo start
```

然后可以按 `i` 打开 iOS 模拟器、按 `a` 打开 Android 模拟器，或者通过 development build 在真机上运行。

Android 模拟器访问宿主机时，默认使用 `10.0.2.2`；真机联调需要确保手机和电脑在同一局域网，也可以显式指定 API 地址：

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000 npx expo start
```

这里的 `192.168.1.100` 只是示例，需要替换成自己电脑的局域网 IP。

## 四、登录流程：从邮箱验证码到 Bearer Token

登录是前后端串联最完整的一条流程。

```text
用户输入邮箱
    │
    ▼
POST /api/auth/email/code
    │
    ├─ 校验邮箱、请求频率和冷却时间
    ├─ 生成 6 位验证码
    ├─ 数据库只保存验证码哈希
    └─ 调用 SMTP 发送邮件
    │
    ▼
用户输入验证码
    │
    ▼
POST /api/auth/email/verify
    │
    ├─ 校验有效期、错误次数和是否已使用
    ├─ 创建或查找用户
    └─ 创建 Session，返回 Bearer Token
    │
    ▼
App 将 Token 写入 expo-secure-store
    │
    ▼
后续请求携带 Authorization: Bearer <token>
```

前端登录逻辑集中在 `src/auth/AuthProvider.tsx`。登录成功后，不只是更新 React State，还会同时完成三件事：

```tsx
async function applySession(nextToken: string, nextUser: User) {
  await writeSessionToken(nextToken);
  setApiToken(nextToken);
  setToken(nextToken);
  setUser(nextUser);
  setStatus('signedIn');
  await queryClient.invalidateQueries({ queryKey: ['todos'] });
}
```

原生端使用 `expo-secure-store` 保存 Token；Web 端回退到 `localStorage`。App 重启后，`AuthProvider` 会读取本地 Token，并调用 `/api/auth/me` 验证它是否仍然有效。

首页路由因此非常简单：

```tsx
if (status === 'loading') return <AuthLoadingScreen />;

return <Redirect href={status === 'signedIn' ? '/todos' : '/login'} />;
```

后端不会直接保存 Bearer Token 原文，而是保存 SHA-256 哈希。鉴权时重新计算哈希，再联查 `sessions` 和 `users`：

```python
token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
row = db.execute(
    """
    SELECT u.*, s.expires_at AS session_expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?
    """,
    (token_hash, iso(utc_now())),
).fetchone()
```

这样即使数据库泄露，攻击者也不能直接拿数据库字段去请求 API。当然，生产环境仍然需要 HTTPS、数据库备份保护和合理的会话过期策略。

## 五、统一 API 请求与响应

后端成功响应统一为：

```json
{
  "code": 200,
  "data": {},
  "message": "success"
}
```

失败响应则使用业务错误码：

```json
{
  "code": "unauthorized",
  "data": null,
  "message": "请先登录"
}
```

FastAPI 中间件负责包装成功的 JSON 响应；`204`、OAuth 重定向和非 JSON 响应不处理。前端只在 `src/api/response.ts` 中解包一次，避免每个页面都重复判断响应结构。

请求层 `src/api/client.ts` 还集中处理了：

- 自动添加 `Content-Type` 和 `Authorization`
- 15 秒请求超时
- 统一解析业务错误
- 网络错误与服务端错误区分
- 收到 401 时通知 `AuthProvider` 清理会话

核心代码如下：

```ts
if (authToken) {
  headers.set('Authorization', `Bearer ${authToken}`);
}

const response = await fetch(`${API_URL}${path}`, {
  ...init,
  headers,
  signal: controller.signal,
});

if (response.status === 401) {
  unauthorizedListeners.forEach((listener) => listener());
}

return unwrapApiResponse(payload);
```

这层封装让业务接口非常干净：

```ts
export async function listTodos(): Promise<Todo[]> {
  const data = await apiFetch<{ todos: Todo[] }>('/api/todos');
  return data.todos;
}
```

## 六、Todo 流程：乐观更新与失败回滚

如果每次点击完成都等待服务器返回再更新 UI，操作会显得很迟钝。这个项目使用 TanStack Query 的 `onMutate`、`onError` 和 `onSettled` 实现乐观更新。

以新增任务为例：

1. 取消正在进行的列表请求，避免旧响应覆盖新状态。
2. 保存当前列表快照。
3. 生成一个负数临时 ID，把临时任务插入列表。
4. 请求成功后，用服务端任务替换临时任务。
5. 请求失败时恢复快照。
6. 最后重新拉取列表，保证与服务器一致。

简化后的代码如下：

```ts
return useMutation({
  mutationFn: ({ title }: { title: string }) => createTodo(title),

  onMutate: async ({ title }) => {
    await queryClient.cancelQueries({ queryKey: TODOS_KEY });
    const previous = queryClient.getQueryData<Todo[]>(TODOS_KEY);
    const temp = tempTodo(title, false);

    queryClient.setQueryData<Todo[]>(TODOS_KEY, (old = []) => [temp, ...old]);
    return { previous, tempId: temp.id };
  },

  onError: (_error, _variables, context) => {
    if (context?.previous) {
      queryClient.setQueryData(TODOS_KEY, context.previous);
    }
  },

  onSuccess: (todo, _variables, context) => {
    queryClient.setQueryData<Todo[]>(TODOS_KEY, (old = []) =>
      old.map((item) => (item.id === context?.tempId ? todo : item)),
    );
  },

  onSettled: () => {
    void queryClient.invalidateQueries({ queryKey: TODOS_KEY });
  },
});
```

临时 ID 使用负数还有一个好处：服务器还没返回真实 ID 时，可以禁止对这一行执行编辑、完成或删除操作，避免把 `-172...` 当成真实数据库 ID 发出去。

## 七、FastAPI + SQLite：简单但不能随便

SQLite 很适合这种小型项目：不需要单独启动数据库服务，备份也只是一个文件。但登录和 Todo 都涉及写入，所以事务与用户隔离不能省。

### 1. 用户数据隔离

所有 Todo 查询都同时限制 `id` 和 `user_id`：

```python
cursor = db.execute(
    "DELETE FROM todos WHERE id = ? AND user_id = ?",
    (todo_id, user["id"]),
)
```

即使知道了别人的任务 ID，也不能越权读取、修改或删除。这里的用户 ID 来自服务端 Session，而不是前端请求体。

### 2. 显式事务

项目通过 `BEGIN IMMEDIATE` 开启写事务，成功提交、异常回滚：

```python
@contextmanager
def transaction(conn: sqlite3.Connection):
    conn.execute("BEGIN IMMEDIATE")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
```

新增任务时，计算下一条 `position` 和插入记录放在同一个事务中，避免写入到一半留下不一致状态。

### 3. 建表保持幂等

数据库通过 `CREATE TABLE IF NOT EXISTS` 和 `CREATE INDEX IF NOT EXISTS` 初始化，并开启外键、WAL 和 busy timeout。测试使用临时数据库，绝不会碰本地开发数据。

## 八、Docker 部署与配置边界

本地可以使用 Compose 启动：

```bash
docker compose up --build
```

生产部署脚本完成以下流程：

```text
同步后端源码
    │
    ▼
备份代码和 SQLite 数据库
    │
    ▼
服务器构建新 Docker 镜像
    │
    ▼
旧容器改名保留
    │
    ▼
启动新容器并轮询健康检查
    │
    ├─ 成功：清理旧容器和过期镜像
    └─ 失败：恢复旧容器
```

部署配置分为两类：

- **可以公开的配置**：端口、镜像名、备份数量、健康检查路径。
- **不能提交的配置**：SMTP 密码、Google Client Secret、真实 Session Token、签名密钥、生产数据库。

真实部署主机和 Docker 网络通过环境变量传入：

```bash
DEPLOY_HOST=203.0.113.10 \
NETWORK=bridge \
PUBLIC_HEALTH=https://api.example.com/api/health \
./deploy.sh
```

示例 IP 和域名需要替换成自己的配置。服务器上的 `run.env` 权限应设为 `600`，不要提交到 Git，也不要把密钥写入 `EXPO_PUBLIC_*` 变量——这类变量会进入客户端构建产物。

## 九、目前踩过的几个点

### 1. 原生端和 Web 的存储不同

原生端应优先使用 SecureStore，Web 端才使用 localStorage。把存储差异封装在 `src/lib/storage.ts` 中，业务代码就不必关心平台分支。

### 2. 乐观更新一定要保存快照

只更新缓存、不处理失败，会导致界面显示成功而服务器实际失败。快照回滚和最终重新拉取都不能漏。

### 3. 用户隔离要写在每一条 SQL 里

只在列表接口加 `user_id` 不够，详情、更新、删除同样要加。测试里也应该覆盖“用户 B 不能操作用户 A 的任务”。

### 4. 删除敏感文件不等于删除泄露

如果隐私图片或密钥已经提交过，只在最新提交里 `git rm` 并不够，旧提交仍然能访问。公开仓库前要检查完整历史；密钥一旦进入历史，还应立即轮换，而不是只删除文件。

## 十、测试与后续计划

目前项目包含：

- 25 个前端纯函数测试
- 31 个后端 pytest 测试
- ESLint 与 TypeScript 类型检查

后端覆盖邮箱验证码、OAuth 回调、Session 过期、Todo CRUD、用户隔离、参数校验和 Origin 校验等场景。

后续如果继续迭代，我会优先考虑：

- 为 Todo 增加分页或服务端排序策略
- 增加更完整的限流与审计日志
- 数据量增长后迁移到 PostgreSQL
- 补充原生端关键交互的自动化测试

完整代码、配置模板和部署脚本都在 GitHub：

**[https://github.com/chengheai1/native-demo](https://github.com/chengheai1/native-demo)**

如果这篇文章对你有帮助，欢迎 Star、评论交流，也欢迎指出代码里还能改进的地方。
