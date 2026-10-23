import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { Routes } from "@/routes/routes";
import { useAuthStore } from "@/stores/auth";

const LINKS = [
  { href: "#live", label: "Live co-pilot" },
  { href: "#practice", label: "Practice" },
  { href: "#review", label: "Call reviews" },
  { href: "#teams", label: "Teams" },
];

export function SiteNav() {
  const { isLoggedIn } = useAuthStore();

  return (
    <nav className="lz-nav" aria-label="Main">
      <div className="lz-wrap lz-nav__row">
        <Link to={Routes.root} aria-label="CallZen home">
          <BrandLogo />
        </Link>
        <div className="lz-nav__links">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="lz-nav__link">
              {link.label}
            </a>
          ))}
        </div>
        <div className="lz-nav__end">
          <ThemeSwitch />
          {isLoggedIn ? (
            <Link to={Routes.dashboard} className="lz-btn lz-btn--primary lz-btn--small">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link to={Routes.auth.sign_in} className="lz-btn lz-btn--quiet lz-btn--small lz-nav__signin">
                Sign in
              </Link>
              <Link to={Routes.auth.sign_up} className="lz-btn lz-btn--primary lz-btn--small">
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
