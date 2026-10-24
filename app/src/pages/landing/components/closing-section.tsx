import { useTranslation } from "react-i18next";
import { LandingActions } from "./landing-actions";

export function ClosingSection() {
  const { t } = useTranslation("landing");
  return (
    <section className="lz-closing lz-section" aria-labelledby="closing-title">
      <div className="lz-wrap">
        <h2 id="closing-title" className="lz-closing__title">
          {t("closing.title")}
        </h2>
        <p className="lz-closing__copy">{t("closing.copy")}</p>
        <div className="lz-hero__actions" style={{ marginTop: "2rem" }}>
          <LandingActions />
        </div>
      </div>
    </section>
  );
}
