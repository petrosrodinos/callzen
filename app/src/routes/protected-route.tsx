import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { RoleTypes, type RoleType } from "@/features/user/interfaces/user.interface";
import { Routes } from "@/routes/routes";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: RoleType[];
  loggedIn?: boolean;
  fallbackPath?: string;
}

export default function ProtectedRoute({ children, requiredRoles, loggedIn, fallbackPath = Routes.auth.sign_in }: ProtectedRouteProps) {
  const { isLoggedIn, role } = useAuthStore();

  if (!isLoggedIn && loggedIn) {
    return <Navigate to={fallbackPath} replace />;
  }

  if (isLoggedIn && !loggedIn) {
    return <Navigate to={Routes.dashboard} replace />;
  }

  if (requiredRoles && !requiredRoles.includes(role || RoleTypes.USER) && role !== RoleTypes.SUPER_ADMIN) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
