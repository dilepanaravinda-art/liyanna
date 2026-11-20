/** Provider-neutral server orchestration. Instantiate only in trusted server code.
 * Authentication, ownership verification, persistence and transport are injected;
 * no browser-provided owner flags or connection grants are trusted.
 */
import { authorizeConnectionManagement, authorizeIntegrationCapability, type IntegrationConnection, type IntegrationPrincipal } from './connection-policy';
import { nextConnectionStatus, type ConnectionEvent } from './connection-state';
import { ProviderRegistry } from './registry';

export type StoredConnection = IntegrationConnection & { version: number };
export type AuditEvent = {
  connectionId: string; tenantId: string; businessId: string;
  actorId: string; action: string; outcome: 'approved' | 'denied'; at: string;
};
export interface IntegrationStore {
  /** Must resolve owner membership from authoritative server-side records. */
  resolvePrincipal(userId: string, businessId: string): Promise<IntegrationPrincipal | null>;
  getConnection(connectionId: string): Promise<StoredConnection | null>;
  /** Atomic compare-and-swap; must reject stale version and write audit in same transaction. */
  transition(input: { connectionId: string; expectedVersion: number; nextStatus: IntegrationConnection['status']; actorId: string; at: string }): Promise<boolean>;
  appendAudit(event: AuditEvent): Promise<void>;
  /** Must return only enabled, non-revoked capabilities from authoritative storage. */
  getGrantedCapabilities(connectionId: string): Promise<readonly { name: string; requiresApproval: boolean }[]>;
  /** Must verify a single-use approval against authoritative storage, never a client flag. */
  verifyActionApproval(connectionId: string, capability: string, approvalId: string | undefined): Promise<boolean>;
}
export type CapabilityExecutor = (input: { connectionId: string; providerId: string; capability: string; payload: unknown; idempotencyKey: string }) => Promise<unknown>;

export class IntegrationService {
  constructor(private readonly store: IntegrationStore, private readonly registry: ProviderRegistry, private readonly execute: CapabilityExecutor) {}

  private async scope(userId: string, businessId: string, connectionId: string) {
    const principal = await this.store.resolvePrincipal(userId, businessId);
    const connection = await this.store.getConnection(connectionId);
    if (!principal || !connection || principal.businessId !== businessId || principal.tenantId !== connection.tenantId || connection.businessId !== businessId)
      throw new Error('Connection unavailable');
    return { principal, connection };
  }

  async changeStatus(input: { userId: string; businessId: string; connectionId: string; event: ConnectionEvent }) {
    const { principal, connection } = await this.scope(input.userId, input.businessId, input.connectionId);
    if (!principal.isVerifiedOwner) throw new Error('Verified owner required');
    // The connection policy intentionally disallows pending/revoked management;
    // activation uses the state machine and requires owner consent on the stored record.
    if (input.event !== 'activate' && input.event !== 'revoke')
      authorizeConnectionManagement(principal, connection, 'change-permissions');
    const status = nextConnectionStatus(connection, input.event);
    const success = await this.store.transition({ connectionId: connection.id, expectedVersion: connection.version, nextStatus: status, actorId: principal.userId, at: new Date().toISOString() });
    if (!success) throw new Error('Connection changed concurrently; retry after refreshing');
    return { status };
  }

  async invoke(input: { userId: string; businessId: string; connectionId: string; capability: string; payload: unknown; idempotencyKey: string; approvalId?: string }) {
    if (!/^[a-zA-Z0-9_-]{16,128}$/.test(input.idempotencyKey)) throw new Error('Invalid idempotency key');
    const { principal, connection } = await this.scope(input.userId, input.businessId, input.connectionId);
    const manifest = this.registry.get(connection.providerId);
    const definition = manifest?.capabilities.find(c => c.name === input.capability);
    if (!definition) throw new Error('Unsupported provider capability');
    const granted = (await this.store.getGrantedCapabilities(connection.id)).find(g => g.name === input.capability);
    if (!granted) throw new Error('Capability not granted');
    const requiresApproval = definition.requiresApproval || granted.requiresApproval;
    const approved = requiresApproval && !!input.approvalId
      ? await this.store.verifyActionApproval(connection.id, input.capability, input.approvalId) : false;
    authorizeIntegrationCapability(principal, { ...connection, allowedCapabilities: [granted.name] }, input.capability, requiresApproval, approved);
    // The executor must independently enforce idempotency and use server-held credentials.
    return this.execute({ connectionId: connection.id, providerId: connection.providerId, capability: input.capability, payload: input.payload, idempotencyKey: input.idempotencyKey });
  }
}
