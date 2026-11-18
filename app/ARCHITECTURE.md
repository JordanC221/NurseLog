# Architecture

## Selected architecture

The product keeps the existing React/Vite interface and adds a Node.js/Express API. Development uses SQLite and local private-file storage. A single-instance deployment can also use SQLite and a durable private disk; PostgreSQL and S3-compatible storage are optional scaling choices, not prerequisites.

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

SQLite/local storage supports a single application instance on a durable disk but not shared multi-instance production. PostgreSQL and private object storage are alternatives when scaling or managed storage is required.

## Storage implementations

PostgreSQL is **not implemented**. The current code imports SQLite via `better-sqlite3` and executes a SQLite migration; selecting PostgreSQL would require a database adapter, SQL/JSON/transaction changes, migration tooling, and deployment configuration.

S3-compatible storage is **not implemented**. Upload/download routes read and write `app-storage/` using the local filesystem; moving this to S3 would require new upload/download adapters, presigned or proxy access design, metadata compatibility, and backup changes.

The current practical deployment scope is a single Node process, one local disk, and one SQLite file. It supports account sessions and private local files, but not horizontal scaling, managed failover, or independent database/object-store backups. Files and database must be backed up together.
