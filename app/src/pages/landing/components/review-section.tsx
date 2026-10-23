import { useState } from "react";

type MarkerKind = "mistake" | "strength" | "objection";
type Speaker = "you" | "prospect";

const DURATION_SECONDS = 570;

// Bars per speaker turn; they sum to 120 bars across the 9:30 call.
const TURNS: { who: Speaker; bars: number }[] = [
  { who: "you", bars: 8 },
  { who: "prospect", bars: 6 },
  { who: "you", bars: 12 },
  { who: "prospect", bars: 8 },
  { who: "you", bars: 6 },
  { who: "prospect", bars: 18 },
  { who: "you", bars: 6 },
  { who: "prospect", bars: 12 },
  { who: "you", bars: 16 },
  { who: "prospect", bars: 6 },
  { who: "you", bars: 12 },
  { who: "prospect", bars: 10 },
];

const BARS = TURNS.flatMap((turn) => Array.from({ length: turn.bars }, () => turn.who)).map((who, i) => ({
  who,
  height: 18 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.43)) * 78,
}));

const youShare = Math.round((BARS.filter((bar) => bar.who === "you").length / BARS.length) * 100);

const MARKERS: { seconds: number; kind: MarkerKind; text: string }[] = [
  { seconds: 112, kind: "mistake", text: "Pitched before asking how big the team is." },
  { seconds: 252, kind: "objection", text: "Price objection. You asked for their budget before defending the number." },
  { seconds: 400, kind: "strength", text: "Asked what slow follow-up costs them, then let them answer." },
  { seconds: 485, kind: "mistake", text: "Ended with “let me know” instead of booking the next step." },
];

const KIND_LABEL: Record<MarkerKind, string> = {
  mistake: "Mistake",
  strength: "Strength",
  objection: "Objection",
};

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function ReviewSection() {
  const [selected, setSelected] = useState(0);
  const marker = MARKERS[selected];

  return (
    <section id="review" className="lz-section" aria-labelledby="review-title">
      <div className="lz-wrap">
        <div className="lz-review__head">
          <h2 id="review-title" className="lz-h2">
            After the call, see exactly where it turned
          </h2>
          <p className="lz-copy">
            Every call gets a weighted score, category scores, and a list of mistakes and strengths. Each one points to
            the moment in the recording, so you can listen to it instead of guessing.
          </p>
        </div>

        <div className="lz-timeline" role="group" aria-label="Sample call review">
          <div className="lz-timeline__meta">
            <span>
              Sample review, {formatTime(DURATION_SECONDS)} call, score <span className="lz-timeline__score">78</span>
            </span>
            <span className="lz-key" aria-hidden="true">
              <span>
                <i style={{ background: "var(--lz-indigo)" }} /> You
              </span>
              <span>
                <i style={{ background: "var(--lz-amber)" }} /> Prospect
              </span>
            </span>
          </div>

          <div className="lz-track">
            <div className="lz-pins">
              {MARKERS.map((m, i) => (
                <button
                  key={m.seconds}
                  type="button"
                  className={`lz-pin lz-pin--${m.kind}`}
                  style={{ ["--at" as string]: `${(m.seconds / DURATION_SECONDS) * 100}%` }}
                  aria-pressed={i === selected}
                  aria-label={`${KIND_LABEL[m.kind]} at ${formatTime(m.seconds)}`}
                  onClick={() => setSelected(i)}
                />
              ))}
            </div>
            <div className="lz-bars" aria-hidden="true">
              {BARS.map((bar, i) => (
                <span key={i} className={`lz-bar lz-bar--${bar.who}`} style={{ height: `${bar.height}%` }} />
              ))}
            </div>
            <div className="lz-axis" aria-hidden="true">
              <span>0:00</span>
              <span>{formatTime(Math.round(DURATION_SECONDS / 2))}</span>
              <span>{formatTime(DURATION_SECONDS)}</span>
            </div>
          </div>

          <div className={`lz-detail lz-pin--${marker.kind}`} aria-live="polite">
            <p className="lz-detail__kind">
              {KIND_LABEL[marker.kind]} at {formatTime(marker.seconds)}
            </p>
            <p className="lz-detail__text">{marker.text}</p>
          </div>

          <dl className="lz-metrics">
            <div>
              <dt>Talk ratio</dt>
              <dd>
                {youShare} / {100 - youShare}
              </dd>
            </div>
            <div>
              <dt>Pace</dt>
              <dd>148 wpm</dd>
            </div>
            <div>
              <dt>Filler words</dt>
              <dd>9</dd>
            </div>
            <div>
              <dt>Interruptions</dt>
              <dd>2</dd>
            </div>
            <div>
              <dt>Objections</dt>
              <dd>3</dd>
            </div>
          </dl>
        </div>

        <div className="lz-after">
          <div>
            <h3 className="lz-h3">A follow-up draft</h3>
            <p>CallZen writes the email you&rsquo;d send next, based on what the prospect actually said.</p>
          </div>
          <div>
            <h3 className="lz-h3">A practice session to match</h3>
            <p>It suggests the practice prospect that targets the mistakes you made on this call.</p>
          </div>
          <div>
            <h3 className="lz-h3">Trends across calls</h3>
            <p>Your dashboard shows your score over time and the mistakes that keep coming back.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
