/** Pure, fail-closed integration authorization policy.
 * Server callers MUST load grants from a trusted store, authenticate the principal,
 * verify current owner membership, and enforce this decision before any network call.
 */
export type IntegrationPrincipal = {
  userId: string;
  tenantId: string;
  businessId: string;
  isVerifiedOwner: boolean;
};
export type IntegrationConnection = {
  id: string;
  tenantId: string;
  businessId: string;
  providerId: string;
  status: "pending" | "active" | "suspended" | "revoked";
  allowedCapabilities: readonly string[];
  consentedBy: string;
  consentedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
};
export type IntegrationAction = "connect" | "disconnect" | "change-permissions";
export function authorizeConnectionManagement(
  principal: IntegrationPrincipal,
  connection: IntegrationConnection,
  action: IntegrationAction,
  now: Date = new Date(),
): void {
  if (!principal.userId || !principal.isVerifiedOwner) throw new Error("Verified owner required");
  if (principal.tenantId !== connection.tenantId || principal.businessId !== connection.businessId)
    throw new Error("Business scope mismatch");
  if (connection.revokedAt || connection.status === "revoked") throw new Error("Connection revoked");
  if (connection.expiresAt && (!Number.isFinite(Date.parse(connection.expiresAt)) || Date.parse(connection.expiresAt) <= now.getTime()))
    throw new Error("Consent expired");
  if (action === "connect" && connection.status !== "pending") throw new Error("Connection not pending");
  if (action !== "connect" && connection.status !== "active" && connection.status !== "suspended")
    throw new Error("Connection not manageable");
}
export function authorizeIntegrationCapability(
  principal: IntegrationPrincipal,
  connection: IntegrationConnection,
  capability: string,
  requiresApproval: boolean,
  hasServerVerifiedApproval: boolean,
  now: Date = new Date(),
): void {
  if (!principal.userId || principal.tenantId !== connection.tenantId || principal.businessId !== connection.businessId)
    throw new Error("Unauthorized business scope");
  if (connection.status !== "active" || connection.revokedAt) throw new Error("Connection inactive");
  if (!connection.consentedBy || !Number.isFinite(Date.parse(connection.consentedAt))) throw new Error("Owner consent missing");
  if (connection.expiresAt && (!Number.isFinite(Date.parse(connection.expiresAt)) || Date.parse(connection.expiresAt) <= now.getTime()))
    throw new Error("Consent expired");
  if (!connection.allowedCapabilities.includes(capability)) throw new Error("Capability not granted");
  if (requiresApproval && !hasServerVerifiedApproval) throw new Error("Approved action required");
}
