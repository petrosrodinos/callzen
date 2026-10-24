import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { UiLanguageSwitch } from "@/components/ui/ui-language-switch";
import { Routes } from "@/routes/routes";
import { useAuthStore } from "@/stores/auth";

const LINKS = [
  { href: "#live", key: "live" },
  { href: "#practice", key: "practice" },
  { href: "#review", key: "reviews" },
  { href: "#teams", key: "teams" },
] as const;

export function SiteNav() {
  const { t } = useTranslation("landing");
  const { isLoggedIn } = useAuthStore();

  return (
    <nav className="lz-nav" aria-label={t("nav.aria")}>
      <div className="lz-wrap lz-nav__row">
        <Link to={Routes.root} aria-label={t("nav.home")}>
          <BrandLogo />
        </Link>
        <div className="lz-nav__links">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="lz-nav__link">
              {t(`nav.${link.key}`)}
            </a>
          ))}
        </div>
        <div className="lz-nav__end">
          <ThemeSwitch />
          <UiLanguageSwitch />
          {isLoggedIn ? (
            <Link to={Routes.dashboard} className="lz-btn lz-btn--primary lz-btn--small">
              {t("actions.openDashboard")}
            </Link>
          ) : (
            <>
              <Link to={Routes.auth.sign_in} className="lz-btn lz-btn--quiet lz-btn--small lz-nav__signin">
                {t("actions.signIn")}
              </Link>
              <Link to={Routes.auth.sign_up} className="lz-btn lz-btn--primary lz-btn--small">
                {t("nav.createAccount")}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
