import { z } from "zod";
import { ALL_ROLES } from "@/lib/authorization/roles";

export const roleCodeSchema = z.enum(
  ALL_ROLES as [string, ...string[]]
);

/**
 * No password field: initial passwords are always generated server-side
 * (see lib/services/password-generation-service.ts) and are never accepted
 * from the client.
 */
export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(120).trim(),
  email: z.email("Enter a valid email address.").max(255).trim(),
  roleCode: roleCodeSchema,
  employeeId: z.uuid().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  userId: z.uuid(),
  name: z.string().min(2).max(120).trim(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const assignRoleSchema = z.object({
  userId: z.uuid(),
  roleCode: roleCodeSchema,
});

export type AssignRoleInput = z.infer<typeof assignRoleSchema>;

export const setUserActiveSchema = z.object({
  userId: z.uuid(),
  isActive: z.boolean(),
});

export type SetUserActiveInput = z.infer<typeof setUserActiveSchema>;

export const listUsersQuerySchema = z.object({
  search: z.string().max(255).optional(),
  roleCode: roleCodeSchema.optional(),
  status: z.enum(["active", "inactive", "all"]).optional().default("all"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
