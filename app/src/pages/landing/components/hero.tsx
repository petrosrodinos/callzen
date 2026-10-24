import { useTranslation } from "react-i18next";
import { LandingActions } from "./landing-actions";
import { CallDemo } from "./call-demo";

export function Hero() {
  const { t } = useTranslation("landing");
  return (
    <header className="lz-hero">
      <div className="lz-wrap">
        <h1 className="lz-hero__title">{t("hero.title")}</h1>
        <div className="lz-hero__under">
          <p className="lz-hero__lede">{t("hero.lede")}</p>
          <div className="lz-hero__actions">
            <LandingActions />
          </div>
        </div>
        <CallDemo />
      </div>
    </header>
  );
}
