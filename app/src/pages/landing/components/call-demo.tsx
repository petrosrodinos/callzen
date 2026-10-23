import { useEffect, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = ["Opening", "Discovery", "Pitch", "Handle objections", "Close"];
const STEP_DELAYS = [700, 1500, 600, 900, 2600, 1800, 1000];
const LAST_STEP = STEP_DELAYS.length;
const CLOCK = ["04:08", "04:09", "04:14", "04:15", "04:17", "04:24", "04:31", "04:33"];
const WAVE_BARS = Array.from({ length: 22 }, (_, i) => i);

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const stageIndexFor = (step: number) => (step >= 7 ? 4 : step >= 3 ? 3 : 2);

export function CallDemo() {
  const [reduced] = useState(prefersReducedMotion);
  const [step, setStep] = useState(reduced ? LAST_STEP : 0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (reduced) return;
    let elapsed = 0;
    const timers = STEP_DELAYS.map((delay, i) => {
      elapsed += delay;
      return window.setTimeout(() => setStep(i + 1), elapsed);
    });
    return () => timers.forEach(window.clearTimeout);
  }, [reduced, run]);

  const replay = () => {
    setStep(0);
    setRun((r) => r + 1);
  };

  const playing = step < LAST_STEP;
  const stageIndex = stageIndexFor(step);

  return (
    <section id="live" className="lz-stage" aria-label="Example of a live call with the CallZen co-pilot">
      <header className="lz-stage__bar">
        <span className="lz-stage__status">
          <span className={cn("lz-wave", playing && "is-live")} aria-hidden="true">
            {WAVE_BARS.map((i) => (
              <span key={i} style={{ ["--i" as string]: i }} />
            ))}
          </span>
          Live call
        </span>
        {!playing && !reduced && (
          <button type="button" className="lz-replay" onClick={replay}>
            <RotateCcw className="size-3.5" aria-hidden="true" /> Replay
          </button>
        )}
        <span className="lz-stage__clock">{CLOCK[step]}</span>
      </header>

      <div className="lz-stage__body">
        <ol className="lz-transcript">
          {step >= 1 && (
            <li className="lz-line lz-line--prospect" key={`p1-${run}`}>
              <span className="lz-line__who">Prospect</span>
              <p className="lz-line__text">
                We like what we&rsquo;ve seen. Honestly, the price is{" "}
                <mark className={cn("lz-mark lz-mark--objection", step >= 2 && "is-on")}>
                  well above what we budgeted
                </mark>
                .
              </p>
            </li>
          )}
          {step >= 5 && (
            <li className="lz-line lz-line--you" key={`y-${run}`}>
              <span className="lz-line__who">You</span>
              <p className="lz-line__text">
                Fair. What range were you working with? You mentioned slow follow-up costs you deals, so let&rsquo;s put
                the two side by side.
              </p>
            </li>
          )}
          {step >= 6 && (
            <li className="lz-line lz-line--prospect" key={`p2-${run}`}>
              <span className="lz-line__who">Prospect</span>
              <p className="lz-line__text">
                Around forty a seat. But yes, we{" "}
                <mark className={cn("lz-mark lz-mark--signal", step >= 7 && "is-on")}>
                  lost two renewals last quarter
                </mark>{" "}
                because nobody called back in time.
              </p>
            </li>
          )}
        </ol>

        <aside className="lz-rail" aria-label="Co-pilot">
          <div>
            <p className="lz-rail__title">Script</p>
            <ol className="lz-stages">
              {STAGES.map((stage, i) => (
                <li
                  key={stage}
                  data-state={i < stageIndex ? "done" : i === stageIndex ? "current" : "next"}
                  aria-current={i === stageIndex ? "step" : undefined}
                >
                  {stage}
                </li>
              ))}
            </ol>
          </div>

          {step >= 3 && (
            <div className="lz-note lz-note--objection" key={`o-${run}`}>
              <p className="lz-note__kind">Price objection</p>
              <p className="lz-note__why">The prospect says the price is above budget.</p>
            </div>
          )}

          {step >= 4 && (
            <div className="lz-note lz-note--reply" key={`r-${run}`}>
              <p className="lz-note__kind">
                Suggested reply
                {step >= 5 && (
                  <span className="lz-said">
                    <Check className="size-3" aria-hidden="true" /> Said
                  </span>
                )}
              </p>
              <p className="lz-note__say">
                &ldquo;What range were you working with? Let&rsquo;s compare it to what slow follow-up costs you.&rdquo;
              </p>
            </div>
          )}

          {step >= 7 && (
            <div className="lz-note lz-note--signal" key={`s-${run}`}>
              <p className="lz-note__kind">Buying signal</p>
              <p className="lz-note__why">They named what slow follow-up costs them. Move to the close and offer a setup call.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
