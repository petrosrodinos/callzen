import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Building2, Mail, Settings2, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailSkeleton } from "@/components/ui/page-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { getOrgRoleLabel } from "@/config/constants/dropdowns/organisations/org-role-form.options";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { GeneralTab } from "./components/general-tab";
import { MembersTab } from "./components/members-tab";
import { InvitationsTab } from "./components/invitations-tab";
import { RolesTab } from "./components/roles-tab";

const OrganisationPage: FC = () => {
  const { t } = useTranslation("organisation");
  usePageMetadata({ title: t("page.title") });
  const { organisation, can, isPending } = usePermissions();
  const [params, setParams] = useSearchParams();

  if (isPending || !organisation) return <DetailSkeleton />;

  const tabs = [
    { id: "general", label: t("tabs.general"), icon: Settings2, visible: true },
    { id: "members", label: t("tabs.members"), icon: Users, visible: can(Permissions.MEMBERS_VIEW) },
    { id: "invitations", label: t("tabs.invitations"), icon: Mail, visible: can(Permissions.MEMBERS_INVITE) },
    { id: "roles", label: t("tabs.roles"), icon: ShieldCheck, visible: can(Permissions.MEMBERS_VIEW) },
  ].filter((tab) => tab.visible);

  const requested = params.get("tab") ?? "general";
  const active = tabs.some((tab) => tab.id === requested) ? requested : "general";

  if (!tabs.length) return <EmptyState icon={Building2} title={t("page.nothing")} />;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={
          <Badge variant="secondary" className="gap-1">
            <Building2 className="size-3" /> {t("general.yourRole")} {getOrgRoleLabel(organisation.role)}
          </Badge>
        }
        title={organisation.name}
        description={t("page.description")}
      />
      <Tabs value={active} onValueChange={(value) => setParams({ tab: value }, { replace: true })}>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-max">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5">
                <tab.icon className="size-4" /> {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <div className="mt-5">
          <TabsContent value="general">
            <GeneralTab organisation={organisation} />
          </TabsContent>
          {can(Permissions.MEMBERS_VIEW) && (
            <TabsContent value="members">
              <MembersTab organisation={organisation} />
            </TabsContent>
          )}
          {can(Permissions.MEMBERS_INVITE) && (
            <TabsContent value="invitations">
              <InvitationsTab organisation={organisation} />
            </TabsContent>
          )}
          {can(Permissions.MEMBERS_VIEW) && (
            <TabsContent value="roles">
              <RolesTab organisation={organisation} />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default OrganisationPage;
