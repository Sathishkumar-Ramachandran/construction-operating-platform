import { z } from "zod";

export const createResourceRequestSchema = z.object({
  projectId: z.uuid(),
  siteId: z.uuid().optional().or(z.literal("")),
  // Materials must come from the ERP catalog, never free text — the
  // service resolves name/unit from this id (see erp-master-data-service's
  // Material and stock-service.ts).
  materialId: z.uuid(),
  quantity: z.coerce.number().positive(),
  // Chosen at request-creation time (not decision time — see
  // ProjectResourceRequest.fulfillmentWarehouseId's doc comment in
  // schema.prisma). Optional here because most companies have exactly one
  // warehouse; the service resolves the default when omitted.
  fulfillmentWarehouseId: z.uuid().optional().or(z.literal("")),
  neededByDate: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type CreateResourceRequestInput = z.infer<typeof createResourceRequestSchema>;

export const cancelResourceRequestSchema = z.object({ id: z.uuid() });
export type CancelResourceRequestInput = z.infer<typeof cancelResourceRequestSchema>;
