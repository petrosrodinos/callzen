import { useTranslation } from "react-i18next";
import { useState, type FormEvent } from "react";
import {
  BellOff,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Circle,
  History,
  Loader2,
  Pin,
  PinOff,
  Send,
  ThumbsDown,
  ThumbsUp,
  WandSparkles,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SuggestionTypeBadge } from "./suggestion-type-badge";
import { getSuggestionAccent } from "./suggestion-accent";
import { SuggestionStatuses, SuggestionTypes, type Suggestion } from "@/features/calls/interfaces/calls.interfaces";
import type { SuggestionFrequency } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";
import { SuggestionFrequencyFormOptions } from "@/config/constants/dropdowns/agents/suggestion-frequency-form.options";
import { getScriptStageLabel } from "@/config/constants/dropdowns/agents/script-stage-form.options";
import type { CopilotSession } from "@/hooks/use-copilot-session";

// The slice of the co-pilot session the panel reads, so a scripted session (e.g. the landing-page demo) can drive it.
export type LiveAssistSession = Pick<
  CopilotSession,
  | "primary"
  | "pinned"
  | "history"
  | "latestInfoCard"
  | "scriptProgress"
  | "muted"
  | "setMuted"
  | "frequency"
  | "setFrequency"
  | "health"
  | "fallbackModel"
  | "pendingCount"
  | "isAsking"
  | "requestSuggestionNow"
  | "ask"
  | "pin"
  | "dismiss"
  | "rateSuggestion"
>;

interface LiveAssistPanelProps {
  session: LiveAssistSession;
  script: { id: string; stage: string; title: string; content: string }[];
  agentName?: string;
  className?: string;
}

export function LiveAssistPanel({ session, script, agentName, className }: LiveAssistPanelProps) {
  const { t } = useTranslation("common");
  const { primary, pinned, history, latestInfoCard, muted, health } = session;

  return (
    <section className={cn("flex flex-col gap-3", className)} aria-label={t("liveAssist.label")}>
      <PanelToolbar session={session} agentName={agentName} />

      {muted ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          <BellOff className="size-5" />
          {t("liveAssist.mutedTitle")}
          <Button size="sm" variant="outline" onClick={() => session.setMuted(false)}>
            {t("liveAssist.resume")}
          </Button>
        </div>
      ) : primary ? (
        <PrimarySuggestion suggestion={primary} session={session} thinking={health === "thinking"} />
      ) : (
        <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {health === "thinking" ? <Loader2 className="size-5 animate-spin" /> : <WandSparkles className="size-5" />}
          {t("liveAssist.empty")}
        </div>
      )}

      {pinned.length > 0 && (
        <div className="space-y-2">
          {pinned.map((suggestion) => (
            <CompactSuggestion key={suggestion.id} suggestion={suggestion} session={session} />
          ))}
        </div>
      )}

      {latestInfoCard && !muted && (
        <div className="rounded-xl border bg-muted/40 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <BookOpen className="size-3.5" /> {latestInfoCard.title}
          </p>
          <p className="mt-1 text-sm">{latestInfoCard.content}</p>
        </div>
      )}

      <AskCopilot session={session} />

      {script.length > 0 && <ScriptProgress script={script} completed={session.scriptProgress} />}

      {history.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
              <span className="flex items-center gap-2">
                <History className="size-4" /> {t("liveAssist.recent", { count: history.length })}
              </span>
              <ChevronDown className="size-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {history.map((suggestion) => (
              <CompactSuggestion key={suggestion.id} suggestion={suggestion} session={session} muted />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </section>
  );
}

