# START HERE

This version runs without Base44. Use fictional information only; do not enter real patient identifiers or clinical records.

## What works without paid accounts

- React/Vite web interface and Express API.
- Independent registration/login, signed sessions, and account-scoped SQLite records/private uploads.
- Clinical skills and hours timers, including server-side signature locks and timer overlap checks.
- PDF/DOCX/PPTX/TXT/MD/CSV text extraction with explicit rejection of unreadable or unsupported files.
- Flashcards and quizzes using records already in a study set; responses and exam progress are saved.
- No historical Base44 records are included in the ZIP.

AI, OAuth, SMS/email delivery, and Stripe are **not simulated**. Real provider operations remain unavailable until configured. The dependency details and current audit result are in [DEPENDENCIES.md](./DEPENDENCIES.md); source-vs-runtime feature status is in [FEATURE_INVENTORY.md](./FEATURE_INVENTORY.md).

## Review on Windows with one double-click

Prerequisites: Windows 10/11, Node.js 20 or newer, and internet access for the first dependency install. This starts the app on your Windows computer, not in the coding environment.

1. Extract/download the repository to a normal folder, for example `C:\NurseLog`.
2. Install Node.js LTS from [nodejs.org](https://nodejs.org/) if it is not already installed.
3. Open PowerShell in `C:\NurseLog\app` and run `npm install` once. The review server migrates only its isolated demo database when it starts; no `.env` file or paid credentials are needed.
4. After setup completes, double-click `C:\NurseLog\app\scripts\start-review.bat`.
5. Wait for the browser to open at `http://localhost:5173`, then register a fictional account. The local verification token is shown on screen; no email is sent.
6. To stop the app, close the launcher window. It stops the API and web server it started.

The review launcher always uses fresh isolated demo data in `app\data\review-demo` and `app\app-storage-review`; it does not open or modify the regular `app\data\nurselog.sqlite`. Re-running registration with the same email may require removing that demo database after stopping the launcher.

For regular development instead, `scripts/start.ps1` uses the default `data` and `app-storage` paths. The general-purpose `scripts/setup.ps1` also migrates the default database; do not run it if you need to leave an existing default database untouched. Do not mix review data with real records.

## Private coding-environment preview

The Codespaces preview is hosted in the coding environment, not on your Windows computer. The current preview is:

**[Open the private NurseLog preview](https://bug-free-tribble-xr4g59rppwrxhvqr9-5173.app.github.dev)**

Port 5173 is configured as **private**. Open it while signed into the GitHub account that has access to this Codespace; an unauthenticated request is redirected to GitHub access control. The Vite server proxies `/api` to the private API on port 3001. This preview uses the isolated `app/data/codespace-review-demo` database and `app/app-storage-review-codespace` files, not `app/data/nurselog.sqlite`. It is temporary and is not a public deployment; use the Windows launcher above for an independent local review.

## Create an account and use unavailable integrations honestly

Register with an email-shaped username and a password of at least 10 characters. Development verification displays a local token; it does not deliver email. Password reset/verification email, Google sign-in, and SMS MFA need real provider setup.

- **AI:** configure `OPENAI_API_KEY`, `AI_MODEL`, and optionally `AI_BASE_URL` in the API environment to enable the real OpenAI-compatible provider. No key means study/case generation reports unavailable and creates no generated study content. Real provider output has not been tested for this review.
- **Study material:** supported text-bearing PDF, DOCX, PPTX, TXT, MD, and CSV are extracted locally. Scanned/image-only PDFs, photos/OCR, embedded images, and PowerPoint speaker notes are not extracted. Unsupported or empty extraction is an error, not a basis for guessed study content.
- **Stripe:** no live payment is enabled. Checkout/webhook handling requires real Stripe keys, a configured price and signed webhook. No success is simulated.
- **Email:** no delivery provider is configured, so development tokens are local-only.

## Data locations, persistence, and backup

By default, the API stores SQLite at `app\data\nurselog.sqlite` and private uploads under `app\app-storage`. The review launcher uses the separate paths above. Data persists across browser refreshes and local app restarts while those directories remain; no automatic cloud backup is included.

To back up or restore: stop the API/launcher first; copy the matching SQLite database and its storage directory together to a dated, access-controlled backup; to restore, stop the API and replace both from the same backup before restarting. Never commit or email these folders. No migration/import tool for historical Base44 records is currently provided.

SQLite plus private local files are adequate for personal review and can support a small, single-instance private beta **only on hosting with a durable private disk and a backup/restore plan**. Ephemeral hosting disks lose data on restart/redeploy; multiple app replicas do not share local SQLite/files. PostgreSQL and S3-compatible storage are not implemented and are not prerequisites for a local review. They would require additional storage adapters, migrations, deployment configuration, and tests if a multi-instance hosted deployment needs them.

## Historical Base44 records and account access

The supplied ZIP contains source, not historical user/clinical/study records or uploaded blobs. Before any real-data migration, obtain from Base44:

- Per-user exports for clinical skills/signatures, hours sessions, checklists/requirements, settings, schedule/classes, study materials/sets/cards/questions/responses/attempts/cases, and account identifiers.
- Original uploaded files/blobs, with a mapping to their owning user and material record.
- Stable IDs, ownership, timestamps, deleted/archive state, signature metadata, and parent-child relationships if exports support them.

There is no Base44 data/file importer yet. Do not assume Base44 passwords, sessions, MFA seeds, or recovery codes can be exported or reused. Existing users would need a verified account-claim/reset process and must enroll MFA again. Plan and test a reversible import before touching production data.

## Architecture and release gates

- **Private local review:** requires Node.js and installed dependencies; no paid credentials. Use the review launcher for isolated data.
- **Hosted free beta:** requires HTTPS, private durable storage, restricted access, backups/restore verification, real email delivery and reset flow, an account migration plan, and operational monitoring. SQLite can work only for a single instance with persistent disk; no hosted deployment is configured.
- **Paid subscriptions:** additionally requires configured Stripe test/live environments, webhooks, entitlement and cancellation/error handling, legal/tax review, and successful end-to-end testing. Payments are disabled.
- **Optional/later:** OCR/image-based learning, OAuth/SMS, multiple server replicas, PostgreSQL and object storage are not required for local review. Do not redesign learning/scoring until fidelity review is complete.

## Personal acceptance checklist (fictional data only)

1. Start the review launcher and register, verify, then log in. Confirm no email was claimed to have been sent.
2. Create a fictional skill, add a signature, and confirm the saved record is locked. Do not use a patient name or date of birth.
3. Start a clinical timer, refresh the page, confirm it is still active, then stop/save it. Try a second active timer and confirm it is rejected.
4. Upload the fictional PDF or your own non-sensitive text-bearing document. Confirm extraction errors are explicit. Without an AI key, confirm generation says unavailable rather than showing invented content.
5. Use a fictional saved study set to answer a flashcard and quiz questions. Leave an exam partway through, refresh, resume, finish, and confirm responses/progress remain.
6. Close the launcher, double-click it again, sign back in, and confirm the fictional skill, hours and study progress remain.
7. Log out and confirm protected pages return to login. Use a second fictional account and confirm it cannot see the first account's records/files.
8. Compare all original screens on computer and smartphone: terminology, colors, navigation, spacing, mobile controls, signature pad, upload, dashboard, reports, study/scoring, settings, and account screens. Record any mismatch before requesting redesign.

## Checks actually run for this review

- `npm test`: 13 unit/server checks passed, including account/file isolation, signed record restrictions, active/overlapping timer handling, and extraction edge cases.
- `npm run test:browser`: 1 automated Chromium desktop/mobile-viewport workflow passed for registration/login/logout, a signed clinical record, timer refresh restoration, PDF upload/unavailable AI state, flashcard answer save, exam answer save/resume/completion, and responsive navigation.
- `npm run test:pwa`: production service-worker browser test passed; it verified API responses are not cached across logout/account switching.
- An isolated stop/restart smoke test confirmed a fictional account and saved study attempt survived restarting the API with the same SQLite directory.
- `npm run lint`, `npm run build`, `npm audit`, and `npm audit --omit=dev` passed; both audits report zero findings after compatible PWA-tooling updates. Build emits a non-failing large JavaScript chunk warning.
- `npm run typecheck` is not clean: it reports 75 JavaScript/JSX diagnostics (the committed baseline reported 90); the production build and browser suites pass.
- Not tested: phone installation, physical-device appearance, actual AI/email/OAuth/MFA/SMS/Stripe providers, process restart in the automated browser run, or historical data import.
