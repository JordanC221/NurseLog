# Operations and Rollback

## Backups

Stop the API. Copy the SQLite database and private upload directory into one dated backup folder. Also back up environment configuration separately without emailing or committing secrets.

## Restore

Stop the API. Restore the database and upload directory together. Run `npm run db:migrate`, start the API, and verify `/api/health`.

## Rollback

Keep the previous Git commit/tag and previous database/upload backup. Restore code and compatible database backup only together. Do not merge migration and old production database changes.

## Release blockers

- Hosted PostgreSQL and S3-compatible storage
- Production email provider
- OpenAI/provider configuration
- Stripe test webhook verification
- Real PWA devices and HTTPS deployment
- Privacy/terms legal review
- Clinical use review
