import { useTranslation } from "react-i18next";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CallStatuses,
  type Call,
} from "@/features/calls/interfaces/calls.interfaces";
import { useRetryTranscription } from "@/features/calls/hooks/use-calls";

export function AnalysisStatus({
  call,
  onRetry,
}: {
  call: Call;
  onRetry: () => void;
}) {
  const { t } = useTranslation("library");
  const retryTranscription = useRetryTranscription();

  if (call.status === CallStatuses.QUEUED || call.status === CallStatuses.TRANSCRIBING) {
    const queued = call.status === CallStatuses.QUEUED;
    return (
      <Card className="space-y-4 p-5" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin text-primary" />
          <div>
            <p className="font-medium">{queued ? t("detail.status.queued") : t("detail.status.transcribing")}</p>
            <p className="text-sm text-muted-foreground">
              {queued ? t("detail.status.queuedHint") : t("detail.status.transcribingHint")}
            </p>
          </div>
        </div>
        <Skeleton className="h-24 rounded-lg" />
      </Card>
    );
  }

  if (call.status === CallStatuses.TRANSCRIPTION_FAILED) {
    return (
      <Card className="flex flex-col gap-3 border-amber-500/40 bg-amber-500/5 p-5 sm:flex-row sm:items-center">
        <AlertTriangle className="size-5 shrink-0 text-amber-600" />
        <div className="flex-1">
          <p className="font-medium">{t("detail.status.transcriptionFailed")}</p>
          <p className="text-sm text-muted-foreground">
            {call.transcription_error ?? t("detail.status.safe")}{" "}
            {call.has_recording && t("detail.status.canRetry")}
          </p>
        </div>
        {call.has_recording && (
          <Button onClick={() => retryTranscription.mutate(call.id)} loading={retryTranscription.isPending}>
            <RefreshCw /> {t("detail.status.retryTranscription")}
          </Button>
        )}
      </Card>
    );
  }

  if (call.status === CallStatuses.ENDED && call.transcription_error && !call.segments.length) {
    return (
      <Card className="flex flex-col gap-3 border-amber-500/40 bg-amber-500/5 p-5 sm:flex-row sm:items-center">
        <AlertTriangle className="size-5 shrink-0 text-amber-600" />
        <div className="flex-1">
          <p className="font-medium">{t("detail.status.noTranscript")}</p>
          <p className="text-sm text-muted-foreground">{call.transcription_error}</p>
        </div>
      </Card>
    );
  }

  if (call.status === CallStatuses.ANALYZING) {
    return (
      <Card className="space-y-4 p-5" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin text-primary" />
          <div>
            <p className="font-medium">{t("detail.status.preparing")}</p>
            <p className="text-sm text-muted-foreground">
              {t("detail.status.preparingHint")}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </Card>
    );
  }

  if (
    call.status === CallStatuses.ANALYSIS_FAILED ||
    (call.status === CallStatuses.ENDED && call.analysis_error)
  ) {
    const canRetry = call.segments.length > 0;
    return (
      <Card className="flex flex-col gap-3 border-amber-500/40 bg-amber-500/5 p-5 sm:flex-row sm:items-center">
        <AlertTriangle className="size-5 shrink-0 text-amber-600" />
        <div className="flex-1">
          <p className="font-medium">
            {call.status === CallStatuses.ANALYSIS_FAILED
              ? t("detail.status.failed")
              : t("detail.status.noAnalysis")}
          </p>
          <p className="text-sm text-muted-foreground">
            {call.analysis_error ?? t("detail.status.safe")}{" "}
            {canRetry && t("detail.status.canRetry")}
          </p>
        </div>
        {canRetry && (
          <Button onClick={onRetry}>
            <RefreshCw /> {t("detail.status.retry")}
          </Button>
        )}
      </Card>
    );
  }

  return null;
}
