# Architecture

## Selected architecture

The product keeps the existing React/Vite interface and adds a Node.js/Express API. Development uses SQLite and local private-file storage. Production should use PostgreSQL and S3-compatible storage rather than the development substitutes.

## Separation

- `src/`: React interface and feature workflows
- `server/`: authentication, authorization, data API, uploads, AI, and billing adapters
- `server/migrations/`: versioned schema migrations
- `app-storage/`: private local development file storage

## Auth

The independent API uses HTTP-only cookies, bcrypt password hashes, verification/reset tokens, server sessions, and TOTP MFA. External OAuth is not enabled. Existing Base44 passwords, sessions, OAuth grants, and MFA enrollments do not transfer.

## Data ownership

Every entity record and file belongs to a `user_id`. Authorization is checked in server handlers before reads and mutations.

## Tradeoffs

SQLite/local storage is repeatable for development but not sufficient for multi-instance production. PostgreSQL and private object storage provide concurrency, backups, and independent hosting.
