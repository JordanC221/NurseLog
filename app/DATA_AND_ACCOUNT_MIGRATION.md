# Data and Account Migration

No live database export or uploaded files were present in the source archive. No historical records or files were migrated.

## Account claims

Base44 passwords, sessions, OAuth grants, and MFA enrollments cannot be transferred. Create new independent accounts through registration. Do not allow claim-by-email. Imported records must be linked only after verified ownership.

## Entity coverage

The independent `records` table stores all entity types with an entity discriminator and server-enforced `user_id`. The migration schema covers users, sessions, settings, study records, clinical records, files, generation usage, and billing entitlement.

## Later export import

An import tool should validate shape and limits, support `--dry-run`, map old IDs to new IDs, preserve dates and relationships, insert in dependency order, report imported/skipped/failed counts, and be retry-safe without printing private record content.

## Required exports from Base44

Obtain from the Base44 account/project owner, using the platform's export/admin tools:

- An entity-by-entity JSON or CSV export for users, skill logs, clinical hours, requirements/checklists, settings, schedules, study sets, flashcards, exam questions/responses/attempts, case studies, and study materials metadata.
- Uploaded files as original content, together with the material/file ID mapping.
- Schema/export documentation and the exact entity field names, timestamps, IDs, and relationship fields.
- The account-to-record ownership mapping; only verify and associate users through your independent account process.
- Theme/settings or app configuration exports if visual or default behavior must be preserved.
- Any export or audit log needed to prove dates and signature state.

Never export or ask for user passwords or MFA secrets. Revoke old sessions where appropriate and require users to register anew or use a separately designed ownership-verification/claim flow.

## Existing tools

The independent migration schema exists, and the generic entity API can create owned records. No relationship-preserving Base44 export parser, file importer, ID mapper, dry-run verifier, or historical import CLI exists yet.

## Existing users

Existing users cannot regain the old account credentials through this migration. They must create a new independent account. Passwords, Base44 sessions, OAuth grants, and MFA secrets cannot be transferred or reconstructed. If they claim imported records, ownership must be verified separately before attaching records; do not implement claim-by-email alone.
