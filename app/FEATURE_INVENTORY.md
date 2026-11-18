# Feature Inventory

## Fully implemented in source

- Independent login, registration, logout, session expiry, verification, reset, TOTP, and account deletion
- Clinical skill logs and details
- Active/completed hours and dashboard totals
- Clinical requirements/checklists
- Schedule and calendar export
- Dashboard/report views
- App settings and themes
- Study sets, flashcards, matching, exams, and case studies
- Study material upload UI
- Individual study-response persistence hooks
- PWA manifest/service worker
- Free/Paid Study entitlement fields and Stripe checkout/webhook scaffolding

## Partial

- Production email delivery is not implemented.
- A focused NurseLog MFA settings screen remains to be added to the routes.
- File processing validates ownership/type/size but full DOCX/PPT/PDF extraction is pending.
- AI supports OpenAI-compatible JSON responses and malformed-output rejection.
- Stripe needs sandbox credentials and end-to-end event testing.
- No historical database export or uploaded files were available.

## Pending

- PostgreSQL/S3 production adapters
- Production email provider
- DOCX/PPT/PDF extraction
- Verified relationship-preserving historical import tooling
- Real PWA installation verification
- iOS/Android/desktop packaging
- Legal review of privacy/terms and clinical use
