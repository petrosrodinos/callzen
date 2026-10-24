import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  Clock,
  Flame,
  Headphones,
  PhoneCall,
  Target,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardSkeleton } from "@/components/ui/page-skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboardOverview } from "@/features/dashboard/hooks/use-dashboard";
import { useAssistantAgents } from "@/features/assistant-agents/hooks/use-assistant-agents";
import { useAuthStore } from "@/stores/auth";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { Routes } from "@/routes/routes";
import { DashboardPeriodOptions } from "@/config/constants/dropdowns/calls/call-filters.options";
import { GettingStarted } from "./components/getting-started";
import { PendingInvitationsCard } from "./components/pending-invitations-card";
import { ScoreTrendCard } from "./components/score-trend-card";
import { SkillsCard } from "./components/skills-card";
import { HighlightsCard } from "./components/highlights-card";
import { RecurringMistakesCard } from "./components/recurring-mistakes-card";
import { RecommendedPracticeCard } from "./components/recommended-practice-card";
import { OutcomesCard } from "./components/outcomes-card";
import { PracticeProgressCard } from "./components/practice-progress-card";
import { RecentCallsCard } from "./components/recent-calls-card";

const DashboardPage: FC = () => {
  const { t } = useTranslation("dashboard");
  usePageMetadata({ title: t("title") });
  const [days, setDays] = useState("90");
  const [scope, setScope] = useState<"me" | "team">("me");
  const { can, organisation } = usePermissions();
  const canSeeTeam = can(Permissions.CALLS_VIEW_ALL);
  const effectiveScope = canSeeTeam ? scope : "me";
  const fullName = useAuthStore((state) => state.full_name);
  const { data, isPending } = useDashboardOverview(
    Number(days),
    effectiveScope,
  );
  const { data: agents } = useAssistantAgents({ status: "active" });

  const firstName = fullName?.split(" ")[0];
  const totals = data?.totals;

  return (
    <>
      <PageHeader
        title={firstName ? t("greeting", { name: firstName }) : t("title")}
        description={
          effectiveScope === "team"
            ? t("descriptionTeam", {
                organisation: organisation?.name ?? t("defaultOrganisation"),
              })
            : t("descriptionMe")
        }
        actions={
          <>
            {canSeeTeam && (
              <Tabs
                value={scope}
                onValueChange={(value) => setScope(value as "me" | "team")}
              >
                <TabsList className="h-9">
                  <TabsTrigger value="me">{t("scope.me")}</TabsTrigger>
                  <TabsTrigger value="team">{t("scope.team")}</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="h-9 w-[150px]" aria-label={t("period")}>
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
            {can(Permissions.CALLS_CREATE) && (
              <Button asChild variant="outline">
                <Link to={Routes.practice.root}>
                  <Headphones /> {t("practice")}
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4 empty:hidden">
        <PendingInvitationsCard />
      </div>

      {isPending || !data ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-4">
          {effectiveScope === "me" &&
            can(Permissions.CALLS_CREATE) &&
            (totals?.calls === 0 || !agents?.length) && (
              <GettingStarted
                hasAgent={!!agents?.length}
                canCreateAgent={can(Permissions.AGENTS_MANAGE)}
                hasPractice={(totals?.practice_sessions ?? 0) > 0}
                hasLiveCall={(totals?.live_calls ?? 0) > 0}
              />
            )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label={t("stats.averageScore")}
              value={totals?.average_score ?? "–"}
              icon={Target}
              hint={t("stats.averageScoreHint", {
                live: totals?.live_average_score ?? "–",
                practice: totals?.practice_average_score ?? "–",
              })}
            />
            <StatCard
              label={t("stats.calls")}
              value={totals?.calls ?? 0}
              icon={PhoneCall}
              hint={t("stats.callsHint", {
                live: totals?.live_calls ?? 0,
                practice: totals?.practice_sessions ?? 0,
              })}
            />
            <StatCard
              label={t("stats.meetingsBooked")}
              value={totals?.meetings_booked ?? 0}
              icon={CalendarCheck}
              hint={t("stats.fromLiveCalls")}
            />
            <StatCard
              label={t("stats.practiceStreak")}
              value={t("stats.streakDays", {
                count: totals?.practice_streak_days ?? 0,
              })}
              icon={Flame}
              hint={
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />{" "}
                  {t("stats.talkMinutes", { minutes: totals?.talk_minutes ?? 0 })}
                </span>
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ScoreTrendCard data={data.score_trend} className="lg:col-span-2" />
            <HighlightsCard highlights={data.highlights} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SkillsCard categories={data.categories} />
            <RecommendedPracticeCard
              items={data.recommended_practice}
              canStart={can(Permissions.PROSPECTS_MANAGE)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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
