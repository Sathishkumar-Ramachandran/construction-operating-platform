"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { setCompanyActiveAction } from "@/actions/platform-admin-actions";

export function CompanyActiveToggle({
  companyId,
  isActive,
}: {
  companyId: string;
  isActive: boolean;
}) {
  const router = useRouter();

  async function handleChange(checked: boolean) {
    const result = await setCompanyActiveAction({ companyId, isActive: checked });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(
      checked
        ? "Company activated. Its users can sign in again."
        : "Company deactivated. Logins are blocked and live sessions are invalidated immediately."
    );
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Switch checked={isActive} onCheckedChange={handleChange} />
      <Badge variant={isActive ? "default" : "secondary"}>
        {isActive ? "Active" : "Inactive"}
      </Badge>
    </div>
  );
}
