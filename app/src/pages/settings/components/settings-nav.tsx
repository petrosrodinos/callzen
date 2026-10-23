import { NavLink } from "react-router-dom";
import { ChartNoAxesCombined, ShieldCheck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Routes } from "@/routes/routes";

const ITEMS = [
  { to: Routes.settings.root, label: "Profile & preferences", icon: UserRound },
  { to: Routes.settings.usage, label: "Usage & costs", icon: ChartNoAxesCombined },
  { to: Routes.settings.privacy, label: "Privacy & data", icon: ShieldCheck },
];

export function SettingsNav() {
  return (
    <nav className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0" aria-label="Settings sections">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          className={({ isActive }) =>
            cn("-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors", isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")
          }
        >
          <item.icon className="size-4" /> {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
