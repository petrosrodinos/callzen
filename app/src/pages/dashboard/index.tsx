import { useState, type FC } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Clock, Flame, Headphones, PhoneCall, Target } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardSkeleton } from "@/components/ui/page-skeletons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDashboardOverview } from "@/features/dashboard/hooks/use-dashboard";
import { useAssistantAgents } from "@/features/assistant-agents/hooks/use-assistant-agents";
import { useAuthStore } from "@/stores/auth";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { Routes } from "@/routes/routes";
import { DashboardPeriodOptions } from "@/config/constants/dropdowns/calls/call-filters.options";
import { GettingStarted } from "./components/getting-started";
import { ScoreTrendCard } from "./components/score-trend-card";
import { SkillsCard } from "./components/skills-card";
import { HighlightsCard } from "./components/highlights-card";
import { RecurringMistakesCard } from "./components/recurring-mistakes-card";
import { RecommendedPracticeCard } from "./components/recommended-practice-card";
import { OutcomesCard } from "./components/outcomes-card";
import { PracticeProgressCard } from "./components/practice-progress-card";
import { RecentCallsCard } from "./components/recent-calls-card";

const DashboardPage: FC = () => {
  usePageMetadata({ title: "Dashboard" });
  const [days, setDays] = useState("90");
  const fullName = useAuthStore((state) => state.full_name);
  const { data, isPending } = useDashboardOverview(Number(days));
  const { data: agents } = useAssistantAgents({ status: "active" });

  const firstName = fullName?.split(" ")[0];
  const totals = data?.totals;

  return (
    <>
      <PageHeader
        title={firstName ? `Hi ${firstName}` : "Dashboard"}
        description="Your performance on live calls and practice, and what to work on next."
        actions={
          <>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="h-9 w-[150px]" aria-label="Period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DashboardPeriodOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild variant="outline">
              <Link to={Routes.practice.root}>
                <Headphones /> Practice
              </Link>
            </Button>
          </>
        }
      />

      {isPending || !data ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-4">
          {(totals?.calls === 0 || !agents?.length) && <GettingStarted hasAgent={!!agents?.length} hasPractice={(totals?.practice_sessions ?? 0) > 0} hasLiveCall={(totals?.live_calls ?? 0) > 0} />}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Average score" value={totals?.average_score ?? "–"} icon={Target} hint={`Live ${totals?.live_average_score ?? "–"} · Practice ${totals?.practice_average_score ?? "–"}`} />
            <StatCard label="Calls" value={totals?.calls ?? 0} icon={PhoneCall} hint={`${totals?.live_calls ?? 0} live · ${totals?.practice_sessions ?? 0} practice`} />
            <StatCard label="Meetings booked" value={totals?.meetings_booked ?? 0} icon={CalendarCheck} hint="From live calls" />
            <StatCard
              label="Practice streak"
              value={`${totals?.practice_streak_days ?? 0}d`}
              icon={Flame}
              hint={
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" /> {totals?.talk_minutes ?? 0} min on calls
                </span>
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ScoreTrendCard data={data.score_trend} className="lg:col-span-2" />
            <HighlightsCard highlights={data.highlights} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SkillsCard categories={data.categories} />
            <RecommendedPracticeCard items={data.recommended_practice} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <RecurringMistakesCard mistakes={data.recurring_mistakes} />
            <OutcomesCard outcomes={data.outcomes} />
            <PracticeProgressCard progress={data.practice_progress} />
          </div>

          <RecentCallsCard />
        </div>
      )}
    </>
  );
};

export default DashboardPage;
