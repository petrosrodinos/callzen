import { useEffect, useState, type FC } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Bookmark, Mic, MonitorSmartphone, Pause, PhoneOff, Play, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DetailSkeleton } from "@/components/ui/page-skeletons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LiveAssistPanel } from "@/components/ui/live-assist/live-assist-panel";
import { TranscriptFeed } from "@/components/ui/live-assist/transcript-feed";
import { RecordingIndicator } from "@/components/ui/live-assist/recording-indicator";
import { AudioLevelMeter } from "@/components/ui/live-assist/audio-level-meter";
import { useCall, useUpdateCall } from "@/features/calls/hooks/use-calls";
import { useAssistantAgents } from "@/features/assistant-agents/hooks/use-assistant-agents";
import { CallEndReasons, CallStatuses, type CallOutcome } from "@/features/calls/interfaces/calls.interfaces";
import { useCopilotSession } from "@/hooks/use-copilot-session";
import { useFinishCall } from "@/hooks/use-finish-call";
import { useCallClock } from "@/hooks/use-call-clock";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { formatClock } from "@/lib/date";
import { Routes } from "@/routes/routes";
import { useLiveCapture } from "./hooks/use-live-capture";
import { EndCallDialog } from "./components/end-call-dialog";
import { ManualLineInput } from "./components/manual-line-input";

