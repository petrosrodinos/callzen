import type { RoleType } from "@/features/user/interfaces/user.interface";
import type { Permission } from "@/features/organisations/interfaces/organisations.interfaces";

interface Team {
  name: string;
  logo: React.ElementType;
  plan: string;
}

interface BaseNavItem {
  title: string;
  // Hidden unless the active organisation role grants this permission.
  permission?: Permission;
  badge?: string;
  icon?: React.ElementType;
}

type NavLink = BaseNavItem & {
  url: string;
  items?: never;
};

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: string })[];
  url?: never;
};

type NavItem = NavCollapsible | NavLink;

interface NavGroup {
  access?: RoleType[];
  title: string;
  items: NavItem[];
}

interface SidebarData {
  teams: Team[];
  navGroups: NavGroup[];
}

export type { NavCollapsible, NavGroup, NavItem, NavLink, SidebarData };
