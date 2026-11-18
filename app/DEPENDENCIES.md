# Dependency and License Inventory

The app uses React/Vite, Express, `better-sqlite3`, authentication/security middleware, Multer for uploads, PDF/Office parsers, `otplib` for TOTP, optional real-provider Stripe/AI adapters, and Vite PWA/Workbox for service-worker generation. Preserve upstream licenses/notices and review redistribution rights for uploaded course materials before release.

## Current audit result

Refreshed against `app/package-lock.json` on 2026-11-18:

- `npm audit`: **0 vulnerabilities**.
- `npm audit --omit=dev`: **0 vulnerabilities**.
- `npm run build`, including Workbox service-worker generation, passed after the dependency updates.

The earlier `DEPENDENCIES.md` report of **7 high and 3 moderate** findings was stale and its claim that all 10 were production findings was incorrect. The production-only audit returned zero findings. That earlier count cannot be reproduced from the current lockfile; subsequent lockfile updates superseded it. The current lockfile had a temporary Workbox chain of one high and three moderate findings during this review; all were addressed below. There are no unresolved npm audit findings in the checked lockfile.

## Findings addressed during this review

| Affected package and dependency path | Severity/advisory | Actual exposure | Resolution and breaking-change assessment |
|---|---|---|---|
| `vite-plugin-pwa@1.1.0` → `workbox-build@7.3.0` → `@rollup/plugin-terser@0.4.4` → `serialize-javascript@6.0.2` | High; serialize-javascript advisories GHSA-5c6j-r48x-rmvq, GHSA-qj8w-gfj5-8c6v, GHSA-m5mm-p8h7-m29v | Build-time PWA/service-worker minification; not the deployed Express request path. | Updated Workbox within its declared `^7.3.0` range; the resolved chain uses Workbox 7.4.1 and the patched terser/serializer chain. No application API change; PWA production build was rerun. |
| `vite-plugin-pwa@1.1.0` → `workbox-build` → `glob` | Moderate; GHSA-3g3m-2fjr-6pw4 (glob versions through 14.0.1) | Workbox build-time file matching; not runtime user input processing. | Scoped npm overrides resolve glob 14.0.4. This crosses Workbox's declared glob major range, so it is an intentional transitive override; the `globSync` API used by Workbox remains available and the PWA build passed. Revisit when upstream updates its range. |
| `vite-plugin-pwa@1.1.0` → `workbox-build` → `glob` → `minimatch` | Moderate; GHSA-g3hv-75wg-m249 (minimatch before 11.0.1) | Same Workbox build-time glob-matching path. | Scoped override resolves minimatch 11.0.8. This crosses the transitive range and should be removed when Workbox's dependency range is patched; build passed with the override. |
| `vite-plugin-pwa@1.1.0` → `workbox-build` | Moderate finding inherited from vulnerable `glob` above | PWA/service-worker generation only; no production API handling. | Resolved by Workbox 7.4.1 plus the scoped glob/minimatch overrides. The generated service worker was rebuilt successfully. |

These updates do **not** make the app production-ready. They only clear the current npm advisory database findings. They do not replace security review, secret handling, provider configuration, hosting hardening, backup/restore drills, or verification of the signed-in service worker behavior.

## Adapter and runtime notes

- **AI:** the adapter calls a configurable OpenAI-compatible provider only when credentials/model configuration are supplied. Without them it returns unavailable; it does not fabricate generated study content. Real provider behavior has not been exercised.
- **Stripe:** the adapter makes real Stripe calls only with appropriate Stripe credentials, configured price, and signed webhook. There is no simulated payment success. Live payments are not enabled.
- **Email/OAuth/SMS:** providers are not configured. Development verification tokens are local-only; no email is sent.
- **Local storage:** SQLite and private local file storage are implemented. PostgreSQL and S3-compatible storage are not implemented. See [START_HERE.md](./START_HERE.md) for what a durable single-instance deployment requires.
- **Service worker:** API traffic uses `NetworkOnly`, preventing Workbox runtime caching of account/API responses. Static app shell assets are precached. Physical-device installation and cross-account PWA behavior were not tested.

## Reproducible checks

From `app/`:

```text
npm audit
npm audit --omit=dev
npm ls workbox-build glob minimatch @rollup/plugin-terser serialize-javascript --all
npm run build
```

The PWA toolchain remains development/build tooling even though its generated service worker ships with the web client. Do not interpret “0 audit findings” as a broad security or production-readiness certification.