const LiveCallPage: FC = () => {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  const { data: call, isPending, refetch } = useCall(callId);
  const { data: agents } = useAssistantAgents({ status: "active" });
  const updateCall = useUpdateCall();
  const clock = useCallClock();
  const [endOpen, setEndOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(() => !window.matchMedia("(max-width: 767px)").matches);
  const [ending, setEnding] = useState(false);

  usePageMetadata({ title: call?.title ?? "Live call" });

  const copilot = useCopilotSession({ call, getElapsedMs: clock.now });
  const capture = useLiveCapture({ call, copilot, clock });
  const { finish, isFinishing } = useFinishCall(copilot);

  useEffect(() => {
    if (capture.status !== "live" && capture.status !== "paused") return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [capture.status]);

  if (isPending) return <DetailSkeleton />;
  if (!call) return <Navigate to={Routes.library.root} replace />;
  if (call.status !== CallStatuses.IN_PROGRESS && !ending) return <Navigate to={Routes.library.detail(call.id)} replace />;

  const endCall = async (outcome?: CallOutcome, customOutcome?: string) => {
    setEnding(true);
    const recording = await capture.stop();
    try {
      await finish({ callId: call.id, reason: CallEndReasons.USER, durationSeconds: clock.now() / 1000, recording, outcome, customOutcome });
      navigate(Routes.library.detail(call.id), { replace: true, state: { justEnded: true } });
    } catch {
      setEnding(false);
    }
  };

  const switchAgent = (agentId: string) =>
    updateCall.mutate({ id: call.id, dto: { assistant_agent_id: agentId } }, { onSuccess: () => void refetch() });

  const recordingState = capture.status === "paused" ? "paused" : capture.status === "live" ? (call.keep_recording ? "recording" : "listening") : capture.status === "connecting" ? "connecting" : "off";
  const paused = capture.status === "paused";
  const capturing = capture.status === "live" || paused;

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-24 lg:pb-0">
      <Card className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 sm:p-4">
        <Badge variant="destructive" className="gap-1">
          {call.call_type === "ONLINE_MEETING" ? <MonitorSmartphone className="size-3" /> : <Mic className="size-3" />} Live
        </Badge>
        <RecordingIndicator state={recordingState} />
        <span className="font-mono text-sm tabular-nums">{formatClock(clock.elapsedMs)}</span>
        <div className="hidden min-w-0 flex-1 truncate text-sm text-muted-foreground md:block">{call.title ?? call.prospect_name ?? ""}</div>
        <div className="flex w-full items-center gap-2 md:ml-auto md:w-auto">
          {capturing && (
            <span className="hidden items-center gap-3 lg:flex">
              <AudioLevelMeter getLevel={() => capture.getLevel("user")} label={capture.isMeeting ? "You" : "Mic"} />
              {capture.isMeeting && <AudioLevelMeter getLevel={() => capture.getLevel("prospect")} label="Meeting" />}
            </span>
          )}
          {agents && agents.length > 1 && (
            <Select value={call.assistant_agent_id ?? undefined} onValueChange={switchAgent} disabled={updateCall.isPending}>
              <SelectTrigger className="h-9 min-w-0 flex-1 md:w-48 md:flex-none" aria-label="Switch co-pilot">
                <SelectValue placeholder="Co-pilot" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="hidden items-center gap-2 lg:flex">
            <CallControls paused={paused} capturing={capturing} onPause={capture.pause} onResume={capture.resume} onBookmark={() => copilot.bookmark()} onEnd={() => setEndOpen(true)} />
          </div>
        </div>
      </Card>

      {capture.notice && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p className="flex-1">{capture.notice}</p>
          {capture.status === "interrupted" && (
            <Button size="sm" variant="outline" onClick={() => void capture.reconnect()}>
              <RefreshCw /> Reconnect
            </Button>
          )}
          <button type="button" onClick={capture.dismissNotice} aria-label="Dismiss" className="rounded p-0.5 hover:bg-amber-500/20">
            <X className="size-4" />
          </button>
        </div>
      )}

      {capture.status === "needs-audio" && (
        <Card className="flex flex-col items-center gap-3 p-6 text-center">
          <p className="font-medium">Connect your audio to start capturing</p>
          <p className="max-w-md text-sm text-muted-foreground">{capture.isMeeting ? "Choose the meeting's browser tab and enable “Share tab audio”, then allow the microphone." : "Allow microphone access. Put your phone on speaker near this device."}</p>
          <Button onClick={() => void capture.reconnect()}>
            <Mic /> Connect audio
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <Card className="p-4">
          <LiveAssistPanel session={copilot} script={call.agent_snapshot?.script ?? []} agentName={call.agent_snapshot?.name} />
        </Card>

        <Card className="flex flex-col p-4 lg:sticky lg:top-20 lg:h-[calc(100dvh-7rem)]">
          <Collapsible open={transcriptOpen} onOpenChange={setTranscriptOpen} className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Live transcript</h2>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {transcriptOpen ? "Hide" : `Show (${copilot.segments.length})`}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="flex min-h-0 flex-1 flex-col gap-3 pt-2">
              <TranscriptFeed segments={copilot.segments} interim={capture.interim} prospectLabel={call.prospect_name ?? undefined} onFlipSpeaker={copilot.flipSpeaker} className="max-h-[50vh] min-h-40 flex-1 lg:max-h-none" />
              <div className="border-t pt-3">
                <ManualLineInput onAdd={capture.addManualLine} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur lg:hidden">
        <div className="pb-safe flex items-center justify-center gap-3 px-4 pt-3">
          <CallControls paused={paused} capturing={capturing} onPause={capture.pause} onResume={capture.resume} onBookmark={() => copilot.bookmark()} onEnd={() => setEndOpen(true)} large />
        </div>
      </div>

      <EndCallDialog open={endOpen} onOpenChange={setEndOpen} onConfirm={(outcome, custom) => void endCall(outcome, custom)} isPending={isFinishing || ending} />
    </div>
  );
};

interface CallControlsProps {
  paused: boolean;
  capturing: boolean;
  onPause: () => void;
  onResume: () => void;
  onBookmark: () => void;
  onEnd: () => void;
  large?: boolean;
}

function CallControls({ paused, capturing, onPause, onResume, onBookmark, onEnd, large = false }: CallControlsProps) {
  const size = large ? "size-12 rounded-full" : "size-9";
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant={paused ? "secondary" : "outline"} className={size} onClick={paused ? onResume : onPause} disabled={!capturing} aria-label={paused ? "Resume capture" : "Pause capture"}>
            {paused ? <Play /> : <Pause />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{paused ? "Resume capture" : "Pause capture (off-topic or sensitive moments)"}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="outline" className={size} onClick={onBookmark} disabled={!capturing} aria-label="Bookmark this moment">
            <Bookmark />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Bookmark this moment</TooltipContent>
      </Tooltip>
      <Button variant="destructive" className={large ? "h-12 rounded-full px-6" : "h-9"} onClick={onEnd}>
        <PhoneOff /> End call
      </Button>
    </>
  );
}

export default LiveCallPage;
