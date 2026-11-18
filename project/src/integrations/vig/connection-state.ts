/** Pure state transition validation. Persistence and identity checks must be enforced server-side. */
import type { IntegrationConnection } from "./connection-policy";
export type ConnectionEvent = "activate" | "suspend" | "resume" | "revoke";
const transitions: Record<ConnectionEvent, readonly IntegrationConnection["status"][]> = {
  activate: ["pending"], suspend: ["active"], resume: ["suspended"], revoke: ["pending", "active", "suspended"],
};
export function nextConnectionStatus(connection: IntegrationConnection, event: ConnectionEvent, now = new Date()): IntegrationConnection["status"] {
  if (!transitions[event].includes(connection.status) || connection.revokedAt) throw new Error("Invalid connection transition");
  if (event !== "revoke" && connection.expiresAt && (!Number.isFinite(Date.parse(connection.expiresAt)) || Date.parse(connection.expiresAt) <= now.getTime())) throw new Error("Consent expired");
  if (event === "activate" || event === "resume") {
    if (!connection.consentedBy || !Number.isFinite(Date.parse(connection.consentedAt))) throw new Error("Verified consent required");
  }
  return { activate: "active", suspend: "suspended", resume: "active", revoke: "revoked" }[event] as IntegrationConnection["status"];
}
