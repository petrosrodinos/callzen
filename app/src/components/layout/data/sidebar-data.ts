import { IconAlertTriangle, IconHeartbeat, IconUser } from "@tabler/icons-react";
import { AudioLines, Bot, Building2, ChartNoAxesCombined, Gauge, Headphones, Library, PhoneCall, Settings, ShieldCheck } from "lucide-react";
import { type SidebarData } from "../types";
import { Routes } from "@/routes/routes";
import { RoleTypes } from "@/features/user/interfaces/user.interface";
import i18n from "@/i18n";
import { environments } from "@/config/environments";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";

export const sidebarData: SidebarData = {
  teams: [
    {
      name: environments.APP_NAME,
      logo: AudioLines,
      plan: i18n.t("layout:sidebar.plan"),
    },
  ],
  navGroups: [
    {
      title: i18n.t("layout:sidebar.groups.sell"),
      items: [
        { title: i18n.t("layout:sidebar.items.dashboard"), url: Routes.dashboard, icon: Gauge },
        { title: i18n.t("layout:sidebar.items.startCall"), url: Routes.calls.new, icon: PhoneCall, permission: Permissions.CALLS_CREATE },
        { title: i18n.t("layout:sidebar.items.callLibrary"), url: Routes.library.root, icon: Library },
      ],
    },
    {
      title: i18n.t("layout:sidebar.groups.train"),
      items: [
        { title: i18n.t("layout:sidebar.items.practice"), url: Routes.practice.root, icon: Headphones, permission: Permissions.CALLS_CREATE },
        { title: i18n.t("layout:sidebar.items.copilots"), url: Routes.assistant_agents.root, icon: Bot, permission: Permissions.AGENTS_VIEW },
      ],
    },
    {
      title: i18n.t("layout:sidebar.groups.account"),
      items: [
        { title: i18n.t("layout:sidebar.items.organisation"), url: Routes.organisation.root, icon: Building2 },
        { title: i18n.t("layout:sidebar.items.settings"), url: Routes.settings.root, icon: Settings },
        { title: i18n.t("layout:sidebar.items.usage"), url: Routes.settings.usage, icon: ChartNoAxesCombined },
        { title: i18n.t("layout:sidebar.items.privacy"), url: Routes.settings.privacy, icon: ShieldCheck },
      ],
    },
    {
      access: [RoleTypes.ADMIN],
      title: i18n.t("layout:sidebar.groups.admin"),
      items: [
        { title: i18n.t("layout:sidebar.items.health"), url: Routes.admin.health, icon: IconHeartbeat },
        { title: i18n.t("layout:sidebar.items.users"), url: Routes.admin.users, icon: IconUser },
        { title: i18n.t("layout:sidebar.items.alerts"), url: Routes.admin.alerts, icon: IconAlertTriangle },
      ],
    },
  ],
};
