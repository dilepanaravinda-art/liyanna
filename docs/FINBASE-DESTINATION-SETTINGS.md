# Saved FINBASE review destinations

Each LIYANNA cloud business can have one owner-managed draft destination: company ID, display name, ISO currency code, and income mapping reference. These references are not validated against FINBASE and must not be represented as an authorized connection. The settings do not alter exported invoices or trigger external requests.

The owner must explicitly confirm the references to save. Reads and mutations are verified in PostgreSQL against the actual cloud business owner; a local device role is insufficient. Every save/revocation increments a server revision. Stale writes fail without changing the record or audit. Direct client mutations of settings and audit tables are denied. Owners can select only their business records; staff and outsiders cannot read them.

Migration 20261119100000_finbase_review_destinations.sql depends only on the existing workspace tables, auth.uid() and liyanna_private.scope(). It does not depend on or activate the optional commercial/integration-worker migrations. Test it in isolation first; do not apply every historical migration as part of this feature.

The new RPC is liyanna_finbase_destination with read/save/revoke actions. Successful responses always carry postingAuthorized=false. Revocation changes stored draft status only; previously downloaded files and any manually entered FINBASE data are unaffected. Re-saving after revocation requires a fresh confirmation and the latest revision.

Settings and audit entries live in separate cloud tables and are not included in device workspace JSON backups. Retain normal database backup coverage. No credentials are accepted as configuration fields.

Automated validation uses isolated PostgreSQL through PGlite with owner/staff/outsider/anonymous roles. Browser acceptance uses synthetic authentication and RPC fixtures. Actual-account end-to-end acceptance remains a release gate, even after the additive database migration and protected preview deployment succeed.
