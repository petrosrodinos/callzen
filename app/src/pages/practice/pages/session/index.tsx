import { useCallback, useEffect, useRef, useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Eye,
  EyeOff,
  Headphones,
  Keyboard,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DetailSkeleton } from "@/components/ui/page-skeletons";
import { LiveAssistPanel } from "@/components/ui/live-assist/live-assist-panel";
import { TranscriptFeed } from "@/components/ui/live-assist/transcript-feed";
import { RecordingIndicator } from "@/components/ui/live-assist/recording-indicator";
import { useCall } from "@/features/calls/hooks/use-calls";
import {
  CallEndReasons,
  CallStatuses,
  Speakers,
} from "@/features/calls/interfaces/calls.interfaces";
import { useCopilotSession } from "@/hooks/use-copilot-session";
import { useFinishCall } from "@/hooks/use-finish-call";
import { useCallClock } from "@/hooks/use-call-clock";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { formatClock } from "@/lib/date";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Routes } from "@/routes/routes";
import { getLeadTemperatureLabel } from "@/config/constants/dropdowns/practice/lead-temperature-form.options";
import { getDifficultyLabel } from "@/config/constants/dropdowns/practice/difficulty-form.options";
import { usePracticeVoice } from "./hooks/use-practice-voice";
import { SpeakingBars } from "./components/speaking-bars";

