import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const SECRETS = [
  { label: "Pain point", text: "Lost two renewals last quarter to slow follow-up.", width: "78%" },
  { label: "Objection she'll raise", text: "“We already have a tool for this.”", width: "62%" },
  { label: "What makes her say yes", text: "A setup that takes under a week.", width: "70%" },
];

export function PracticeSection() {
  const [revealed, setRevealed] = useState(false);

  return (
    <section id="practice" className="lz-section lz-tint" aria-labelledby="practice-title">
      <div className="lz-wrap lz-split">
        <div>
          <h2 id="practice-title" className="lz-h2">
            Rehearse on a prospect who pushes back
          </h2>
          <p className="lz-copy" style={{ marginTop: "1.5rem" }}>
            Practice prospects behave like buyers. They keep their real pain points to themselves, save objections for
            the awkward moment, and run out of patience. Interrupt one mid-sentence and it stops to answer you, by
            voice.
          </p>
          <div className="lz-points">
            <div>
              <h3 className="lz-h3">Describe, don&rsquo;t configure</h3>
              <p>Write one sentence about who you&rsquo;re calling and CallZen builds the prospect for you.</p>
            </div>
            <div>
              <h3 className="lz-h3">Replay a call that went wrong</h3>
              <p>Turn a real prospect from a live call into a practice prospect and take another run at them.</p>
            </div>
            <div>
              <h3 className="lz-h3">Practice with or without the co-pilot</h3>
              <p>Keep suggestions on while you learn, then turn them off to see how you do alone.</p>
            </div>
          </div>
        </div>

        <article className="lz-dossier" aria-label="Example practice prospect">
          <div className="lz-dossier__head">
            <span className="lz-dossier__avatar" aria-hidden="true">
              DW
            </span>
            <div>
              <h3 className="lz-dossier__name">Dana Whitfield</h3>
              <p className="lz-dossier__role">Head of operations, regional logistics firm</p>
            </div>
          </div>
          <ul className="lz-dossier__traits">
            <li>Difficulty: hard</li>
            <li>Patience: low</li>
            <li>Voice call</li>
          </ul>

          <p className="lz-dossier__label">What you know</p>
          <p className="lz-dossier__known">Replied to your cold email. Runs a team of twelve reps.</p>

          <p className="lz-dossier__label">What she isn&rsquo;t telling you</p>
          <dl className="lz-secrets">
            {SECRETS.map((secret) => (
              <div className="lz-secret" key={secret.label}>
                <dt>{secret.label}</dt>
                <dd>
                  {revealed ? (
                    <span className="lz-secret__text">{secret.text}</span>
                  ) : (
                    <>
                      <span className="lz-secret__bar" style={{ width: secret.width }} aria-hidden="true" />
                      <span className="lz-sr">Hidden until you reveal it</span>
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>

          <div className="lz-dossier__foot">
            <span className="lz-dossier__hint">
              {revealed ? "This is what the review shows you." : "In practice, you find these out on the call."}
            </span>
            <button
              type="button"
              className="lz-btn lz-btn--quiet lz-btn--small"
              aria-pressed={revealed}
              onClick={() => setRevealed((value) => !value)}
            >
              {revealed ? (
                <>
                  <EyeOff className="size-4" aria-hidden="true" /> Hide again
                </>
              ) : (
                <>
                  <Eye className="size-4" aria-hidden="true" /> Reveal after the call
                </>
              )}
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
