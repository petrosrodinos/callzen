import { useTranslation } from "react-i18next";

export function TeamsSection() {
  const { t } = useTranslation("landing");
  return (
    <section id="teams" className="lz-section" aria-labelledby="teams-title">
      <div className="lz-wrap lz-split">
        <div>
          <h2 id="teams-title" className="lz-h2">
            {t("teams.title")}
          </h2>
          <p className="lz-copy" style={{ marginTop: "1.5rem" }}>
            {t("teams.copy")}
          </p>
          <dl className="lz-roles">
            <div>
              <dt>{t("teams.roles.owner.name")}</dt>
              <dd>{t("teams.roles.owner.text")}</dd>
            </div>
            <div>
              <dt>{t("teams.roles.admin.name")}</dt>
              <dd>{t("teams.roles.admin.text")}</dd>
            </div>
            <div>
              <dt>{t("teams.roles.member.name")}</dt>
              <dd>{t("teams.roles.member.text")}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h2 className="lz-h2">{t("teams.consent.title")}</h2>
          <p className="lz-copy" style={{ marginTop: "1.5rem" }}>
            {t("teams.consent.copy")}
          </p>
        </div>
      </div>
    </section>
  );
}
