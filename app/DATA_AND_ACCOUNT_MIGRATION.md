# Data and Account Migration

No live database export or uploaded files were present in the source archive. No historical records or files were migrated.

## Account claims

Base44 passwords, sessions, OAuth grants, and MFA enrollments cannot be transferred. Create new independent accounts through registration. Do not allow claim-by-email. Imported records must be linked only after verified ownership.

## Entity coverage

The independent `records` table stores all entity types with an entity discriminator and server-enforced `user_id`. The migration schema covers users, sessions, settings, study records, clinical records, files, generation usage, and billing entitlement.

## Later export import

An import tool should validate shape and limits, support `--dry-run`, map old IDs to new IDs, preserve dates and relationships, insert in dependency order, report imported/skipped/failed counts, and be retry-safe without printing private record content.
