# Social Network Frontend App

> Web PWA built with Angular 19 + Ionic 8. Modular, lazy-loaded, with a custom static i18n system (EN/ES), 8 HTTP interceptors, and Capacitor for iOS/Android distribution.

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
ng serve
```

## Modules

| Module | Role |
|---|---|
| `AuthModule` | Login, register, password reset, Google OAuth |
| `PagesModule` | All main app pages (lazy-loaded) |
| `AdminModule` | Admin panel (lazy-loaded) |
| `SharedModule` | Pipes, directives, reusable components |

All route modules use lazy loading.

## HTTP Interceptors (8 — do not bypass or reorder)

`AuthInterceptor` · `DeduplicationInterceptor` · `CacheInterceptor` · `TimeoutInterceptor` · `SafariIOSErrorInterceptor` · `GoogleImageErrorInterceptor` · `Silent404Interceptor` · `ExternalServiceErrorInterceptor`

Full details: [docs/interceptors.md](./docs/interceptors.md)

## Translation System

Custom static system — NOT ngx-translate.

```html
{{ 'key.subkey' | workyTranslations }}
{{ 'key' | workyTranslations: { type: 'quantity', count: n } }}
{{ 'key' | workyTranslations: { type: 'arguments', args: [v1, v2] } }}
```

Always add keys to both `translations.en.ts` and `translations.es.ts`.

Full reference: [docs/i18n.md](./docs/i18n.md)

## Caching

`UnifiedCacheService` — memory → session → local storage, max 200 entries.

TTLs: user 10min · publication 3min · notification 1min · config 30min · friends 5min · thematic-images 60min

## Build & Mobile

```bash
ng build --configuration production   # web build
npm run ionic:build                   # Ionic build
npm run ios:clean && npx cap run ios  # iOS via Capacitor
npm run mobile:build                  # Android
```

## Docs

- [Interceptors](./docs/interceptors.md) — each interceptor's purpose and behavior
- [i18n System](./docs/i18n.md) — translation keys, namespaces, pluralization, dynamic strings
