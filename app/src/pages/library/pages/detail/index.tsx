import { useCallback, useMemo, useRef, useState, type FC } from "react";
import { Link, useParams } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { DetailSkeleton } from "@/components/ui/page-skeletons";
import { useCall, useUpdateSegmentSpeaker } from "@/features/calls/hooks/use-calls";
import { CallKinds, Speakers, type TranscriptSegment } from "@/features/calls/interfaces/calls.interfaces";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { formatDate } from "@/lib/date";
import { Routes } from "@/routes/routes";
import { CallDetailHeader } from "./components/call-detail-header";
import { AnalysisStatus } from "./components/analysis-status";
import { RecordingPlayer } from "./components/recording-player";
import { CallTimeline } from "./components/call-timeline";
import { SyncedTranscript } from "./components/synced-transcript";
import { AnalysisOverview } from "./components/analysis-overview";
import { AnalysisMoments } from "./components/analysis-moments";
import { AnalysisMetrics } from "./components/analysis-metrics";
import { AnalysisInsights } from "./components/analysis-insights";
import { FollowUpCard } from "./components/follow-up-card";
import { PracticeReveal } from "./components/practice-reveal";
import { CopilotUsage } from "./components/copilot-usage";
import { SuggestedPracticeCard } from "./components/suggested-practice-card";
import { NotesCard } from "./components/notes-card";
import { RerunAnalysisDialog } from "./components/rerun-analysis-dialog";
import { buildTimelineMarkers, callDurationMs } from "./utils/timeline.utils";

const CallDetailPage: FC = () => {
  const { callId } = useParams<{ callId: string }>();
  const { data: call, isPending, isError } = useCall(callId);
  const updateSpeaker = useUpdateSegmentSpeaker();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [focusMs, setFocusMs] = useState<number | null>(null);
  const [rerunOpen, setRerunOpen] = useState(false);

  usePageMetadata({ title: call?.title ?? "Call" });

  const markers = useMemo(() => (call ? buildTimelineMarkers(call) : []), [call]);
  const durationMs = useMemo(() => (call ? callDurationMs(call) : 1), [call]);

  const seek = useCallback((ms: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = ms / 1000;
      void audio.play().catch(() => undefined);
    }
    setCurrentMs(ms);
    setFocusMs(ms);
  }, []);

  if (isPending) return <DetailSkeleton />;
  if (isError || !call) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="Call not found"
        description="It may have been deleted."
        action={
          <Button asChild>
            <Link to={Routes.library.root}>Back to library</Link>
          </Button>
        }
      />
    );
  }

  const analysis = call.analysis;
  const isPractice = call.kind === CallKinds.PRACTICE;
  const flipSpeaker = (segment: TranscriptSegment) =>
    updateSpeaker.mutate({ id: call.id, segmentId: segment.id, speaker: segment.speaker === Speakers.USER ? Speakers.PROSPECT : Speakers.USER });

  return (
    <div className="space-y-5">
      <CallDetailHeader call={call} onRerun={() => setRerunOpen(true)} />
      <AnalysisStatus call={call} onRetry={() => setRerunOpen(true)} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <Card className="order-1 h-fit space-y-4 p-4 lg:order-2 lg:sticky lg:top-20">
          <h2 className="font-semibold">Recording & transcript</h2>
          <RecordingPlayer callId={call.id} hasRecording={call.has_recording} audioRef={audioRef} onTimeUpdate={setCurrentMs} fileName={`callzen-${(call.title ?? "call").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${formatDate(call.started_at)}.webm`} />
          {(markers.length > 0 || call.has_recording) && <CallTimeline markers={markers} durationMs={durationMs} currentMs={currentMs} onSeek={seek} />}
          <SyncedTranscript segments={call.segments} markers={markers} currentMs={currentMs} focusMs={focusMs} prospectLabel={call.prospect_name ?? undefined} onSeek={seek} onFlipSpeaker={flipSpeaker} />
        </Card>

        <div className="order-2 min-w-0 space-y-5 lg:order-1">
          {analysis && (
            <Tabs defaultValue={isPractice && analysis.practice_result ? "reveal" : "overview"}>
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <TabsList className="w-max">
                  {isPractice && analysis.practice_result && <TabsTrigger value="reveal">Result & reveal</TabsTrigger>}
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="moments">Mistakes & strengths</TabsTrigger>
                  <TabsTrigger value="metrics">Metrics</TabsTrigger>
                  <TabsTrigger value="insights">Prospect</TabsTrigger>
                  {analysis.suggestion_usage && <TabsTrigger value="copilot">Co-pilot</TabsTrigger>}
                  {!isPractice && <TabsTrigger value="follow-up">Follow-up</TabsTrigger>}
                </TabsList>
              </div>
              {analysis.error && <p className="mt-3 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">{analysis.error}</p>}
              <div className="mt-4">
                {analysis.practice_result && (
                  <TabsContent value="reveal">
                    <PracticeReveal result={analysis.practice_result} objective={call.goal} onJump={seek} />
                  </TabsContent>
                )}
                <TabsContent value="overview">
                  <AnalysisOverview analysis={analysis} />
                </TabsContent>
                <TabsContent value="moments">
                  <AnalysisMoments analysis={analysis} onJump={seek} />
                </TabsContent>
                <TabsContent value="metrics">
                  <AnalysisMetrics metrics={analysis.metrics} onJump={seek} />
                </TabsContent>
                <TabsContent value="insights">
                  <AnalysisInsights insights={analysis.prospect_insights} />
                </TabsContent>
                {analysis.suggestion_usage && (
                  <TabsContent value="copilot">
                    <CopilotUsage usage={analysis.suggestion_usage} assistantAgentId={call.assistant_agent_id} />
                  </TabsContent>
                )}
                {!isPractice && (
                  <TabsContent value="follow-up">
                    <FollowUpCard draft={analysis.follow_up_draft} prospectEmailSubject={`Following up${call.prospect_company ? ` – ${call.prospect_company}` : ""}`} />
                  </TabsContent>
                )}
              </div>
            </Tabs>
          )}

          {analysis && <SuggestedPracticeCard items={analysis.suggested_practice} assistantAgentId={call.assistant_agent_id} />}
          <NotesCard key={call.user_notes ?? ""} callId={call.id} notes={call.user_notes} />
        </div>
      </div>

      <RerunAnalysisDialog key={rerunOpen ? "open" : "closed"} callId={call.id} currentModel={analysis?.model ?? call.agent_snapshot?.analysis_model} canUseCurrentCriteria={!!call.assistant_agent && !call.assistant_agent.archived_at} open={rerunOpen} onOpenChange={setRerunOpen} />
    </div>
  );
};

export default CallDetailPage;
