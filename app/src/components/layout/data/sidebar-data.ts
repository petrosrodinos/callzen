import { IconAlertTriangle, IconHeartbeat, IconUser } from "@tabler/icons-react";
import { AudioLines, Bot, ChartNoAxesCombined, Gauge, Headphones, Library, PhoneCall, Settings, ShieldCheck } from "lucide-react";
import { type SidebarData } from "../types";
import { Routes } from "@/routes/routes";
import { RoleTypes } from "@/features/user/interfaces/user.interface";
import { environments } from "@/config/environments";

export const sidebarData: SidebarData = {
  teams: [
    {
      name: environments.APP_NAME,
      logo: AudioLines,
      plan: "Sales co-pilot",
    },
  ],
  navGroups: [
    {
      title: "Sell",
      items: [
        { title: "Dashboard", url: Routes.dashboard, icon: Gauge },
        { title: "Start a call", url: Routes.calls.new, icon: PhoneCall },
        { title: "Call library", url: Routes.library.root, icon: Library },
      ],
    },
    {
      title: "Train",
      items: [
        { title: "Practice", url: Routes.practice.root, icon: Headphones },
        { title: "Co-pilots", url: Routes.assistant_agents.root, icon: Bot },
      ],
    },
    {
      title: "Account",
      items: [
        { title: "Settings", url: Routes.settings.root, icon: Settings },
        { title: "Usage & costs", url: Routes.settings.usage, icon: ChartNoAxesCombined },
        { title: "Privacy & data", url: Routes.settings.privacy, icon: ShieldCheck },
      ],
    },
    {
      access: [RoleTypes.ADMIN],
      title: "Admin",
      items: [
        { title: "Health", url: Routes.admin.health, icon: IconHeartbeat },
        { title: "Users", url: Routes.admin.users, icon: IconUser },
        { title: "Alerts", url: Routes.admin.alerts, icon: IconAlertTriangle },
      ],
    },
  ],
};
