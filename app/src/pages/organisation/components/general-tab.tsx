import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogOut, Save, Trash2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useDeleteOrganisation, useLeaveOrganisation, usePermissions, useUpdateOrganisation } from "@/features/organisations/hooks/use-organisations";
import { Permissions, type Organisation } from "@/features/organisations/interfaces/organisations.interfaces";
import { getOrgRoleLabel, OrgRoleDescriptionOptions } from "@/config/constants/dropdowns/organisations/org-role-form.options";
import { formatDate } from "@/lib/date";
import { organisationNameSchema, type OrganisationNameFormValues } from "../validation-schemas/organisation.schema";

export function GeneralTab({ organisation }: { organisation: Organisation }) {
  const { can } = usePermissions();
  const update = useUpdateOrganisation();
  const leave = useLeaveOrganisation();
  const remove = useDeleteOrganisation();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const canRename = can(Permissions.ORG_UPDATE);

  const form = useForm<OrganisationNameFormValues>({ resolver: zodResolver(organisationNameSchema), values: { name: organisation.name } });

  return (
    <div className="space-y-4">
      <FormSection title="Details" description={`Created ${formatDate(organisation.created_at)} · ${organisation.members_count} member${organisation.members_count === 1 ? "" : "s"}`}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => update.mutate({ orgId: organisation.id, name: values.name }))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organisation name</FormLabel>
                  <FormControl>
                    <Input disabled={!canRename} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {canRename && (
              <Button type="submit" disabled={update.isPending || !form.formState.isDirty} loading={update.isPending}>
                {!update.isPending && <Save />} Save name
              </Button>
            )}
          </form>
        </Form>
        <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3 text-sm">
          <span className="flex items-center gap-2">
            Your role: <Badge>{getOrgRoleLabel(organisation.role)}</Badge>
          </span>
          <span className="text-muted-foreground">{OrgRoleDescriptionOptions[organisation.role]}</span>
        </div>
      </FormSection>

      <FormSection title="Leave organisation" description="You lose access to this organisation's co-pilots, calls and analyses. Your account and other organisations are unaffected.">
        <Button variant="outline" onClick={() => setLeaveOpen(true)}>
          <LogOut /> Leave {organisation.name}
        </Button>
      </FormSection>

      {can(Permissions.ORG_DELETE) && (
        <FormSection title="Delete organisation" description="Permanently deletes the organisation with all its co-pilots, prospects, calls, recordings and analyses, and removes every member. This cannot be undone." className="border-destructive/40">
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 /> Delete organisation
          </Button>
        </FormSection>
      )}

      <ConfirmationDialog
        isOpen={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onConfirm={() => leave.mutate(organisation.id, { onSuccess: () => setLeaveOpen(false) })}
        title={`Leave ${organisation.name}?`}
        description="You'll need a new invitation to rejoin. Organisations must keep at least one owner, so the last owner can't leave."
        confirmText="Leave"
        variant="destructive"
        isLoading={leave.isPending}
      />

      <Dialog open={deleteOpen} onOpenChange={(open) => !remove.isPending && setDeleteOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {organisation.name}?</DialogTitle>
            <DialogDescription>
              Type <span className="font-semibold text-foreground">{organisation.name}</span> to confirm. Everything in this organisation is deleted for all members.
            </DialogDescription>
          </DialogHeader>
          <Input value={confirmName} onChange={(event) => setConfirmName(event.target.value)} placeholder={organisation.name} aria-label="Type the organisation name to confirm" autoComplete="off" />
          <DialogFooter>
            <Button variant="destructive" disabled={confirmName !== organisation.name || remove.isPending} loading={remove.isPending} onClick={() => remove.mutate({ orgId: organisation.id, confirmName })}>
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
