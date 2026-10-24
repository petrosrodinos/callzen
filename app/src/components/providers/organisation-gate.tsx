import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { DetailSkeleton } from "@/components/ui/page-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { useOrganisations } from "@/features/organisations/hooks/use-organisations";
import { useOrganisationStore } from "@/stores/organisation";
import { useAuthStore } from "@/stores/auth";
import { Routes } from "@/routes/routes";
import { useTranslation } from "react-i18next";

// Makes sure there is a valid active organisation before any organisation-scoped page renders.
export function OrganisationGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation("common");
  const { data: organisations, isPending, isError, refetch } = useOrganisations();
  const activeId = useOrganisationStore((state) => state.activeOrganisationId);
  const setActive = useOrganisationStore((state) => state.setActiveOrganisationId);
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);

  const valid = !!organisations?.some((organisation) => organisation.id === activeId);

  useEffect(() => {
    if (organisations?.length && !valid) setActive(organisations[0].id);
  }, [organisations, setActive, valid]);

  if (isPending) return <DetailSkeleton />;

  if (isError) {
    return (
      <EmptyState
        icon={Building2}
        title={t("organisationGate.errorTitle")}
        description={t("organisationGate.errorDescription")}
        action={
          <div className="flex gap-2">
            <Button onClick={() => void refetch()}>{t("organisationGate.retry")}</Button>
            <Button variant="outline" onClick={() => logout()}>
              {t("organisationGate.signOut")}
            </Button>
          </div>
        }
        className="mx-auto mt-10 max-w-lg"
      />
    );
  }

  if (!organisations?.length) {
    // Memberships can all disappear (removed everywhere); the API creates a personal one on demand.
    return location.pathname === Routes.dashboard ? <EmptyState icon={Building2} title={t("organisationGate.emptyTitle")} description={t("organisationGate.emptyDescription")} action={<Button onClick={() => window.location.reload()}>{t("organisationGate.reload")}</Button>} className="mx-auto mt-10 max-w-lg" /> : <Navigate to={Routes.dashboard} replace />;
  }

  if (!valid) return <DetailSkeleton />;
  return <>{children}</>;
}
