# START HERE

This guide is for a beginner setting up the local NurseLog app.

## What runs independently today

- The React interface runs on Vite.
- The API runs on Node.js and Express.
- Data is stored in `data/nurselog.sqlite`.
- Uploaded files are stored in `app-storage`.

No Base44 account or paid service is required for local development. AI and Stripe remain unavailable until you configure test credentials.

## First setup

1. Install Node.js 20 or newer.
2. Open a terminal in this `app` folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. Run `npm run db:migrate`.
6. Run `npm run dev`.
7. Open `http://localhost:5173`.

Windows users can run `scripts/start.ps1` after Node.js is installed.

## Create the first account

Open the app, choose Register, and enter an email/password of at least 10 characters. In local development the verification/reset token is written to the API terminal for testing. Production email delivery is not implemented yet and must use a controlled email provider.

## Stop and update

- Stop local services with `Ctrl+C`.
- Update code, then run `npm install`, `npm run db:migrate`, and `npm run dev`.
- Run `npm run build` before preparing production.

## Backups

Stop the API, copy `data/nurselog.sqlite` and `app-storage` together, and store both copies with the same date. Restore by replacing those locations and restarting.

## Health check

Open `http://localhost:3001/api/health`. It should report `"status":"ok"` and `"independent":true`.

## Common failures

- `better-sqlite3` install failure: update Node.js and rerun `npm install`.
- Port already in use: stop the other process or set `PORT` in `.env`.
- API unavailable: confirm `npm run dev:api` is running.
- AI unavailable: provider configuration is intentionally missing.
- Billing unavailable: leave Stripe unset or configure test-only values.

## Preview location

The preview started from this coding environment is not running directly on your Windows computer. It is available in this Codespaces environment at `http://localhost:5173` if the environment exposes its port to you. The API is `http://localhost:3001`.

On your own Windows computer, use the existing scripts:

1. Install Node.js 20 or newer.
2. Open PowerShell.
3. Run `cd C:\path\to\NurseLog\app`.
4. Run `.\scripts\setup.ps1` if dependencies have not been installed.
5. Run `.\scripts\start.ps1`.
6. Open `http://localhost:5173`.

## Accounts needed later

- Application hosting account
- PostgreSQL provider
- S3-compatible private storage provider
- AI provider
- Email provider
- Optional Stripe account in test mode

No service is purchased or configured automatically.

## AI, material, and payment adapters

- **AI:** real HTTP integration exists for an OpenAI-compatible chat-completions endpoint. Set `OPENAI_API_KEY`, `AI_MODEL`, and optionally `AI_BASE_URL`. Without a key, study/case generation returns HTTP 503 and does not create generated records or usage.
- **Study material extraction:** PDF text, DOCX text, PPTX slide text, TXT/MD/CSV are extracted by the independent server. Scanned/image-only PDFs and photos are not OCR'd; generation is rejected rather than invented. Unsupported formats are reported.
- **Stripe:** a real checkout and signed-webhook adapter exists only when Stripe environment variables are set. Without them, checkout and webhook operations are unavailable. There is no simulated payment success. Test checkout requires Stripe test keys, price ID, webhook secret, and end-to-end webhook testing.
- **Email:** verification and password-reset links are development-console tokens only. Production email delivery is not implemented.

## Fidelity review needed

The original ZIP/source has not been found in this repository. Restore the ZIP or extracted source before feature-by-feature visual comparison. Do not use build success or this inventory as proof that original behavior matches.

## Verification status

Passed automated server checks: health, registration, cross-account record isolation, signed skill immutability, one-active timer, overlap rejection, logout invalidation, private file isolation, and unavailable AI/Stripe responses.

Untested: browser registration/login flows, timer after restart, signature UI restrictions, material upload in a browser, real provider generation, answer/progress persistence, PWA installation, and cross-account browser isolation.

## Computer and smartphone comparison checklist

- Use fictional data only.
- Confirm desktop: route names, sidebar, dashboard, colors, typography, buttons, dialogs, calendar/schedule, reports, and study screens.
- Confirm mobile: navigation, page widths, forms, dialogs, timer controls, signature pad, uploads, and text wrapping.
- Compare login, registration, forgot/reset, account settings, logout, and MFA.
- Create/edit/delete a skill, start/stop a timer, enter clinical hours, sign a record, and try editing/deleting it.
- Upload a text/PDF-style sample, generate study material if configured, answer flashcards/exam/case questions, and restart to confirm persistence.
- Log out, log in as a second fictional account, and confirm no record/file appears.
- Record findings for each original screen and mark preserved, intentionally changed, incomplete, missing, or untested.
