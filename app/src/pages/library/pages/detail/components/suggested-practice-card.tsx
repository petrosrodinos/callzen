import { Dumbbell, Loader2, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SuggestedPractice } from "@/features/calls/interfaces/calls.interfaces";
import { useStartRecommendedPractice } from "@/hooks/use-start-recommended-practice";
import { getLeadTemperatureLabel } from "@/config/constants/dropdowns/practice/lead-temperature-form.options";
import { getDifficultyLabel } from "@/config/constants/dropdowns/practice/difficulty-form.options";

export function SuggestedPracticeCard({ items, assistantAgentId }: { items: SuggestedPractice[]; assistantAgentId: string | null }) {
  const { start, isPending, pendingTitle } = useStartRecommendedPractice();
  if (!items.length) return null;

  return (
    <Card className="p-5">
      <h3 className="mb-3 flex items-center gap-2 font-semibold">
        <Dumbbell className="size-4 text-primary" /> Suggested practice
      </h3>
      <ul className="space-y-3">
        {items.map((item) => {
          const loading = isPending && pendingTitle === item.scenario_description;
          return (
            <li key={item.title} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.focus}</p>
                <div className="mt-1.5 flex gap-1">
                  <Badge variant="secondary">{getLeadTemperatureLabel(item.lead_temperature)}</Badge>
                  <Badge variant="outline">{getDifficultyLabel(item.difficulty)}</Badge>
                </div>
              </div>
              <Button size="sm" onClick={() => start(item, assistantAgentId)} disabled={isPending}>
                {loading ? <Loader2 className="animate-spin" /> : <Play />} {loading ? "Preparing…" : "Practice this"}
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
