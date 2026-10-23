import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { Routes } from "@/routes/routes";

export function LandingActions() {
  const { isLoggedIn } = useAuthStore();

  if (isLoggedIn) {
    return (
      <Link to={Routes.dashboard} className="lz-btn lz-btn--primary">
        Open dashboard
      </Link>
    );
  }

  return (
    <>
      <Link to={Routes.auth.sign_up} className="lz-btn lz-btn--primary">
        Create your account
      </Link>
      <Link to={Routes.auth.sign_in} className="lz-btn lz-btn--quiet">
        Sign in
      </Link>
    </>
  );
}
