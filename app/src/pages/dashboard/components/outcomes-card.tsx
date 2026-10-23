import { Card } from "@/components/ui/card";
import type { DashboardOverview } from "@/features/dashboard/interfaces/dashboard.interfaces";
import { getCallOutcomeLabel } from "@/config/constants/dropdowns/calls/call-outcome-form.options";

export function OutcomesCard({ outcomes }: { outcomes: DashboardOverview["outcomes"] }) {
  const sorted = [...outcomes].sort((a, b) => b.count - a.count);
  return (
    <Card className="p-5">
      <h2 className="font-semibold">Live call outcomes</h2>
      <p className="mb-4 text-sm text-muted-foreground">Share of calls with a recorded outcome</p>
      {!sorted.length ? (
        <p className="text-sm text-muted-foreground">Record outcomes at the end of live calls to link performance to results.</p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((item) => (
            <li key={item.outcome}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{getCallOutcomeLabel(item.outcome)}</span>
                <span className="tabular-nums text-muted-foreground">
                  {item.count} · {item.rate}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${item.rate}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
