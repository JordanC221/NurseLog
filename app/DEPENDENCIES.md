# Dependency and License Inventory

Run `npm run build` and `npm audit --omit=dev` to refresh dependency/security reports. The frontend package-lock and npm dependency tree define exact versions.

Major categories:

- React/Vite UI and Radix/Tailwind components
- Express/auth/bcrypt/cookie/helmet/rate-limit
- better-sqlite3 local development database
- Multer local upload handling
- otplib TOTP MFA
- Stripe test/production adapter
- OpenAI HTTP provider integration
- vite-plugin-pwa/Workbox service worker
- jsPDF, html2canvas, and chart/report utilities

License and provenance review is required before distribution. Original third-party notices must be retained. The migration does not claim ownership or redistribution rights for uploaded lecture materials or generated components.

## Dependency audit status

Checked 2026-11-18 with `npm audit --omit=dev`:

- 10 production findings remain: 7 high and 3 moderate.
- The critical DOMPurify, 13 additional high findings, and Zod finding found by the initial audit were addressed by upgrading/removing compatible direct dependencies and installing patched jsPDF support.
- Remaining production findings are chiefly Tailwind 3 tooling chains and transitive build/process packages (`tailwindcss`, `chokidar`, `fast-glob`, `micromatch`, `picomatch`, `readdirp`, `anymatch`, plus `glob`/`minimatch`/`sucrase`). They affect build and development tooling, not a directly imported application runtime package.
- Tailwind 4 would require a configuration/migration and was not applied because this pass prioritizes fidelity and reversibility.
- npm also reported a `vite-plugin-pwa`/Workbox transitive chain, but no production runtime API is cached by it; API routes remain `NetworkOnly`.
- `npm audit fix --force` proposes Tailwind 4 or PWA 0.20 major/downgrade changes and was not applied without compatibility testing.

This is a dependency status report, not a production-readiness claim. Upgrade each remaining tooling chain on a separate verified change, run the build/PWA checks, and rerun the audit.

## Reassessment of remaining findings

`npm audit --omit=dev` currently reports 10 findings: 7 high and 3 moderate.

| Affected package/path | Exposure | Available fix | Breaking change |
|---|---|---|---|
| `tailwindcss@3.4.19` → `chokidar@3.6.0` → `readdirp@3.6.0` → `picomatch@2.3.2` | CSS/build tooling only | Tailwind 4.3.5 | Yes; Tailwind 3 configuration/build migration |
| `tailwindcss@3.4.19` → `fast-glob@3.3.3` → `micromatch@4.0.8` → `picomatch@2.3.2` | CSS/build tooling only | Tailwind 4.3.5 | Yes |
| `tailwindcss@3.4.19` → `chokidar`/`fast-glob`/`micromatch`/`readdirp`/`anymatch` | Development and build tooling | Tailwind 4.3.5 or transitive-tool upgrades | Tailwind fix is breaking |
| `vite`/`vite-plugin-pwa`/`workbox-build` → `tinyglobby@0.2.17`/`sucrase@3.35.0` → `glob@11/10`/`minimatch@...`/`picomatch@4.0.7` | Build/PWA-generation tooling | Available audit fixes include PWA-major changes; package updates may require compatibility testing | PWA downgrade/major suggestion is not safe to apply automatically |
| `picomatch@4.0.7` / `picomatch@2.3.2` | ReDoS in file-glob tooling | Tailwind/Vite/PWA tooling upgrades | Potentially via major tooling upgrades |

No finding directly flags the independent Express, SQLite, authentication, extraction, or private-file runtime paths. The claims in this table should not be read as a production security clearance: build-tool advisories remain unresolved, and Tailwind/PWA major upgrades were withheld because they require separate compatibility testing.
