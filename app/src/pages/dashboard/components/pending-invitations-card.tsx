import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, MailPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useAcceptInvitationById,
  useMyInvitations,
} from "@/features/organisations/hooks/use-organisations";
import { getOrgRoleLabel } from "@/config/constants/dropdowns/organisations/org-role-form.options";
import { formatRelative } from "@/lib/date";
import { Routes } from "@/routes/routes";

// Invitations addressed to the signed-in user's email, shown wherever they land first.
export function PendingInvitationsCard() {
  const { t } = useTranslation("dashboard");
  const navigate = useNavigate();
  const { data: invitations } = useMyInvitations();
  const accept = useAcceptInvitationById();
  if (!invitations?.length) return null;

  return (
    <Card className="border-primary/30 bg-primary/5 p-4 sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <MailPlus className="size-4 text-primary" /> {t("invitations.title")}
      </h2>
      <ul className="space-y-2">
        {invitations.map((invitation) => (
          <li
            key={invitation.id}
            className="flex flex-col gap-2 rounded-lg bg-background p-3 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {invitation.organisation_name}{" "}
                <Badge variant="secondary">
                  {getOrgRoleLabel(invitation.role)}
                </Badge>
              </p>
              <p className="text-xs text-muted-foreground">
                {invitation.invited_by
                  ? `${t("invitations.from", { name: invitation.invited_by })} · `
                  : ""}
                {t("invitations.expires", {
                  when: formatRelative(invitation.expires_at),
                })}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() =>
                accept.mutate(invitation.id, {
                  onSuccess: () => navigate(Routes.dashboard),
                })
              }
              disabled={accept.isPending}
              loading={accept.isPending && accept.variables === invitation.id}
            >
              {!(accept.isPending && accept.variables === invitation.id) && (
                <Check />
              )}{" "}
              {t("invitations.accept")}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
