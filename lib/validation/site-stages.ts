import { z } from "zod";
import { SiteStage } from "@/lib/projects/constants";

export const advanceSiteStageSchema = z.object({
  siteId: z.uuid(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type AdvanceSiteStageInput = z.infer<typeof advanceSiteStageSchema>;

export const setSiteStageChecklistItemSchema = z.object({
  siteId: z.uuid(),
  stage: z.enum(SiteStage),
  itemIndex: z.number().int().min(0),
  isChecked: z.boolean(),
});
export type SetSiteStageChecklistItemInput = z.infer<typeof setSiteStageChecklistItemSchema>;
