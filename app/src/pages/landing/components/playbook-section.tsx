import { useTranslation } from "react-i18next";

const ITEMS = ["stages", "objections", "knowledge", "tone", "frequency", "languages"] as const;

export function PlaybookSection() {
  const { t } = useTranslation("landing");
  return (
    <section id="playbook" className="lz-section lz-tint" aria-labelledby="playbook-title">
      <div className="lz-wrap">
        <h2 id="playbook-title" className="lz-h2">
          {t("playbook.title")}
        </h2>
        <p className="lz-copy" style={{ marginTop: "1.5rem" }}>
          {t("playbook.copy")}
        </p>
        <div className="lz-grid lz-grid--three">
          {ITEMS.map((item) => (
            <div key={item}>
              <h3 className="lz-h3">{t(`playbook.items.${item}.title`)}</h3>
              <p>{t(`playbook.items.${item}.text`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
