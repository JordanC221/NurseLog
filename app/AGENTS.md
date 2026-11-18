# Agent and Developer Instructions

This repository is an independent NurseLog product migration.

- Preserve existing React/Vite components and routes.
- Keep Base44 SDK, plugins, domains, app identifiers, and hosted assets out of runtime code.
- Use `src/api/client.js` for API calls.
- Implement authorization on every API route; UI checks are not access control.
- Add migrations for schema changes.
- Keep private files outside the public web directory.
- Never add real patient data to fixtures or send it to AI providers.
- Run `npm test`, `npm run lint`, and `npm run build` before committing.
- Historical migration notes may mention Base44, but active setup and runtime code must not depend on it.
