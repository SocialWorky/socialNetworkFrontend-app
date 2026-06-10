# Social Network Frontend App (Worky)

> Web PWA built with Angular 19 + Ionic 8. Modular, lazy-loaded, with a custom static i18n system (EN/ES), 8 HTTP interceptors, multi-layer caching, and Capacitor for iOS/Android distribution.

Part of the **Worky** platform (5 NestJS microservices + this frontend + a React Native app). Full system overview: [doc-dev/infrastructure/architecture-analysis.md](../doc-dev/infrastructure/architecture-analysis.md).

## Stack

| | |
|---|---|
| Runtime | Node.js 22 |
| Framework | Angular 19 + Ionic 8 |
| UI Library | Angular Material 19 |
| Auth | Google OAuth2 + JWT |
| State | RxJS BehaviorSubject / Signals (no NgRx) |
| Real-time | Socket.io via `ngx-socket-io` |
| Mobile Bridge | Capacitor 7 (iOS + Android) |
| i18n | Custom static system — EN + ES |
| Port | 4200 |

## Quick Start

```bash
npm install
npm start          # ng serve → http://localhost:4200
```

- Config comes from `.env` (`NG_APP_*` vars, injected into `src/environments/`). The frontend talks to the backend services on ports **3000** (API), **3003** (messages), **3005** (files), **3010/3011** (notifications/socket), **3013** (geo) — run those locally too.
- Version & changelog live in [`src/app-version.config.ts`](./src/app-version.config.ts) (bump on every release — minor for features, patch for fixes).

## Architecture & Conventions

- **State**: RxJS `BehaviorSubject` / signals — NgRx is **not** used and must not be added.
- **Modules** (all routes lazy-loaded): `AuthModule`, `PagesModule`, `AdminModule`, `SharedModule`.
- **Forms**: Reactive Forms only. **HTTP**: only through Angular services. `ChangeDetectionStrategy.OnPush` where possible.
- Full rules: [angular19-conventions.md](../.claude/rules/angular19-conventions.md) · project-wide rules in [CLAUDE.md](../CLAUDE.md).

## HTTP Interceptors (8 — do not bypass or reorder)

`AuthInterceptor` · `DeduplicationInterceptor` · `CacheInterceptor` · `TimeoutInterceptor` · `SafariIOSErrorInterceptor` · `GoogleImageErrorInterceptor` · `Silent404Interceptor` · `ExternalServiceErrorInterceptor`

→ [docs/interceptors.md](./docs/interceptors.md)

## Translation System

Custom static system — **NOT** ngx-translate. Always add keys to **both** `src/translations/translations.en.ts` **and** `translations.es.ts`.

```html
{{ 'key.subkey' | workyTranslations }}
{{ 'key' | workyTranslations:'quantity':n }}        <!-- needs key_one + key_other in both files -->
{{ 'key' | workyTranslations:'arguments':v1:v2 }}   <!-- placeholders in the string: {0}, {1}, … -->
```

The object form (`{ type, args }`) does **not** work — the pipe signature is `transform(value, type?, ...args)`. → [docs/i18n.md](./docs/i18n.md)

## Caching

`UnifiedCacheService` — memory → session → local storage, max 200 entries.
TTLs: user 10min · publication 3min · notification 1min · config 30min · friends 5min · thematic-images 60min.

→ [docs/cache-system.md](./docs/cache-system.md) · [docs/cache-interceptor.md](./docs/cache-interceptor.md)

## PWA & Mobile

- **Install banner**: prompts install when not already installed (detects standalone on iOS + Android); logo/name from env vars. Service: `pwa-install.service.ts`, component: `pwa-install-banner`.
- **Safe-area / full-screen**: `black-translucent` + `viewport-fit=cover` + `env(safe-area-inset-*)`; reserve the inset once per axis. → [doc-dev/worky-frontend/safe-area-implementation.md](../doc-dev/worky-frontend/safe-area-implementation.md)

```bash
npm run build:prod                    # production web build (PWA + manifest)
npm run ionic:build                   # Ionic build
npm run ios:clean && npx cap run ios  # iOS via Capacitor
npm run mobile:build                  # Android via Capacitor
```

## Documentation

| Topic | Doc |
|---|---|
| HTTP interceptors | [docs/interceptors.md](./docs/interceptors.md) |
| i18n / translations | [docs/i18n.md](./docs/i18n.md) |
| Caching (service + interceptor) | [docs/cache-system.md](./docs/cache-system.md) · [docs/cache-interceptor.md](./docs/cache-interceptor.md) |
| Async pipe patterns | [docs/async-pipe-guide.md](./docs/async-pipe-guide.md) |
| Alerts / snackbar / tooltips | [docs/alert-services.md](./docs/alert-services.md) · [docs/snackbar-service.md](./docs/snackbar-service.md) · [docs/tooltips-onboarding-service.md](./docs/tooltips-onboarding-service.md) |
| Logging | [docs/log-service.md](./docs/log-service.md) · [docs/log-module-improvements.md](./docs/log-module-improvements.md) |
| Utility service | [docs/utility-service.md](./docs/utility-service.md) |
| Components | [docs/component/](./docs/component/) |
| Safe-area / PWA full-screen | [doc-dev/worky-frontend/safe-area-implementation.md](../doc-dev/worky-frontend/safe-area-implementation.md) |
| Platform architecture | [doc-dev/infrastructure/architecture-analysis.md](../doc-dev/infrastructure/architecture-analysis.md) |
| Angular conventions | [.claude/rules/angular19-conventions.md](../.claude/rules/angular19-conventions.md) |
