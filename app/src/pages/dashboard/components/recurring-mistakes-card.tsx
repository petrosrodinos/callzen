import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { DashboardOverview } from "@/features/dashboard/interfaces/dashboard.interfaces";
import { Routes } from "@/routes/routes";

export function RecurringMistakesCard({
  mistakes,
}: {
  mistakes: DashboardOverview["recurring_mistakes"];
}) {
  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <AlertCircle className="size-4 text-amber-500" /> Recurring mistakes
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        From your last 20 analyzed calls
      </p>
      {!mistakes.length ? (
        <p className="text-sm text-muted-foreground">
          No patterns yet. Keep going.
        </p>
      ) : (
        <ul className="space-y-3">
          {mistakes.map((mistake) => (
            <li key={mistake.category_key} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{mistake.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {mistake.calls_affected} call
                  {mistake.calls_affected === 1 ? "" : "s"}
                </span>
              </div>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {mistake.common_titles.join(" · ")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {mistake.calls.map((call) => (
                  <Link
                    key={call.call_id}
                    to={Routes.library.detail(call.call_id)}
                    className="max-w-40 truncate rounded bg-muted px-1.5 py-0.5 text-[11px] hover:bg-muted/70"
                  >
                    {call.title ?? "View call"}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
