import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/auth";
import { Routes } from "@/routes/routes";

export function LandingActions() {
  const { t } = useTranslation("landing");
  const { isLoggedIn } = useAuthStore();

  if (isLoggedIn) {
    return (
      <Link to={Routes.dashboard} className="lz-btn lz-btn--primary">
        {t("actions.openDashboard")}
      </Link>
    );
  }

  return (
    <>
      <Link to={Routes.auth.sign_up} className="lz-btn lz-btn--primary">
        {t("actions.createAccount")}
      </Link>
      <Link to={Routes.auth.sign_in} className="lz-btn lz-btn--quiet">
        {t("actions.signIn")}
      </Link>
    </>
  );
}
