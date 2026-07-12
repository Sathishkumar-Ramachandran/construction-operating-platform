import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again. If the problem continues, contact your administrator.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-5 text-destructive" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      ) : null}
    </div>
  );
}
