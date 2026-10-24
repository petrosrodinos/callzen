import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";

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

const MARKERS: { seconds: number; kind: MarkerKind; key: string }[] = [
  { seconds: 112, kind: "mistake", key: "pitchedEarly" },
  { seconds: 252, kind: "objection", key: "priceObjection" },
  { seconds: 400, kind: "strength", key: "askedCost" },
  { seconds: 485, kind: "mistake", key: "weakClose" },
];

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function ReviewSection() {
  const { t } = useTranslation("landing");
  const [selected, setSelected] = useState(0);
  const marker = MARKERS[selected];

  return (
    <section id="review" className="lz-section" aria-labelledby="review-title">
      <div className="lz-wrap">
        <div className="lz-review__head">
          <h2 id="review-title" className="lz-h2">
            {t("review.title")}
          </h2>
          <p className="lz-copy">{t("review.copy")}</p>
        </div>

        <div className="lz-timeline" role="group" aria-label={t("review.aria")}>
          <div className="lz-timeline__meta">
            <span>
              <Trans
                t={t}
                i18nKey="review.sample"
                values={{ duration: formatTime(DURATION_SECONDS) }}
                components={{ score: <span className="lz-timeline__score" /> }}
              />
            </span>
            <span className="lz-key" aria-hidden="true">
              <span>
                <i style={{ background: "var(--lz-indigo)" }} /> {t("review.you")}
              </span>
              <span>
                <i style={{ background: "var(--lz-amber)" }} /> {t("review.prospect")}
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
                  aria-label={t("review.markerAt", { kind: t(`review.kinds.${m.kind}`), time: formatTime(m.seconds) })}
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
              {t("review.markerAt", { kind: t(`review.kinds.${marker.kind}`), time: formatTime(marker.seconds) })}
            </p>
            <p className="lz-detail__text">{t(`review.markers.${marker.key}`)}</p>
          </div>

          <dl className="lz-metrics">
            <div>
              <dt>{t("review.metrics.talkRatio")}</dt>
              <dd>
                {youShare} / {100 - youShare}
              </dd>
            </div>
            <div>
              <dt>{t("review.metrics.pace")}</dt>
              <dd>{t("review.metrics.paceValue")}</dd>
            </div>
            <div>
              <dt>{t("review.metrics.fillers")}</dt>
              <dd>9</dd>
            </div>
            <div>
              <dt>{t("review.metrics.interruptions")}</dt>
              <dd>2</dd>
            </div>
            <div>
              <dt>{t("review.metrics.objections")}</dt>
              <dd>3</dd>
            </div>
          </dl>
        </div>

        <div className="lz-after">
          <div>
            <h3 className="lz-h3">{t("review.after.followUp.title")}</h3>
            <p>{t("review.after.followUp.text")}</p>
          </div>
          <div>
            <h3 className="lz-h3">{t("review.after.practice.title")}</h3>
            <p>{t("review.after.practice.text")}</p>
          </div>
          <div>
            <h3 className="lz-h3">{t("review.after.trends.title")}</h3>
            <p>{t("review.after.trends.text")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
