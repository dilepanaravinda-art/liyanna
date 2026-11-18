/** Shared fail-closed consent and expiry validation for integration deliveries. */
export function isActiveDeliveryConnection(connection, enabled) {
  if (!connection || connection.status !== 'active' || !connection.consented_at || connection.revoked_at || enabled !== true || connection.requires_approval === true) return false;
  const consentTime = Date.parse(connection.consented_at);
  if (!Number.isFinite(consentTime) || consentTime > Date.now()) return false;
  if (connection.expires_at != null) {
    const expiresAt = Date.parse(connection.expires_at);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;
  }
  return true;
}
