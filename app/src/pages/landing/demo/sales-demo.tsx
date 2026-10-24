import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, RotateCcw, SkipForward, Volume2, VolumeX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudioLevelMeter } from "@/components/ui/live-assist/audio-level-meter";
import { LiveAssistPanel } from "@/components/ui/live-assist/live-assist-panel";
import { RecordingIndicator } from "@/components/ui/live-assist/recording-indicator";
import { TranscriptFeed } from "@/components/ui/live-assist/transcript-feed";
import { AnalysisOverview } from "@/pages/library/pages/detail/components/analysis-overview";
import { AnalysisMoments } from "@/pages/library/pages/detail/components/analysis-moments";
import { AnalysisMetrics } from "@/pages/library/pages/detail/components/analysis-metrics";
import { formatClock } from "@/lib/date";
import { DEMO_AGENT_NAME, DEMO_PROSPECT, DEMO_SCRIPT, DEMO_TITLE } from "./demo-script";
import { DEMO_ANALYSIS } from "./demo-analysis";
import { useDemoCall } from "./use-demo-call";

const noop = () => undefined;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function SalesDemo() {
  const { t } = useTranslation("landing");
  const { t: tCalls } = useTranslation("calls");
  const { t: tLibrary } = useTranslation("library");
  const { phase, segments, interim, session, elapsedMs, sound, setSound, start, finishNow, getLevel } = useDemoCall();
  const reviewRef = useRef<HTMLDivElement>(null);

  const idle = phase === "idle";
  const live = phase === "live";
  const reviewReady = phase === "done";

  // Bring the review into view once it appears, unless the visitor asked for reduced motion.
  useEffect(() => {
    if (phase !== "done" || prefersReducedMotion()) return;
    const el = reviewRef.current;
    if (el && el.getBoundingClientRect().top > window.innerHeight * 0.6) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [phase]);

  return (
    <section id="live" className="mt-10 space-y-4 text-left sm:mt-14" aria-label={t("salesDemo.aria")}>
      <div className="space-y-4 rounded-2xl border bg-background p-3 font-[Inter,ui-sans-serif,system-ui,sans-serif] text-base leading-normal text-foreground shadow-xl sm:p-5">
        <Card className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 sm:p-4">
          <Badge variant={reviewReady || phase === "analysing" ? "secondary" : "destructive"}>{live || idle ? tCalls("live.badge") : t("salesDemo.ended")}</Badge>
          <RecordingIndicator state={live ? "recording" : "off"} />
          <span className="font-mono text-sm tabular-nums">{formatClock(elapsedMs)}</span>
          <div className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground md:block">{DEMO_TITLE}</div>
          <div className="ml-auto flex items-center gap-2">
            {live && (
              <span className="hidden items-center gap-3 sm:flex">
                <AudioLevelMeter getLevel={() => getLevel("you")} label={tCalls("live.you")} />
                <AudioLevelMeter getLevel={() => getLevel("prospect")} label={DEMO_PROSPECT} />
              </span>
            )}
            {live && (
              <Button size="icon" variant="outline" className="size-9" onClick={() => setSound(!sound)} aria-pressed={sound} aria-label={sound ? t("salesDemo.soundOff") : t("salesDemo.soundOn")}>
                {sound ? <Volume2 /> : <VolumeX />}
              </Button>
            )}
            {live && (
              <Button size="sm" variant="ghost" onClick={finishNow}>
                <SkipForward /> {t("salesDemo.skip")}
              </Button>
            )}
            {(reviewReady || phase === "analysing") && (
              <Button size="sm" variant="outline" onClick={() => start(sound)}>
                <RotateCcw /> {t("salesDemo.replay")}
              </Button>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <Card className="relative order-2 flex h-80 flex-col p-4 lg:order-1 lg:h-[34rem]">
            <h2 className="mb-3 text-sm font-semibold">{tCalls("live.transcript")}</h2>
            <TranscriptFeed segments={segments} interim={interim} prospectLabel={DEMO_PROSPECT} emptyText={idle ? " " : undefined} className="min-h-0 flex-1" />
            {idle && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-card/80 p-6 text-center backdrop-blur-[2px]">
                <p className="max-w-xs text-sm text-muted-foreground">{t("salesDemo.intro")}</p>
                <Button size="lg" onClick={() => start(true)}>
                  <Volume2 /> {t("salesDemo.play")}
                </Button>
                <Button variant="link" size="sm" onClick={() => start(false)}>
                  {t("salesDemo.playSilent")}
                </Button>
              </div>
            )}
          </Card>

          <Card className="order-1 h-fit max-h-[34rem] overflow-y-auto p-4 lg:order-2 lg:h-[34rem]">
            <LiveAssistPanel session={session} script={DEMO_SCRIPT} agentName={DEMO_AGENT_NAME} />
          </Card>
        </div>
      </div>

      {phase === "analysing" && (
        <p role="status" className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {t("salesDemo.analysing")}
        </p>
      )}

      {reviewReady && (
        <div ref={reviewRef} className="space-y-4 rounded-2xl border bg-background p-3 font-[Inter,ui-sans-serif,system-ui,sans-serif] text-base leading-normal text-foreground shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500 sm:p-5">
          <div>
            <h2 className="text-lg font-semibold">{t("salesDemo.reviewTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("salesDemo.reviewLead")}</p>
          </div>
          <Tabs defaultValue="overview">
            <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
              <TabsList className="w-max">
                <TabsTrigger value="overview">{tLibrary("detail.tabs.overview")}</TabsTrigger>
                <TabsTrigger value="moments">{tLibrary("detail.tabs.moments")}</TabsTrigger>
                <TabsTrigger value="metrics">{tLibrary("detail.tabs.metrics")}</TabsTrigger>
              </TabsList>
            </div>
            <div className="mt-4">
              <TabsContent value="overview">
                <AnalysisOverview analysis={DEMO_ANALYSIS} />
              </TabsContent>
              <TabsContent value="moments">
                <AnalysisMoments analysis={DEMO_ANALYSIS} onJump={noop} />
              </TabsContent>
              <TabsContent value="metrics">
                <AnalysisMetrics metrics={DEMO_ANALYSIS.metrics} onJump={noop} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}
    </section>
  );
}