const PracticeSessionPage: FC = () => {
  const { t } = useTranslation("practice");
  const { callId } = useParams<{ callId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: call, isPending } = useCall(callId);
  const [showTranscript, setShowTranscript] = useState<boolean>(
    (location.state as { showTranscript?: boolean } | null)?.showTranscript ??
      true,
  );
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const clock = useCallClock();
  const endingRef = useRef(false);
  const [ending, setEnding] = useState(false);
  const stopVoiceRef = useRef<() => Promise<Blob | null>>(async () => null);

  usePageMetadata({
    title: call?.title
      ? t("session.pageTitleWithName", { title: call.title })
      : t("session.pageTitle"),
  });

  const copilot = useCopilotSession({ call, getElapsedMs: clock.now });
  const { finish, isFinishing } = useFinishCall(copilot);

  const endSession = useCallback(
    async (reason: (typeof CallEndReasons)[keyof typeof CallEndReasons]) => {
      if (!call || endingRef.current) return;
      endingRef.current = true;
      setEnding(true);
      clock.stop();
      const recording = await stopVoiceRef.current();
      try {
        await finish({
          callId: call.id,
          reason,
          durationSeconds: clock.now() / 1000,
          recording: recording ?? null,
        });
        navigate(Routes.library.detail(call.id), {
          replace: true,
          state: { justEnded: true, reason },
        });
      } catch {
        endingRef.current = false;
        setEnding(false);
      }
    },
    [call, clock, finish, navigate],
  );

  const voice = usePracticeVoice({
    call,
    copilot,
    clock: clock.now,
    onProspectHangUp: () => void endSession(CallEndReasons.PROSPECT_HUNG_UP),
  });
  useEffect(() => {
    stopVoiceRef.current = voice.stop;
  }, [voice.stop]);

  // Auto-start: the click on the briefing screen grants the audio permissions we need.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (
      !call ||
      call.status !== CallStatuses.IN_PROGRESS ||
      autoStarted.current
    )
      return;
    autoStarted.current = true;
    void voice.start().then(() => clock.start());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call]);

  const timeLimitMs = call?.practice?.time_limit_minutes
    ? call.practice.time_limit_minutes * 60000
    : null;
  useEffect(() => {
    // Ending the session tears down WebRTC/recording (external systems), triggered by the timer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (
      timeLimitMs &&
      clock.elapsedMs >= timeLimitMs &&
      voice.status === "live"
    )
      void endSession(CallEndReasons.TIME_LIMIT);
  }, [clock.elapsedMs, endSession, timeLimitMs, voice.status]);

  useEffect(() => {
    if (voice.status !== "live") return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [voice.status]);

  if (isPending) return <DetailSkeleton />;
  if (!call) return <Navigate to={Routes.practice.root} replace />;
  if (call.status !== CallStatuses.IN_PROGRESS && !ending)
    return <Navigate to={Routes.library.detail(call.id)} replace />;

  const practice = call.practice;
  const prospectName = practice?.prospect_name || t("session.prospect");
  const live = voice.status === "live";
  const remainingMs = timeLimitMs
    ? Math.max(0, timeLimitMs - clock.elapsedMs)
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
          <Headphones className="size-3" /> {t("session.badge")}
        </Badge>
        <RecordingIndicator
          state={
            voice.status === "connecting"
              ? "connecting"
              : live
                ? call.keep_recording
                  ? "recording"
                  : "listening"
                : "off"
          }
        />
        {call.copilot_enabled && <Badge variant="outline">{t("session.copilotOn")}</Badge>}
        <span className="ml-auto font-mono text-sm tabular-nums">
          {formatClock(clock.elapsedMs)}
          {remainingMs !== null && (
            <span className="ml-2 text-muted-foreground">
              {t("session.timeLeft", { time: formatClock(remainingMs) })}
            </span>
          )}
        </span>
      </div>

      {voice.error && (
        <Alert variant="destructive">
          <AlertTitle>{t("session.audioProblem")}</AlertTitle>
          <AlertDescription>{voice.error}</AlertDescription>
        </Alert>
      )}

      <div
        className={cn(
          "grid grid-cols-1 gap-4",
          call.copilot_enabled &&
            "lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]",
        )}
      >
        <div className="space-y-4">
          <Card className="relative overflow-hidden p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <span
                  className={cn(
                    "absolute inset-0 rounded-full bg-primary/20 transition-transform duration-300",
                    voice.prospectSpeaking
                      ? "scale-125 animate-pulse"
                      : "scale-100",
                  )}
                />
                <span className="relative flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-semibold text-white">
                  {initials(prospectName)}
                </span>
              </div>
              <h1 className="mt-4 text-xl font-semibold">{prospectName}</h1>
              <p className="text-sm text-muted-foreground">
                {[practice?.job_title, practice?.company]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                {practice?.lead_temperature && (
                  <Badge variant="secondary">
                    {getLeadTemperatureLabel(practice.lead_temperature)}
                  </Badge>
                )}
                {practice?.difficulty && (
                  <Badge variant="outline">
                    {getDifficultyLabel(practice.difficulty)}
                  </Badge>
                )}
              </div>
              <div className="mt-5 h-8" aria-live="polite">
                {voice.status === "connecting" ? (
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />{" "}
                    {t("session.dialing")}
                  </span>
                ) : voice.prospectSpeaking ? (
                  <SpeakingBars label={t("session.isSpeaking", { name: prospectName })} />
                ) : voice.prospectThinking ? (
                  <span className="text-sm text-muted-foreground">…</span>
                ) : voice.userSpeaking ? (
                  <span className="text-sm text-emerald-600">
                    {t("session.youreSpeaking")}
                  </span>
                ) : live ? (
                  <span className="text-sm text-muted-foreground">
                    {t("session.listening")}
                  </span>
                ) : null}
              </div>
              {voice.isBrowser && live && voice.interim && (
                <p className="mt-1 max-w-md text-sm italic text-muted-foreground">
                  {voice.interim}
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-center gap-3">
              {voice.status === "error" || voice.status === "idle" ? (
                <Button
                  size="lg"
                  onClick={() => void voice.start().then(() => clock.start())}
                >
                  <Mic /> {t("session.connect")}
                </Button>
              ) : (
                <>
                  <Button
                    size="icon"
                    variant={voice.micMuted ? "secondary" : "outline"}
                    className="size-12 rounded-full"
                    onClick={voice.toggleMic}
                    disabled={!live}
                    aria-label={
                      voice.micMuted
                        ? t("session.unmute")
                        : t("session.mute")
                    }
                    aria-pressed={voice.micMuted}
                  >
                    {voice.micMuted ? <MicOff /> : <Mic />}
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="size-14 rounded-full shadow-lg"
                    onClick={() => void endSession(CallEndReasons.USER)}
                    disabled={isFinishing || voice.status === "ending"}
                    aria-label={t("session.endCall")}
                  >
                    {isFinishing ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <PhoneOff className="size-6" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant={typing ? "secondary" : "outline"}
                    className="size-12 rounded-full"
                    onClick={() => setTyping((v) => !v)}
                    disabled={!live}
                    aria-label={t("session.typeInstead")}
                    aria-pressed={typing}
                  >
                    <Keyboard />
                  </Button>
                </>
              )}
            </div>

            {typing && live && (
              <form
                className="mx-auto mt-4 flex max-w-md gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  voice.sendTypedLine(typed);
                  setTyped("");
                }}
              >
                <Input
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  placeholder={t("session.typePlaceholder")}
                  aria-label={t("session.typeLine")}
                  autoFocus
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!typed.trim()}
                  aria-label={t("session.send")}
                >
                  <Send />
                </Button>
              </form>
            )}
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t("session.transcript")}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTranscript((v) => !v)}
              >
                {showTranscript ? <EyeOff /> : <Eye />}{" "}
                {showTranscript ? t("session.hide") : t("session.show")}
              </Button>
            </div>
            {showTranscript ? (
              <TranscriptFeed
                segments={copilot.segments}
                prospectLabel={prospectName}
                className="max-h-[45vh] min-h-32"
                interim={
                  voice.isBrowser
                    ? [{ speaker: Speakers.USER, text: voice.interim }]
                    : []
                }
              />
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t("session.transcriptHidden")}
              </p>
            )}
          </Card>
        </div>

        {call.copilot_enabled && (
          <Card className="h-fit p-4 lg:sticky lg:top-20">
            <LiveAssistPanel
              session={copilot}
              script={call.agent_snapshot?.script ?? []}
              agentName={call.agent_snapshot?.name}
            />
          </Card>
        )}
      </div>
    </div>
  );
};

export default PracticeSessionPage;
