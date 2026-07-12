import { db } from "@/lib/db";

export async function getRolesWithPermissions() {
  return db.role.findMany({
    orderBy: { name: "asc" },
    include: {
      rolePermissions: {
        where: { allowed: true },
        include: { permission: true },
        orderBy: { permission: { code: "asc" } },
      },
      _count: { select: { users: true } },
    },
  });
}
