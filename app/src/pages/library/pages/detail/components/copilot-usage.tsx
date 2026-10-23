import { Link } from "react-router-dom";
import { Bot, Pencil, ThumbsDown, ThumbsUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SuggestionTypeBadge } from "@/components/ui/live-assist/suggestion-type-badge";
import { formatClock } from "@/lib/date";
import type { SuggestionUsage } from "@/features/calls/interfaces/calls.interfaces";
import { SuggestionUsageOptions } from "@/config/constants/dropdowns/calls/analysis-labels.options";
import { getDropdownOptionLabel } from "@/lib/dropdown-option-label.utils";
import { Routes } from "@/routes/routes";

const USAGE_STYLES = {
  FOLLOWED: "text-emerald-700 border-emerald-500/40 dark:text-emerald-300",
  ADAPTED: "text-sky-700 border-sky-500/40 dark:text-sky-300",
  IGNORED: "text-muted-foreground",
};

export function CopilotUsage({
  usage,
  assistantAgentId,
}: {
  usage: SuggestionUsage;
  assistantAgentId: string | null;
}) {
  const total = usage.followed + usage.adapted + usage.ignored || 1;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <Bot className="size-4 text-primary" /> How you used the co-pilot
        </h3>
        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="bg-emerald-500"
            style={{ width: `${(usage.followed / total) * 100}%` }}
          />
          <div
            className="bg-sky-500"
            style={{ width: `${(usage.adapted / total) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-sm">
          <span className="font-medium text-emerald-600">
            {usage.followed} followed
          </span>{" "}
          ·{" "}
          <span className="font-medium text-sky-600">
            {usage.adapted} adapted
          </span>{" "}
          ·{" "}
          <span className="text-muted-foreground">{usage.ignored} ignored</span>
        </p>
        <p className="mt-3 text-sm">{usage.effect_on_outcome}</p>
      </Card>

      {usage.copilot_improvements.length > 0 && (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-semibold">Improve your co-pilot</h3>
            {assistantAgentId && (
              <Button asChild size="sm" variant="outline">
                <Link to={Routes.assistant_agents.detail(assistantAgentId)}>
                  <Pencil /> Edit co-pilot
                </Link>
              </Button>
            )}
          </div>
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {usage.copilot_improvements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="mb-3 font-semibold">Suggestion by suggestion</h3>
        <ul className="space-y-3">
          {usage.items.map((item) => (
            <li
              key={item.suggestion_id}
              className="space-y-1 border-b pb-3 last:border-none last:pb-0"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {formatClock(item.at_ms)}
                </span>
                <SuggestionTypeBadge type={item.type} className="text-[11px]" />
                <Badge variant="outline" className={USAGE_STYLES[item.usage]}>
                  {getDropdownOptionLabel(SuggestionUsageOptions, item.usage)}
                </Badge>
                {item.helpful ? (
                  <ThumbsUp
                    className="size-3.5 text-emerald-600"
                    aria-label="Helpful"
                  />
                ) : (
                  <ThumbsDown
                    className="size-3.5 text-muted-foreground"
                    aria-label="Not helpful"
                  />
                )}
              </div>
              <p className="text-sm">“{item.text}”</p>
              <p className="text-xs text-muted-foreground">{item.comment}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
