import { LandingActions } from "./landing-actions";
import { CallDemo } from "./call-demo";

export function Hero() {
  return (
    <header className="lz-hero">
      <div className="lz-wrap">
        <h1 className="lz-hero__title">Know what to say next, while they&rsquo;re still talking.</h1>
        <div className="lz-hero__under">
          <p className="lz-hero__lede">
            CallZen listens to your sales call, flags objections and buying signals as they happen, and suggests your
            next line. Afterwards it scores the call and lets you rehearse the hard parts against AI prospects.
          </p>
          <div className="lz-hero__actions">
            <LandingActions />
          </div>
        </div>
        <CallDemo />
      </div>
    </header>
  );
}
