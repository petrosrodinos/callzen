import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Routes } from "@/routes/routes";
import { useAuthStore } from "@/stores/auth";

export function SiteFooter() {
  const { t } = useTranslation("landing");
  const { isLoggedIn } = useAuthStore();

  return (
    <footer className="lz-wrap lz-footer">
      <BrandLogo />
      <span>{t("footer.consent")}</span>
      <nav className="lz-footer__links" aria-label={t("footer.aria")}>
        {isLoggedIn ? (
          <Link to={Routes.dashboard}>{t("footer.dashboard")}</Link>
        ) : (
          <>
            <Link to={Routes.auth.sign_in}>{t("footer.signIn")}</Link>
            <Link to={Routes.auth.sign_up}>{t("footer.createAccount")}</Link>
          </>
        )}
      </nav>
    </footer>
  );
}
