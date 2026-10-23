import { useState } from "react";
import { UserMinus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { ListSkeleton } from "@/components/ui/page-skeletons";
import { useMembers, usePermissions, useRemoveMember, useUpdateMemberRole } from "@/features/organisations/hooks/use-organisations";
import { OrgRoles, Permissions, type Member, type Organisation, type OrgRole } from "@/features/organisations/interfaces/organisations.interfaces";
import { getOrgRoleLabel } from "@/config/constants/dropdowns/organisations/org-role-form.options";
import { formatDate } from "@/lib/date";
import { initials } from "@/lib/format";
import { assignableRoles } from "../utils/role-rules.utils";

export function MembersTab({ organisation }: { organisation: Organisation }) {
  const { can, role: myRole } = usePermissions();
  const { data: members, isPending } = useMembers(organisation.id);
  const updateRole = useUpdateMemberRole();
  const remove = useRemoveMember();
  const [toRemove, setToRemove] = useState<Member | null>(null);
  const canManage = can(Permissions.MEMBERS_MANAGE);
  const roleChoices = assignableRoles(myRole);

  if (isPending) return <ListSkeleton rows={4} />;

  return (
    <>
      <Card>
        <ul className="divide-y">
          {members?.map((member) => (
            <li key={member.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar className="size-9 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary">{initials(member.full_name || member.email)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    <span className="truncate">{member.full_name || member.email}</span>
                    {member.is_you && <Badge variant="outline">You</Badge>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.email} · joined {formatDate(member.joined_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:shrink-0">
                {canManage && (member.can_change_role || (member.is_you && myRole === OrgRoles.OWNER)) ? (
                  <Select value={member.role} onValueChange={(value) => updateRole.mutate({ orgId: organisation.id, memberId: member.id, role: value as OrgRole })} disabled={updateRole.isPending}>
                    <SelectTrigger className="h-9 w-full sm:w-32" aria-label={`Role of ${member.full_name || member.email}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(member.is_you ? [OrgRoles.OWNER, OrgRoles.ADMIN, OrgRoles.MEMBER] : roleChoices).map((choice) => (
                        <SelectItem key={choice} value={choice}>
                          {getOrgRoleLabel(choice)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={member.role === OrgRoles.OWNER ? "default" : "secondary"} className="h-7">
                    {getOrgRoleLabel(member.role)}
                  </Badge>
                )}
                {canManage && member.can_remove && (
                  <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setToRemove(member)} aria-label={`Remove ${member.full_name || member.email}`}>
                    <UserMinus />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <ConfirmationDialog
        isOpen={!!toRemove}
        onClose={() => setToRemove(null)}
        onConfirm={() => toRemove && remove.mutate({ orgId: organisation.id, memberId: toRemove.id }, { onSuccess: () => setToRemove(null) })}
        title={`Remove ${toRemove?.full_name || toRemove?.email}?`}
        description="They lose access to this organisation immediately. Calls they made stay in the organisation. They can be invited again later."
        confirmText="Remove"
        variant="destructive"
        isLoading={remove.isPending}
      />
    </>
  );
}
