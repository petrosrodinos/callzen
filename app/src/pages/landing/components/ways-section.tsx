import { useTranslation } from "react-i18next";

export function WaysSection() {
  const { t } = useTranslation("landing");
  return (
    <section className="lz-section" aria-labelledby="ways-title">
      <div className="lz-wrap">
        <h2 id="ways-title" className="lz-h2">
          {t("ways.title")}
        </h2>
        <div className="lz-ways">
          <div>
            <h3 className="lz-h3">{t("ways.phone.title")}</h3>
            <p>{t("ways.phone.text")}</p>
          </div>
          <div>
            <h3 className="lz-h3">{t("ways.online.title")}</h3>
            <p>{t("ways.online.text")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
