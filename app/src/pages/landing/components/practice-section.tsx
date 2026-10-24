import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

const SECRETS = [
  { key: "pain", width: "78%" },
  { key: "objection", width: "62%" },
  { key: "yes", width: "70%" },
] as const;

export function PracticeSection() {
  const { t } = useTranslation("landing");
  const [revealed, setRevealed] = useState(false);

  return (
    <section id="practice" className="lz-section lz-tint" aria-labelledby="practice-title">
      <div className="lz-wrap lz-split">
        <div>
          <h2 id="practice-title" className="lz-h2">
            {t("practice.title")}
          </h2>
          <p className="lz-copy" style={{ marginTop: "1.5rem" }}>
            {t("practice.intro")}
          </p>
          <div className="lz-points">
            <div>
              <h3 className="lz-h3">{t("practice.describe.title")}</h3>
              <p>{t("practice.describe.text")}</p>
            </div>
            <div>
              <h3 className="lz-h3">{t("practice.replay.title")}</h3>
              <p>{t("practice.replay.text")}</p>
            </div>
            <div>
              <h3 className="lz-h3">{t("practice.withCopilot.title")}</h3>
              <p>{t("practice.withCopilot.text")}</p>
            </div>
          </div>
        </div>

        <article className="lz-dossier" aria-label={t("practice.dossier.aria")}>
          <div className="lz-dossier__head">
            <span className="lz-dossier__avatar" aria-hidden="true">
              DW
            </span>
            <div>
              <h3 className="lz-dossier__name">Dana Whitfield</h3>
              <p className="lz-dossier__role">{t("practice.dossier.role")}</p>
            </div>
          </div>
          <ul className="lz-dossier__traits">
            <li>{t("practice.dossier.difficulty")}</li>
            <li>{t("practice.dossier.patience")}</li>
            <li>{t("practice.dossier.voice")}</li>
          </ul>

          <p className="lz-dossier__label">{t("practice.dossier.knownLabel")}</p>
          <p className="lz-dossier__known">{t("practice.dossier.known")}</p>

          <p className="lz-dossier__label">{t("practice.dossier.secretsLabel")}</p>
          <dl className="lz-secrets">
            {SECRETS.map((secret) => (
              <div className="lz-secret" key={secret.key}>
                <dt>{t(`practice.secrets.${secret.key}.label`)}</dt>
                <dd>
                  {revealed ? (
                    <span className="lz-secret__text">{t(`practice.secrets.${secret.key}.text`)}</span>
                  ) : (
                    <>
                      <span className="lz-secret__bar" style={{ width: secret.width }} aria-hidden="true" />
                      <span className="lz-sr">{t("practice.dossier.hidden")}</span>
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>

          <div className="lz-dossier__foot">
            <span className="lz-dossier__hint">
              {revealed ? t("practice.dossier.hintRevealed") : t("practice.dossier.hintHidden")}
            </span>
            <button
              type="button"
              className="lz-btn lz-btn--quiet lz-btn--small"
              aria-pressed={revealed}
              onClick={() => setRevealed((value) => !value)}
            >
              {revealed ? (
                <>
                  <EyeOff className="size-4" aria-hidden="true" /> {t("practice.dossier.hide")}
                </>
              ) : (
                <>
                  <Eye className="size-4" aria-hidden="true" /> {t("practice.dossier.reveal")}
                </>
              )}
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
