import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import type { Permission } from "@/features/organisations/interfaces/organisations.interfaces";
import { getOrgRoleLabel } from "@/config/constants/dropdowns/organisations/org-role-form.options";
import { Routes } from "@/routes/routes";

// UI courtesy only: the API enforces the same permissions on every request.
export function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can, organisation } = usePermissions();
  if (can(permission)) return <>{children}</>;

  return (
    <EmptyState
      icon={Lock}
      title="Your role doesn't allow this"
      description={`${organisation ? `As ${getOrgRoleLabel(organisation.role).toLowerCase() === "admin" ? "an admin" : `a ${getOrgRoleLabel(organisation.role).toLowerCase()}`} in ${organisation.name}, you` : "You"} don't have access to this page. Ask an owner to change your role's permissions.`}
      action={
        <Button asChild variant="outline">
          <Link to={Routes.dashboard}>Back to dashboard</Link>
        </Button>
      }
      className="mx-auto mt-10 max-w-lg"
    />
  );
}
