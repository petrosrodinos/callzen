import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CallStatuses, type Call } from "@/features/calls/interfaces/calls.interfaces";

export function AnalysisStatus({ call, onRetry }: { call: Call; onRetry: () => void }) {
  if (call.status === CallStatuses.ANALYZING) {
    return (
      <Card className="space-y-4 p-5" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin text-primary" />
          <div>
            <p className="font-medium">Preparing your performance report…</p>
            <p className="text-sm text-muted-foreground">Usually under a minute. You can leave this page; it'll be ready in your library.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </Card>
    );
  }

  if (call.status === CallStatuses.ANALYSIS_FAILED || (call.status === CallStatuses.ENDED && call.analysis_error)) {
    const canRetry = call.segments.length > 0;
    return (
      <Card className="flex flex-col gap-3 border-amber-500/40 bg-amber-500/5 p-5 sm:flex-row sm:items-center">
        <AlertTriangle className="size-5 shrink-0 text-amber-600" />
        <div className="flex-1">
          <p className="font-medium">{call.status === CallStatuses.ANALYSIS_FAILED ? "The analysis didn't complete" : "No analysis for this call"}</p>
          <p className="text-sm text-muted-foreground">{call.analysis_error ?? "Your recording and transcript are safe."} {canRetry && "You can try again."}</p>
        </div>
        {canRetry && (
          <Button onClick={onRetry}>
            <RefreshCw /> Retry analysis
          </Button>
        )}
      </Card>
    );
  }

  return null;
}
