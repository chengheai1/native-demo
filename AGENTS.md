This is an Expo/React Native mobile application (Expo SDK 58) backed by a small FastAPI + SQLite service in the same repo. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Layout

- `src/` — the Expo app. Routes live in `src/app/` (every file is a screen), everything else outside it.
- `server/` — FastAPI app (`server/app/`), pytest suite (`server/tests/`), SQLite file (`server/data/app.db`), production script (`server/deploy.sh`).
- `docs/` — screenshots and design notes.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
# App
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
npm test                    # pure-function tests (node --test)
```

```bash
# API
cd server
python3.11 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000
.venv/bin/pytest -q
```

Run lint, typecheck, and `server/.venv/bin/pytest -q` before declaring a task done.

## API contract

- Every `/api/*` JSON response is wrapped: success is `{"code": 200, "data": ..., "message": "success"}`, failure is `{"code": "<snake_case_code>", "data": null, "message": "<中文提示>"}`. The wrapping lives in the `standard_api_response` middleware (`server/app/main.py`). Handlers return plain dicts/lists and raise `ApiError` — never hand-build the envelope.
- 204 responses, 3xx redirects (OAuth start/callback), and non-JSON responses are not wrapped.
- The client unwraps exactly once in `src/api/client.ts` using `unwrapApiResponse` (`src/api/response.ts`). If the envelope changes, update both sides and `src/api/response.test.ts` in the same change.
- Auth: mobile sends `Authorization: Bearer <token>`; the web fallback uses the `xu_session` HttpOnly cookie. The token is kept in `expo-secure-store` (web: `localStorage`) under `xu.session.token` — see `src/lib/storage.ts`.
- API base URL comes from `EXPO_PUBLIC_API_URL`, otherwise derived from the Expo `hostUri` / emulator defaults — see `src/lib/api-url.ts`.

## Backend conventions

- SQLite path from `DATABASE_PATH`, default `server/data/app.db`; WAL mode; schema in `server/app/db.py` via `CREATE TABLE IF NOT EXISTS`. There is no migration framework, so schema edits must stay idempotent for existing databases.
- Settings come from `server/.env` and `server/.env.local` (the latter wins) through `Settings.from_env()` in `server/app/config.py`.
- Sessions store only SHA-256 hashes of bearer tokens; OAuth state and one-time login codes are hashed and time-boxed too. Don't log tokens.
- Timestamps are ISO-8601 UTC strings (`db.iso()`).
- pytest fixtures build a throwaway database (`server/tests/conftest.py`) — tests must never touch `server/data/app.db`.

## Deploying

Production API: `https://app.api.stack021.com` — Cloudflare → host `nginx` → `xu-api` container on `bridge`.

```bash
cd server
./deploy.sh
```

What it does: rsync `app/` + build files to `ubuntu@203.0.113.10:/opt/xu-api` → `docker build` a timestamped image → stop the running container and rename it `xu-api-prev` → start the new one → poll `/api/health` → on success delete `xu-api-prev` and prune old images (last 3); on failure restore `xu-api-prev` automatically.

- Runtime secrets live only in `/opt/xu-api/run.env` (mode 600) on the server. The script reads it, never overwrites it, and derives it from the running container if it is missing. Never commit it or echo it.
- A deploy ships the **working tree**, including uncommitted changes. Commit first; the script labels the image with the git revision (`-dirty` when the tree is dirty).
- The script aborts if `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are missing — production has demo login disabled, so they are required.
- Before switching, it takes a code tarball and a SQLite snapshot into `/opt/xu-api/backups/` (keeps 5), and refuses to continue if the snapshot fails.
- Manual rollback (the previous container is kept until the next successful deploy):
  `ssh ubuntu@203.0.113.10 'docker rm -f xu-api && docker rename xu-api-prev xu-api && docker start xu-api'`
- The script does not touch nginx or TLS. The `app.api.stack021.com` server block and certificate live on the host's `nginx`; change those deliberately, not as part of an app deploy.
- Never deploy dev settings (`ALLOW_DEMO_AUTH=true`, `COOKIE_SECURE=false`) to production.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Building an Android APK

`eas.json` defines two profiles: `preview` (APK, internal distribution) and `production`
(AAB with `autoIncrement`). Both inject `EXPO_PUBLIC_API_URL=https://app.api.stack021.com`
through `env`; `.env.local` is gitignored and never reaches EAS, so the URL must stay here.

```bash
EAS_NO_VCS=1 eas build -p android --profile preview
```

`EAS_NO_VCS=1` is required on this machine: the global eas-cli is an x64 build running under
Rosetta and its `git` probe fails with an xcrun architecture error. On an arm64 Node setup the
flag can be dropped.

Release signing uses a local keystore — `credentials/android/keystore.jks` plus
`credentials.json` (`"credentialsSource": "local"` in eas.json). Both are gitignored. Never
commit them and never lose them: the same keystore is required to update an installed app or
an existing Play listing.

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or add `expo-dev-client` and a `development` profile before building on EAS.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
