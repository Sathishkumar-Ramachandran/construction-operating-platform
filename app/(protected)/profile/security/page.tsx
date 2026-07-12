import { requireUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { SecurityForm } from "@/app/(protected)/profile/security/security-form";

export default async function ProfileSecurityPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security"
        description="Change your password. Changing it signs you out of every other device."
      />

      <div className="max-w-lg rounded-xl border border-border bg-card p-6">
        <SecurityForm />
      </div>
    </div>
  );
}
