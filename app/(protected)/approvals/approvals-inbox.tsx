"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { ApprovalStatusBadge } from "@/components/shared/approval-status-badge";
import { ApprovalActionPanel } from "@/components/shared/approval-action-panel";
import { cancelApprovalAction } from "@/actions/approval-actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ApprovalStep = {
  id: string;
  stepOrder: number;
  approverUserId: string | null;
  approverRole: string | null;
  status: string;
  decisionNotes: string | null;
  decidedAt: string | null;
};

type ApprovalRequestRow = {
  id: string;
  module: string;
  entityType: string;
  entityId: string;
  status: string;
  currentStepOrder: number;
  reason: string | null;
  createdAt: string;
  steps: ApprovalStep[];
};

type ApprovalsResponse = {
  requests: ApprovalRequestRow[];
  total: number;
  page: number;
  pageSize: number;
};

function moduleLabel(module: string) {
  return module
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function ApprovalsInbox({ canDecide }: { canDecide: boolean }) {
  const [scope, setScope] = useState<"PENDING_FOR_ME" | "REQUESTED_BY_ME">(
    canDecide ? "PENDING_FOR_ME" : "REQUESTED_BY_ME"
  );
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<ApprovalsResponse>({
    queryKey: ["approvals", scope],
    queryFn: async () => {
      const res = await fetch(`/api/approvals?scope=${scope}`);
      if (!res.ok) throw new Error("Failed to load approvals.");
      return res.json();
    },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["approvals"] });
  }

  async function handleCancel(requestId: string) {
    const result = await cancelApprovalAction({ approvalRequestId: requestId });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Request cancelled.");
    invalidate();
  }

  return (
    <Tabs value={scope} onValueChange={(v) => v && setScope(v as typeof scope)}>
      <TabsList variant="line">
        {canDecide ? <TabsTrigger value="PENDING_FOR_ME">Pending for me</TabsTrigger> : null}
        <TabsTrigger value="REQUESTED_BY_ME">Requested by me</TabsTrigger>
      </TabsList>

      <TabsContent value={scope} className="pt-4">
        {isLoading ? (
          <LoadingState rows={4} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data || data.requests.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Nothing here"
            description={
              scope === "PENDING_FOR_ME"
                ? "No requests are currently waiting on your decision."
                : "You haven't filed any approval requests yet."
            }
          />
        ) : (
          <div className="space-y-3">
            {data.requests.map((request) => {
              const currentStep = request.steps.find(
                (s) => s.stepOrder === request.currentStepOrder
              );
              return (
                <div
                  key={request.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {moduleLabel(request.module)} · {request.entityType}
                      </p>
                      {request.reason ? (
                        <p className="mt-0.5 text-sm text-muted-foreground">{request.reason}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Filed {new Date(request.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <ApprovalStatusBadge status={request.status} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    {scope === "PENDING_FOR_ME" && canDecide && currentStep ? (
                      <ApprovalActionPanel
                        approvalRequestId={request.id}
                        stepOrder={currentStep.stepOrder}
                        onDecided={invalidate}
                      />
                    ) : null}
                    {scope === "REQUESTED_BY_ME" && request.status === "PENDING" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancel(request.id)}
                      >
                        Cancel request
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
