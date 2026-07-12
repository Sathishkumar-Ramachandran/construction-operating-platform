import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, UserRole } from "@/lib/authorization/roles";

const ROLE_VARIANT: Record<UserRole, "default" | "secondary" | "outline"> = {
  SUPER_ADMIN: "default",
  ADMIN: "secondary",
  MANAGER: "outline",
  HR: "outline",
  TEAM_MEMBER: "outline",
};

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge
      variant={ROLE_VARIANT[role]}
      className={cn(
        "font-medium",
        // Gold is reserved for the platform's highest-privilege role.
        role === UserRole.SUPER_ADMIN && "bg-gold text-gold-foreground"
      )}
    >
      {ROLE_LABELS[role]}
    </Badge>
  );
}
