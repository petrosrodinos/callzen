import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, ChevronsUpDown, Mail, Plus, Settings2 } from "lucide-react";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { useActiveOrganisation, useMyInvitations, useSwitchOrganisation } from "@/features/organisations/hooks/use-organisations";
import { getOrgRoleLabel } from "@/config/constants/dropdowns/organisations/org-role-form.options";
import { Routes } from "@/routes/routes";
import { CreateOrganisationDialog } from "@/pages/organisation/components/create-organisation-dialog";

// Sidebar header: shows the active organisation and lets people switch, create or review invitations.
export function OrgSwitcher() {
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  const { organisation, organisations } = useActiveOrganisation();
  const { data: invitations } = useMyInvitations();
  const switchOrganisation = useSwitchOrganisation();
  const [createOpen, setCreateOpen] = useState(false);
  const pending = invitations?.length ?? 0;

  const select = (id: string) => {
    if (id === organisation?.id) return;
    switchOrganisation(id);
    setOpenMobile(false);
    navigate(Routes.dashboard);
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent" aria-label="Switch organisation">
                <div className="relative flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                  {initials(organisation?.name)}
                  {pending > 0 && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-red-500 ring-2 ring-sidebar" aria-label={`${pending} pending invitations`} />}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{organisation?.name ?? "Organisation"}</span>
                  <span className="truncate text-xs text-muted-foreground">{organisation ? getOrgRoleLabel(organisation.role) : ""}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-64 rounded-lg" side={isMobile ? "bottom" : "right"} align="start" sideOffset={4}>
              <DropdownMenuLabel className="text-xs text-muted-foreground">Your organisations</DropdownMenuLabel>
              {organisations.map((item) => (
                <DropdownMenuItem key={item.id} onClick={() => select(item.id)} className="gap-2 py-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md border text-[10px] font-semibold">{initials(item.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{item.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {getOrgRoleLabel(item.role)} · {item.members_count} member{item.members_count === 1 ? "" : "s"}
                    </span>
                  </span>
                  <Check className={cn("size-4 shrink-0", item.id === organisation?.id ? "opacity-100" : "opacity-0")} />
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {pending > 0 && (
                <DropdownMenuItem asChild>
                  <Link to={Routes.dashboard} onClick={() => setOpenMobile(false)}>
                    <Mail /> Pending invitations
                    <Badge className="ml-auto" variant="destructive">
                      {pending}
                    </Badge>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link to={Routes.organisation.root} onClick={() => setOpenMobile(false)}>
                  <Settings2 /> Organisation settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                <Plus /> Create organisation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <CreateOrganisationDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => navigate(Routes.dashboard)} />
    </>
  );
}
