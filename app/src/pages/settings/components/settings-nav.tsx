import { Link, useLocation } from "react-router-dom";
import { ChartNoAxesCombined, ShieldCheck, UserRound } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Routes } from "@/routes/routes";

const ITEMS = [
  { to: Routes.settings.root, label: "Profile & preferences", icon: UserRound },
  {
    to: Routes.settings.usage,
    label: "Usage & costs",
    icon: ChartNoAxesCombined,
  },
  { to: Routes.settings.privacy, label: "Privacy & data", icon: ShieldCheck },
];

export function SettingsNav() {
  const { pathname } = useLocation();
  const active = ITEMS.find((item) => item.to === pathname)?.to ?? Routes.settings.root;

  return (
    <Tabs value={active} className="mb-5">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <TabsList className="w-max" aria-label="Settings sections">
          {ITEMS.map((item) => (
            <TabsTrigger key={item.to} value={item.to} className="gap-1.5" asChild>
              <Link to={item.to}>
                <item.icon className="size-4" /> {item.label}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}
