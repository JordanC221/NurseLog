# NurseLog

NurseLog is an independent React/Vite PWA for nursing clinical records and educational study tools.

## Start here

For complete beginner setup, read [START_HERE.md](START_HERE.md).

## Quick local start

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. Run `npm install`.
4. Run `npm run db:migrate`.
5. Run `npm run dev`.
6. Open `http://localhost:5173`.

The API runs on `http://localhost:3001`. SQLite in `data/nurselog.sqlite` is the local development substitute. Production must use a maintained PostgreSQL deployment and private object storage; this repository currently includes the migration schema and local-storage implementation only.

## Commands

- `npm run dev` - start API and web app
- `npm run db:migrate` - apply migrations
- `npm test` - run server tests
- `npm run lint` - lint frontend
- `npm run build` - create production PWA
- `npm start` - serve production API and built PWA

Do not enable live Stripe keys until sandbox testing is complete.