function PanelToolbar({ session, agentName }: { session: LiveAssistSession; agentName?: string }) {
  const { t } = useTranslation("common");
  const { health, muted, frequency, fallbackModel } = session;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="mr-auto flex min-w-0 items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Zap className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{agentName ?? t("liveAssist.copilot")}</p>
          <p className={cn("text-xs leading-tight", health === "unavailable" || health === "offline" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
            {health === "thinking" && t("liveAssist.thinking")}
            {health === "ok" && (fallbackModel ? t("liveAssist.activeUsing", { model: fallbackModel }) : t("liveAssist.active"))}
            {health === "unavailable" && t("liveAssist.paused")}
            {health === "offline" && (
              <span className="inline-flex items-center gap-1">
                <WifiOff className="size-3" /> {t("liveAssist.reconnecting", { count: session.pendingCount })}
              </span>
            )}
          </p>
        </div>
      </div>

      <Select value={frequency} onValueChange={(value) => session.setFrequency(value as SuggestionFrequency)}>
        <SelectTrigger className="h-8 w-auto min-w-0 gap-1 text-xs" aria-label={t("liveAssist.frequencyLabel")}>
          <SelectValue placeholder={t("liveAssist.frequency")} />
        </SelectTrigger>
        <SelectContent>
          {SuggestionFrequencyFormOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="outline" className="size-8" onClick={() => void session.requestSuggestionNow()} disabled={muted || health === "thinking"} aria-label={t("liveAssist.suggestNow")}>
            <WandSparkles />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("liveAssist.suggestNow")}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant={muted ? "secondary" : "outline"} className="size-8" onClick={() => session.setMuted(!muted)} aria-label={muted ? t("liveAssist.unmute") : t("liveAssist.mute")} aria-pressed={muted}>
            {muted ? <BellOff /> : <Bell />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{muted ? t("liveAssist.unmute") : t("liveAssist.mute")}</TooltipContent>
      </Tooltip>
    </div>
  );
}

function PrimarySuggestion({ suggestion, session, thinking }: { suggestion: Suggestion; session: LiveAssistSession; thinking: boolean }) {
  const { t } = useTranslation("common");
  const isPinned = suggestion.status === SuggestionStatuses.PINNED;

  return (
    <article key={suggestion.id} className={cn("relative overflow-hidden rounded-xl border-2 bg-card p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300", suggestion.type === SuggestionTypes.WARNING ? "border-red-500/40" : "border-primary/30")}>
      <div className={cn("absolute inset-x-0 top-0 h-1", getSuggestionAccent(suggestion.type))} />
      <div className="mb-2 flex items-start gap-2">
        <SuggestionTypeBadge type={suggestion.type} />
        {suggestion.reason && <span className="truncate pt-0.5 text-xs text-muted-foreground">{suggestion.reason}</span>}
        {thinking && <Loader2 className="ml-auto size-4 shrink-0 animate-spin text-muted-foreground" aria-label={t("liveAssist.updating")} />}
      </div>
      <p className="text-lg font-medium leading-snug sm:text-xl">{suggestion.text}</p>

      {suggestion.alternatives?.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t pt-3">
          {suggestion.alternatives.map((alternative, index) => (
            <li key={index} className="flex gap-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground/60">{index === 0 ? t("liveAssist.or") : t("liveAssist.alt")}</span>
              {alternative}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-center gap-1">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => session.pin(suggestion)}>
          {isPinned ? <PinOff /> : <Pin />} {isPinned ? t("liveAssist.unpin") : t("liveAssist.pin")}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => session.dismiss(suggestion)}>
          <X /> {t("liveAssist.dismiss")}
        </Button>
        <div className="ml-auto flex items-center">
          <Button size="icon" variant="ghost" className={cn("size-7", suggestion.feedback === "UP" && "text-emerald-600")} onClick={() => session.rateSuggestion(suggestion, "UP")} aria-label={t("liveAssist.helpful")} aria-pressed={suggestion.feedback === "UP"}>
            <ThumbsUp />
          </Button>
          <Button size="icon" variant="ghost" className={cn("size-7", suggestion.feedback === "DOWN" && "text-red-600")} onClick={() => session.rateSuggestion(suggestion, "DOWN")} aria-label={t("liveAssist.notHelpful")} aria-pressed={suggestion.feedback === "DOWN"}>
            <ThumbsDown />
          </Button>
        </div>
      </div>
    </article>
  );
}

function CompactSuggestion({ suggestion, session, muted = false }: { suggestion: Suggestion; session: LiveAssistSession; muted?: boolean }) {
  const { t } = useTranslation("common");
  const isPinned = suggestion.status === SuggestionStatuses.PINNED;
  return (
    <div className={cn("flex items-start gap-2 rounded-lg border p-2.5", muted && "opacity-80")}>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <SuggestionTypeBadge type={suggestion.type} className="px-1.5 text-[11px]" />
          <span className="text-[11px] tabular-nums text-muted-foreground">{formatClock(suggestion.at_ms)}</span>
        </div>
        <p className="text-sm">{suggestion.text}</p>
      </div>
      <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={() => session.pin(suggestion)} aria-label={isPinned ? t("liveAssist.unpin") : t("liveAssist.pin")}>
        {isPinned ? <PinOff /> : <Pin />}
      </Button>
    </div>
  );
}

function AskCopilot({ session }: { session: LiveAssistSession }) {
  const { t } = useTranslation("common");
  const [question, setQuestion] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = question.trim();
    if (!value) return;
    setQuestion("");
    try {
      await session.ask(value);
    } catch {
      setQuestion(value);
    }
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={t("liveAssist.askPlaceholder")} aria-label={t("liveAssist.askLabel")} className="h-9" />
      <Button type="submit" size="icon" className="size-9 shrink-0" disabled={session.isAsking || !question.trim()} aria-label={t("liveAssist.ask")}>
        {session.isAsking ? <Loader2 className="animate-spin" /> : <Send />}
      </Button>
    </form>
  );
}

function ScriptProgress({ script, completed }: { script: LiveAssistPanelProps["script"]; completed: string[] }) {
  const { t } = useTranslation("common");
  const done = new Set(completed);
  const nextIndex = script.findIndex((stage) => !done.has(stage.id));

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
          <span>
            {t("liveAssist.scriptProgress", { done: done.size, total: script.length })}
          </span>
          <ChevronDown className="size-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ol className="space-y-1 pt-1">
          {script.map((stage, index) => {
            const isDone = done.has(stage.id);
            return (
              <li key={stage.id} className={cn("flex items-center gap-2 rounded-md px-2 py-1 text-sm", index === nextIndex && "bg-primary/5 font-medium")}>
                {isDone ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" /> : <Circle className={cn("size-4 shrink-0", index === nextIndex ? "text-primary" : "text-muted-foreground/50")} />}
                <span className={cn("truncate", isDone && "text-muted-foreground line-through")}>{stage.title || getScriptStageLabel(stage.stage)}</span>
                <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{getScriptStageLabel(stage.stage)}</span>
              </li>
            );
          })}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}
