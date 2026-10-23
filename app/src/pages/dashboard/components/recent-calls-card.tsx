import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/page-skeletons";
import { CallRow } from "@/components/ui/call-row";
import { useCalls } from "@/features/calls/hooks/use-calls";
import { Routes } from "@/routes/routes";

export function RecentCallsCard() {
  const { data, isPending } = useCalls({ limit: 5 });

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Recent calls</h2>
        <Button asChild size="sm" variant="ghost">
          <Link to={Routes.library.root}>
            View all <ArrowRight />
          </Link>
        </Button>
      </div>
      {isPending ? (
        <ListSkeleton rows={3} />
      ) : !data?.data.length ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No calls yet.</p>
      ) : (
        <ul className="divide-y">
          {data.data.map((call) => (
            <li key={call.id}>
              <CallRow call={call} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
