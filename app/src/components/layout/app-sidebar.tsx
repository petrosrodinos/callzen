import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { NavGroup } from "@/components/layout/nav-group";
import { NavUser } from "@/components/layout/nav-user";
import { OrgSwitcher } from "@/components/layout/org-switcher";
import { sidebarData } from "./data/sidebar-data";
import { RoleTypes, type RoleType } from "@/features/user/interfaces/user.interface";
import { useAuthStore } from "@/stores/auth";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { role } = useAuthStore();
  const { can } = usePermissions();

  const navGroups = sidebarData.navGroups
    .filter((group) => {
      if (!group.access) return true;
      if (!role) return false;
      return group.access.includes(role as RoleType) || role === RoleTypes.SUPER_ADMIN;
    })
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.permission || can(item.permission)) }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon" variant="floating" {...props}>
      <SidebarHeader>
        <OrgSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <NavGroup key={group.title} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
