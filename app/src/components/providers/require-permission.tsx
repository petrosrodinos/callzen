import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import type { Permission } from "@/features/organisations/interfaces/organisations.interfaces";
import { getOrgRoleLabel } from "@/config/constants/dropdowns/organisations/org-role-form.options";
import { Routes } from "@/routes/routes";
import { useTranslation } from "react-i18next";

// UI courtesy only: the API enforces the same permissions on every request.
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { t } = useTranslation("common");
  const { can, organisation } = usePermissions();
  if (can(permission)) return <>{children}</>;

  return (
    <EmptyState
      icon={Lock}
      title={t("requirePermission.title")}
      description={organisation ? t("requirePermission.descriptionWithOrg", { role: getOrgRoleLabel(organisation.role).toLowerCase(), organisation: organisation.name }) : t("requirePermission.description")}
      action={
        <Button asChild variant="outline">
          <Link to={Routes.dashboard}>{t("requirePermission.back")}</Link>
        </Button>
      }
      className="mx-auto mt-10 max-w-lg"
    />
  );
}
