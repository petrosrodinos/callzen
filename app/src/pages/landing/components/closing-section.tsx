import { LandingActions } from "./landing-actions";

export function ClosingSection() {
  return (
    <section className="lz-closing lz-section" aria-labelledby="closing-title">
      <div className="lz-wrap">
        <h2 id="closing-title" className="lz-closing__title">
          Take your next call with a co-pilot.
        </h2>
        <p className="lz-closing__copy">
          Set up your first co-pilot, start a call, and see the suggestions arrive while the prospect is still talking.
        </p>
        <div className="lz-hero__actions" style={{ marginTop: "2rem" }}>
          <LandingActions />
        </div>
      </div>
    </section>
  );
}
