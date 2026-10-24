import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Trash2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useActiveOrganisation, useDeleteOrganisation, usePermissions, useUpdateOrganisation } from "@/features/organisations/hooks/use-organisations";
import { Permissions, type Organisation } from "@/features/organisations/interfaces/organisations.interfaces";
import { getOrgRoleLabel, OrgRoleDescriptionOptions } from "@/config/constants/dropdowns/organisations/org-role-form.options";
import { formatDate } from "@/lib/date";
import { organisationNameSchema, type OrganisationNameFormValues } from "../validation-schemas/organisation.schema";

export function GeneralTab({ organisation }: { organisation: Organisation }) {
  const { t } = useTranslation("organisation");
  const { can } = usePermissions();
  const { organisations } = useActiveOrganisation();
  const update = useUpdateOrganisation();
  const remove = useDeleteOrganisation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const canRename = can(Permissions.ORG_UPDATE);

  const form = useForm<OrganisationNameFormValues>({ resolver: zodResolver(organisationNameSchema), values: { name: organisation.name } });

  return (
    <div className="space-y-4">
      <FormSection title={t("general.details")} description={t("general.detailsDescription", { date: formatDate(organisation.created_at), count: organisation.members_count })}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => update.mutate({ orgId: organisation.id, name: values.name }))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("general.name")}</FormLabel>
                  <FormControl>
                    <Input disabled={!canRename} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {canRename && (
              <Button type="submit" disabled={update.isPending || !form.formState.isDirty} loading={update.isPending}>
                {!update.isPending && <Save />} {t("general.saveName")}
              </Button>
            )}
          </form>
        </Form>
        <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3 text-sm">
          <span className="flex items-center gap-2">
            {t("general.yourRole")} <Badge>{getOrgRoleLabel(organisation.role)}</Badge>
          </span>
          <span className="text-muted-foreground">{OrgRoleDescriptionOptions[organisation.role]}</span>
        </div>
      </FormSection>

      {can(Permissions.ORG_DELETE) && organisations.length > 1 && (
        <FormSection title={t("general.deleteTitle")} description={t("general.deleteDescription")} className="border-destructive/40">
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 /> {t("general.deleteTitle")}
          </Button>
        </FormSection>
      )}

      <Dialog open={deleteOpen} onOpenChange={(open) => !remove.isPending && setDeleteOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("general.deleteDialogTitle", { name: organisation.name })}</DialogTitle>
            <DialogDescription>
              <Trans t={t} i18nKey="general.deleteDialogDescription" values={{ name: organisation.name }} components={{ strong: <span className="font-semibold text-foreground" /> }} />
            </DialogDescription>
          </DialogHeader>
          <Input value={confirmName} onChange={(event) => setConfirmName(event.target.value)} placeholder={organisation.name} aria-label={t("general.confirmAria")} autoComplete="off" />
          <DialogFooter>
            <Button variant="destructive" disabled={confirmName !== organisation.name || remove.isPending} loading={remove.isPending} onClick={() => remove.mutate({ orgId: organisation.id, confirmName })}>
              {t("general.deletePermanently")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
