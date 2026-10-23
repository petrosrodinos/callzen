import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Routes } from "@/routes/routes";
import { useAuthStore } from "@/stores/auth";

export function SiteFooter() {
  const { isLoggedIn } = useAuthStore();

  return (
    <footer className="lz-wrap lz-footer">
      <BrandLogo />
      <span>Always get consent before recording a call.</span>
      <nav className="lz-footer__links" aria-label="Footer">
        {isLoggedIn ? (
          <Link to={Routes.dashboard}>Dashboard</Link>
        ) : (
          <>
            <Link to={Routes.auth.sign_in}>Sign in</Link>
            <Link to={Routes.auth.sign_up}>Create account</Link>
          </>
        )}
      </nav>
    </footer>
  );
}
