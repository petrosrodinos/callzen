import "./landing.css";
import { SiteNav } from "./components/site-nav";
import { Hero } from "./components/hero";
import { WaysSection } from "./components/ways-section";
import { PracticeSection } from "./components/practice-section";
import { ReviewSection } from "./components/review-section";
import { PlaybookSection } from "./components/playbook-section";
import { TeamsSection } from "./components/teams-section";
import { ClosingSection } from "./components/closing-section";
import { SiteFooter } from "./components/site-footer";

export default function LandingPage() {
  return (
    <div className="lz">
      <SiteNav />
      <main>
        <Hero />
        <WaysSection />
        <PracticeSection />
        <ReviewSection />
        <PlaybookSection />
        <TeamsSection />
        <ClosingSection />
      </main>
      <SiteFooter />
    </div>
  );
}
