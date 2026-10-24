import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Info, Lock, RotateCcw, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ListSkeleton } from "@/components/ui/page-skeletons";
import { cn } from "@/lib/utils";
import { useResetRolePermissions, usePermissionCatalog, usePermissions, useRoles, useUpdateRolePermissions } from "@/features/organisations/hooks/use-organisations";
import { OrgRoles, Permissions, type Organisation, type OrgRole, type Permission, type RoleSummary } from "@/features/organisations/interfaces/organisations.interfaces";
import { getOrgRoleLabel, OrgRoleDescriptionOptions, OrgRoleFormOptions } from "@/config/constants/dropdowns/organisations/org-role-form.options";

// Permissions that only make sense together: turning one on turns its prerequisite on, turning the prerequisite off turns dependents off.
const REQUIRES: Partial<Record<Permission, Permission[]>> = {
  [Permissions.AGENTS_MANAGE]: [Permissions.AGENTS_VIEW],
  [Permissions.CALLS_CREATE]: [Permissions.AGENTS_VIEW],
  [Permissions.CALLS_MANAGE_ALL]: [Permissions.CALLS_VIEW_ALL],
  [Permissions.MEMBERS_INVITE]: [Permissions.MEMBERS_VIEW],
  [Permissions.MEMBERS_MANAGE]: [Permissions.MEMBERS_VIEW],
};

const applyToggle = (current: Permission[], permission: Permission, enabled: boolean): Permission[] => {
  const next = new Set(current);
  if (enabled) {
    next.add(permission);
    REQUIRES[permission]?.forEach((required) => next.add(required));
  } else {
    next.delete(permission);
    (Object.entries(REQUIRES) as [Permission, Permission[]][]).forEach(([dependent, required]) => {
      if (required.includes(permission)) next.delete(dependent);
    });
  }
  return [...next];
};

export function RolesTab({ organisation }: { organisation: Organisation }) {
  const { t } = useTranslation("organisation");
  const { can } = usePermissions();
  const { data: roles, isPending } = useRoles(organisation.id);
  const { data: catalog } = usePermissionCatalog();
  const [selected, setSelected] = useState<OrgRole>(OrgRoles.ADMIN);
  const [drafts, setDrafts] = useState<Partial<Record<OrgRole, Permission[]>>>({});
  const update = useUpdateRolePermissions();
  const reset = useResetRolePermissions();
  const canEdit = can(Permissions.ROLES_MANAGE);

  const role: RoleSummary | undefined = roles?.find((item) => item.role === selected);
  const current = drafts[selected] ?? role?.permissions ?? [];
  const editable = canEdit && !!role?.editable;
  const dirty = !!role && !!drafts[selected] && (drafts[selected]!.length !== role.permissions.length || drafts[selected]!.some((p) => !role.permissions.includes(p)));

  const groups = useMemo(() => {
    const map = new Map<string, NonNullable<typeof catalog>>();
    catalog?.forEach((definition) => map.set(definition.group, [...(map.get(definition.group) ?? []), definition]));
    return [...map.entries()];
  }, [catalog]);

  if (isPending || !catalog) return <ListSkeleton rows={5} />;

  const discard = () => setDrafts((previous) => ({ ...previous, [selected]: undefined }));

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div role="tablist" aria-label={t("roles.role")} className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {OrgRoleFormOptions.map((option) => {
            const summary = roles?.find((item) => item.role === option.id);
            return (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={selected === option.id}
                onClick={() => setSelected(option.id)}
                className={cn("flex flex-col items-center rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground", selected === option.id && "bg-background text-foreground shadow")}
              >
                {option.label}
                <span className="text-[11px] font-normal text-muted-foreground">
                  {t("roles.membersCount", { count: summary?.members_count ?? 0 })}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{OrgRoleDescriptionOptions[selected]}</p>
        {!canEdit && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" /> {t("roles.ownersOnlyEdit")}
          </p>
        )}
        {role && !role.editable && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0" /> {t("roles.ownerLocked")}
          </p>
        )}
      </Card>

      {groups.map(([group, definitions]) => (
        <Card key={group} className="p-4 sm:p-5">
          <h3 className="mb-1 text-sm font-semibold">{group}</h3>
          <ul className="divide-y">
            {definitions.map((definition) => {
              const checked = current.includes(definition.key);
              const locked = !role?.editable || definition.owner_only || !canEdit;
              const ownerOnly = definition.owner_only && selected !== OrgRoles.OWNER;
              return (
                <li key={definition.key} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {definition.label}
                      {ownerOnly && (
                        <Badge variant="outline" className="gap-1 text-[10px] font-normal">
                          <Lock className="size-3" /> {t("roles.ownersOnly")}
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{definition.description}</p>
                  </div>
                  <Switch
                    checked={definition.owner_only ? selected === OrgRoles.OWNER : checked}
                    disabled={locked}
                    onCheckedChange={(value) => setDrafts((previous) => ({ ...previous, [selected]: applyToggle(current, definition.key, value) }))}
                    aria-label={t("roles.toggleAria", { permission: definition.label, role: getOrgRoleLabel(selected) })}
                    className="mt-0.5 shrink-0"
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      ))}

      {editable && (
        <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 backdrop-blur sm:-mx-6">
          <div className="pb-safe flex flex-wrap items-center gap-2 px-4 pt-3 sm:px-6">
            <Button variant="ghost" onClick={() => reset.mutate({ orgId: organisation.id, role: selected }, { onSuccess: discard })} disabled={reset.isPending || (!role?.customised && !dirty)}>
              <RotateCcw /> {t("roles.reset")}
            </Button>
            <span className="hidden text-xs text-muted-foreground sm:inline">{dirty ? t("roles.unsaved") : role?.customised ? t("roles.customised") : t("roles.usingPreset")}</span>
            <div className="ml-auto flex gap-2">
              {dirty && (
                <Button variant="outline" onClick={discard}>
                  {t("roles.discard")}
                </Button>
              )}
              <Button onClick={() => update.mutate({ orgId: organisation.id, role: selected, permissions: current }, { onSuccess: discard })} disabled={!dirty || update.isPending} loading={update.isPending}>
                {!update.isPending && <Save />} {t("roles.save", { role: getOrgRoleLabel(selected) })}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
