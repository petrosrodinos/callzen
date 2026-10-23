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

interface LiveAssistPanelProps {
  session: CopilotSession;
  script: { id: string; stage: string; title: string; content: string }[];
  agentName?: string;
  className?: string;
}

export function LiveAssistPanel({ session, script, agentName, className }: LiveAssistPanelProps) {
  const { primary, pinned, history, latestInfoCard, muted, health } = session;

  return (
    <section className={cn("flex flex-col gap-3", className)} aria-label="Live assist">
      <PanelToolbar session={session} agentName={agentName} />

      {muted ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          <BellOff className="size-5" />
          Suggestions are muted. The call is still being captured.
          <Button size="sm" variant="outline" onClick={() => session.setMuted(false)}>
            Resume suggestions
          </Button>
        </div>
      ) : primary ? (
        <PrimarySuggestion suggestion={primary} session={session} thinking={health === "thinking"} />
      ) : (
        <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {health === "thinking" ? <Loader2 className="size-5 animate-spin" /> : <WandSparkles className="size-5" />}
          Suggestions will appear here as soon as the prospect speaks.
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
                <History className="size-4" /> Recent suggestions ({history.length})
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

function PanelToolbar({ session, agentName }: { session: CopilotSession; agentName?: string }) {
  const { health, muted, frequency, fallbackModel } = session;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="mr-auto flex min-w-0 items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Zap className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{agentName ?? "Co-pilot"}</p>
          <p className={cn("text-xs leading-tight", health === "unavailable" || health === "offline" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
            {health === "thinking" && "Thinking…"}
            {health === "ok" && (fallbackModel ? `Active · using ${fallbackModel}` : "Active")}
            {health === "unavailable" && "Suggestions paused · capture continues"}
            {health === "offline" && (
              <span className="inline-flex items-center gap-1">
                <WifiOff className="size-3" /> Reconnecting · {session.pendingCount} line(s) queued
              </span>
            )}
          </p>
        </div>
      </div>

      <Select value={frequency} onValueChange={(value) => session.setFrequency(value as SuggestionFrequency)}>
        <SelectTrigger className="h-8 w-auto min-w-0 gap-1 text-xs" aria-label="Suggestion frequency">
          <SelectValue placeholder="Frequency" />
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
          <Button size="icon" variant="outline" className="size-8" onClick={() => void session.requestSuggestionNow()} disabled={muted || health === "thinking"} aria-label="Suggest now">
            <WandSparkles />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Suggest now</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant={muted ? "secondary" : "outline"} className="size-8" onClick={() => session.setMuted(!muted)} aria-label={muted ? "Unmute suggestions" : "Mute suggestions"} aria-pressed={muted}>
            {muted ? <BellOff /> : <Bell />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{muted ? "Unmute suggestions" : "Mute suggestions"}</TooltipContent>
      </Tooltip>
    </div>
  );
}

function PrimarySuggestion({ suggestion, session, thinking }: { suggestion: Suggestion; session: CopilotSession; thinking: boolean }) {
  const isPinned = suggestion.status === SuggestionStatuses.PINNED;

  return (
    <article key={suggestion.id} className={cn("relative overflow-hidden rounded-xl border-2 bg-card p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300", suggestion.type === SuggestionTypes.WARNING ? "border-red-500/40" : "border-primary/30")}>
      <div className={cn("absolute inset-x-0 top-0 h-1", getSuggestionAccent(suggestion.type))} />
      <div className="mb-2 flex items-start gap-2">
        <SuggestionTypeBadge type={suggestion.type} />
        {suggestion.reason && <span className="truncate pt-0.5 text-xs text-muted-foreground">{suggestion.reason}</span>}
        {thinking && <Loader2 className="ml-auto size-4 shrink-0 animate-spin text-muted-foreground" aria-label="Updating" />}
      </div>
      <p className="text-lg font-medium leading-snug sm:text-xl">{suggestion.text}</p>

      {suggestion.alternatives?.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t pt-3">
          {suggestion.alternatives.map((alternative, index) => (
            <li key={index} className="flex gap-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground/60">{index === 0 ? "Or:" : "Alt:"}</span>
              {alternative}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-center gap-1">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => session.pin(suggestion)}>
          {isPinned ? <PinOff /> : <Pin />} {isPinned ? "Unpin" : "Pin"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => session.dismiss(suggestion)}>
          <X /> Dismiss
        </Button>
        <div className="ml-auto flex items-center">
          <Button size="icon" variant="ghost" className={cn("size-7", suggestion.feedback === "UP" && "text-emerald-600")} onClick={() => session.rateSuggestion(suggestion, "UP")} aria-label="Helpful" aria-pressed={suggestion.feedback === "UP"}>
            <ThumbsUp />
          </Button>
          <Button size="icon" variant="ghost" className={cn("size-7", suggestion.feedback === "DOWN" && "text-red-600")} onClick={() => session.rateSuggestion(suggestion, "DOWN")} aria-label="Not helpful" aria-pressed={suggestion.feedback === "DOWN"}>
            <ThumbsDown />
          </Button>
        </div>
      </div>
    </article>
  );
}

function CompactSuggestion({ suggestion, session, muted = false }: { suggestion: Suggestion; session: CopilotSession; muted?: boolean }) {
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
      <Button size="icon" variant="ghost" className="size-7 shrink-0" onClick={() => session.pin(suggestion)} aria-label={isPinned ? "Unpin" : "Pin"}>
        {isPinned ? <PinOff /> : <Pin />}
      </Button>
    </div>
  );
}

function AskCopilot({ session }: { session: CopilotSession }) {
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
      <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask the co-pilot… e.g. pricing for 50 seats?" aria-label="Ask the co-pilot" className="h-9" />
      <Button type="submit" size="icon" className="size-9 shrink-0" disabled={session.isAsking || !question.trim()} aria-label="Ask">
        {session.isAsking ? <Loader2 className="animate-spin" /> : <Send />}
      </Button>
    </form>
  );
}

function ScriptProgress({ script, completed }: { script: LiveAssistPanelProps["script"]; completed: string[] }) {
  const done = new Set(completed);
  const nextIndex = script.findIndex((stage) => !done.has(stage.id));

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
          <span>
            Script progress · {done.size}/{script.length}
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
