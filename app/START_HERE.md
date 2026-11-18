# START HERE

This guide is for a beginner setting up the local NurseLog app.

## What runs locally

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

## Accounts needed later

- Application hosting account
- PostgreSQL provider
- S3-compatible private storage provider
- AI provider
- Email provider
- Optional Stripe account in test mode

No service is purchased or configured automatically.
