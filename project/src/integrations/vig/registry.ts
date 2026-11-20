/** Vantoryx Integration Gateway — provider-neutral extension contracts.
 * This module deliberately contains no secrets, network transport or AI dependencies.
 * Only a trusted server may issue/revoke connection grants and execute capabilities.
 */
import { z } from "zod";

const id = z.string().regex(/^[a-z][a-z0-9-]{1,63}$/);
const capability = z.string().regex(/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/);
export const providerManifestSchema = z.object({
  providerId: id,
  displayName: z.string().min(1).max(100),
  contractVersion: z.string().regex(/^\d+\.\d+$/),
  capabilities: z.array(z.object({
    name: capability,
    direction: z.enum(["read", "write", "event"]),
    requiresApproval: z.boolean(),
    description: z.string().min(1).max(240),
  }).strict()).min(1),
}).strict().superRefine((manifest, ctx) => {
  const names = manifest.capabilities.map(c => c.name);
  if (new Set(names).size !== names.length) ctx.addIssue({code:"custom",message:"Duplicate capabilities"});
});
export type ProviderManifest = z.infer<typeof providerManifestSchema>;
export type ConnectionGrant = {
  connectionId: string;
  providerId: string;
  tenantId: string;
  businessId: string;
  enabled: boolean;
  allowedCapabilities: readonly string[];
  approvedByOwner: boolean;
  revokedAt?: string;
};
export type CapabilityRequest = {
  providerId: string;
  tenantId: string;
  businessId: string;
  capability: string;
  approvedAction: boolean;
};

/** Registry stores only vetted manifests. Registration is a trusted deployment action,
 * never performed using arbitrary manifests submitted by end users. */
export class ProviderRegistry {
  private providers = new Map<string, ProviderManifest>();
  register(raw: unknown): ProviderManifest {
    const manifest = providerManifestSchema.parse(raw);
    if (this.providers.has(manifest.providerId)) throw new Error("Provider already registered");
    this.providers.set(manifest.providerId, manifest);
    return manifest;
  }
  list(): ProviderManifest[] { return [...this.providers.values()]; }
  get(providerId: string): ProviderManifest | undefined { return this.providers.get(providerId); }
  authorize(request: CapabilityRequest, grant: ConnectionGrant): void {
    const manifest = this.providers.get(request.providerId);
    if (!manifest) throw new Error("Unknown integration provider");
    if (!grant.enabled || !grant.approvedByOwner || grant.revokedAt)
      throw new Error("Integration not enabled or consent revoked");
    if (grant.providerId !== request.providerId || grant.tenantId !== request.tenantId || grant.businessId !== request.businessId)
      throw new Error("Connection scope mismatch");
    const spec = manifest.capabilities.find(c => c.name === request.capability);
    if (!spec || !grant.allowedCapabilities.includes(request.capability))
      throw new Error("Capability not permitted");
    if (spec.requiresApproval && !request.approvedAction)
      throw new Error("Explicit action approval required");
  }
}

export const finbaseManifest: ProviderManifest = {
  providerId: "finbase", displayName: "FINBASE", contractVersion: "1.0",
  capabilities: [
    {name:"invoice:publish",direction:"write",requiresApproval:true,description:"Submit issued invoices for accounting import"},
    {name:"payment:read",direction:"read",requiresApproval:false,description:"Read reconciled payment status"},
  ],
};
/** Example future product. No LIYANNA core changes needed to register this manifest. */
export const crmManifest: ProviderManifest = {
  providerId: "vantoryx-crm", displayName: "Vantoryx CRM", contractVersion: "1.0",
  capabilities: [
    {name:"opportunity:read",direction:"read",requiresApproval:false,description:"Read linked sales opportunities"},
    {name:"quotation:notify",direction:"event",requiresApproval:false,description:"Publish quotation status changes"},
  ],
};
