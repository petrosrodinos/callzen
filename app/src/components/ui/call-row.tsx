import i18n from "@/i18n";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  Headphones,
  Loader2,
  Mic,
  MonitorSmartphone,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/ui/score-badge";
import { formatDateTime, formatDuration } from "@/lib/date";
import {
  CallKinds,
  CallStatuses,
  CallTypes,
  type CallListItem,
} from "@/features/calls/interfaces/calls.interfaces";
import { getCallOutcomeLabel } from "@/config/constants/dropdowns/calls/call-outcome-form.options";
import { getCallStatusLabel } from "@/config/constants/dropdowns/calls/call-status.options";
import { getDifficultyLabel } from "@/config/constants/dropdowns/practice/difficulty-form.options";
import { Routes } from "@/routes/routes";

const TYPE_ICONS = {
  [CallTypes.ONLINE_MEETING]: MonitorSmartphone,
  [CallTypes.MICROPHONE]: Mic,
  [CallTypes.PRACTICE]: Headphones,
};

export function CallRow({ call }: { call: CallListItem }) {
  const Icon = TYPE_ICONS[call.call_type] ?? Mic;
  const isPractice = call.kind === CallKinds.PRACTICE;
  const target =
    call.status === CallStatuses.IN_PROGRESS
      ? isPractice
        ? Routes.practice.session(call.id)
        : Routes.calls.live(call.id)
      : Routes.library.detail(call.id);

  return (
    <Link
      to={target}
      className="flex items-center gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-muted/50 sm:px-2"
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          isPractice
            ? "bg-amber-500/10 text-amber-600"
            : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">
            {call.title ??
              call.prospect_name ??
              (isPractice ? i18n.t("common:callRow.practiceSession") : i18n.t("common:callRow.untitled"))}
          </p>
          {isPractice && (
            <Badge
              variant="outline"
              className="hidden shrink-0 border-amber-500/40 text-amber-700 sm:inline-flex dark:text-amber-300"
            >
              {i18n.t("common:callRow.practice")}
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {formatDateTime(call.started_at)} ·{" "}
          {formatDuration(call.duration_seconds)}
          {!call.owner.is_you && ` · ${call.owner.name}`}
          {call.assistant_agent && ` · ${call.assistant_agent.name}`}
          {call.practice_agent &&
            ` · ${getDifficultyLabel(call.practice_agent.difficulty)}`}
        </p>
      </div>
      <div className="hidden shrink-0 items-center gap-2 md:flex">
        {call.outcome && (
          <Badge variant="secondary">{getCallOutcomeLabel(call.outcome)}</Badge>
        )}
        {isPractice && call.objective_achieved != null && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs",
              call.objective_achieved
                ? "text-emerald-600"
                : "text-muted-foreground",
            )}
          >
            {call.objective_achieved ? (
              <CheckCircle2 className="size-3.5" />
            ) : (
              <XCircle className="size-3.5" />
            )}
            {call.objective_achieved ? i18n.t("common:callRow.objectiveMet") : i18n.t("common:callRow.notMet")}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {call.status === CallStatuses.ANALYZING ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            <span className="hidden sm:inline">{i18n.t("common:callRow.analyzing")}</span>
          </span>
        ) : call.status === CallStatuses.IN_PROGRESS ? (
          <Badge variant="destructive">{i18n.t("common:callRow.live")}</Badge>
        ) : call.score != null ? (
          <ScoreBadge score={call.score} />
        ) : (
          <span className="text-xs text-muted-foreground">
            {getCallStatusLabel(call.status)}
          </span>
        )}
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
    </Link>
  );
}
