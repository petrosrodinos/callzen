import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, Check, Copy, Link2, Mail, RefreshCw, Send } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/page-skeletons";
import { useInvitations, useInviteMember, usePermissions, useResendInvitation, useRevokeInvitation } from "@/features/organisations/hooks/use-organisations";
import { InvitationStatuses, OrgRoles, type Invitation, type Organisation } from "@/features/organisations/interfaces/organisations.interfaces";
import { getOrgRoleLabel } from "@/config/constants/dropdowns/organisations/org-role-form.options";
import { getInvitationStatusLabel } from "@/config/constants/dropdowns/organisations/invitation-status.options";
import { toast } from "@/hooks/use-toast";
import { formatDateTime, formatRelative } from "@/lib/date";
import { cn } from "@/lib/utils";
import { inviteMemberSchema, type InviteMemberFormValues } from "../validation-schemas/organisation.schema";
import { assignableRoles } from "../utils/role-rules.utils";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "border-sky-500/40 text-sky-700 dark:text-sky-300",
  EXPIRED: "border-amber-500/40 text-amber-700 dark:text-amber-300",
  ACCEPTED: "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
  REVOKED: "text-muted-foreground",
};

export function InvitationsTab({ organisation }: { organisation: Organisation }) {
  const { role: myRole } = usePermissions();
  const { data: invitations, isPending } = useInvitations(organisation.id);
  const invite = useInviteMember();
  const resend = useResendInvitation();
  const revoke = useRevokeInvitation();
  const [toRevoke, setToRevoke] = useState<Invitation | null>(null);
  // Links are only known right after they are issued (the server stores a hash), so remember them here.
  const [links, setLinks] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const roleChoices = assignableRoles(myRole);

  const form = useForm<InviteMemberFormValues>({ resolver: zodResolver(inviteMemberSchema), defaultValues: { email: "", role: OrgRoles.MEMBER } });

  const copy = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      window.setTimeout(() => setCopied((current) => (current === id ? null : current)), 1600);
    } catch {
      toast({ title: "Copy failed", description: "Select the link and copy it manually.", variant: "error" });
    }
  };

  const onInvite = (values: InviteMemberFormValues) =>
    invite.mutate(
      { orgId: organisation.id, email: values.email, role: values.role },
      {
        onSuccess: (result) => {
          setLinks((previous) => ({ ...previous, [result.invitation.id]: result.invite_url }));
          form.reset({ email: "", role: values.role });
        },
      },
    );

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <h2 className="font-semibold">Invite someone</h2>
        <p className="mb-4 text-sm text-muted-foreground">They get an email with a link that works for 7 days. Anyone can belong to several organisations, so existing CallZen users just accept and switch.</p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onInvite)} className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="sr-only">Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="teammate@company.com" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem className="sm:w-36">
                  <FormLabel className="sr-only">Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger aria-label="Role">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roleChoices.map((role) => (
                        <SelectItem key={role} value={role}>
                          {getOrgRoleLabel(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={invite.isPending} loading={invite.isPending}>
              {!invite.isPending && <Send />} Send invitation
            </Button>
          </form>
        </Form>
      </Card>

      {isPending ? (
        <ListSkeleton rows={3} />
      ) : !invitations?.length ? (
        <EmptyState icon={Mail} title="No invitations yet" description="Invitations you send appear here so you can resend or revoke them." />
      ) : (
        <Card>
          <ul className="divide-y">
            {invitations.map((invitation) => {
              const pending = invitation.status === InvitationStatuses.PENDING;
              const link = links[invitation.id];
              return (
                <li key={invitation.id} className="space-y-3 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{invitation.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {getOrgRoleLabel(invitation.role)} · invited {formatRelative(invitation.created_at)}
                        {invitation.invited_by && ` by ${invitation.invited_by}`}
                        {invitation.send_count > 1 && ` · sent ${invitation.send_count}×`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pending ? `Expires ${formatDateTime(invitation.expires_at)}` : invitation.status === InvitationStatuses.EXPIRED ? `Expired ${formatRelative(invitation.expires_at)}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn("w-fit", STATUS_STYLES[invitation.status])}>
                      {getInvitationStatusLabel(invitation.status)}
                    </Badge>
                    {(pending || invitation.status === InvitationStatuses.EXPIRED) && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => resend.mutate({ orgId: organisation.id, invitationId: invitation.id }, { onSuccess: (result) => setLinks((previous) => ({ ...previous, [invitation.id]: result.invite_url })) })} disabled={resend.isPending && resend.variables?.invitationId === invitation.id}>
                          <RefreshCw className={cn(resend.isPending && resend.variables?.invitationId === invitation.id && "animate-spin")} /> Resend
                        </Button>
                        {pending && (
                          <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => setToRevoke(invitation)}>
                            <Ban /> Revoke
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  {link && pending && (
                    <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-2">
                      <Link2 className="size-4 shrink-0 text-muted-foreground" />
                      <code className="min-w-0 flex-1 truncate text-xs">{link}</code>
                      <Button size="sm" variant="outline" className="shrink-0" onClick={() => void copy(invitation.id, link)}>
                        {copied === invitation.id ? <Check /> : <Copy />} {copied === invitation.id ? "Copied" : "Copy link"}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <ConfirmationDialog
        isOpen={!!toRevoke}
        onClose={() => setToRevoke(null)}
        onConfirm={() => toRevoke && revoke.mutate({ orgId: organisation.id, invitationId: toRevoke.id }, { onSuccess: () => setToRevoke(null) })}
        title={`Revoke the invitation for ${toRevoke?.email}?`}
        description="The link stops working immediately. You can send a new invitation any time."
        confirmText="Revoke"
        variant="destructive"
        isLoading={revoke.isPending}
      />
    </div>
  );
}

