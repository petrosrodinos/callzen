import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChartNoAxesCombined, ShieldCheck, UserRound } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Routes } from "@/routes/routes";

const ITEMS = [
  { to: Routes.settings.root, labelKey: "nav.profile", icon: UserRound },
  {
    to: Routes.settings.usage,
    labelKey: "nav.usage",
    icon: ChartNoAxesCombined,
  },
  { to: Routes.settings.privacy, labelKey: "nav.privacy", icon: ShieldCheck },
];

export function SettingsNav() {
  const { t } = useTranslation("settings");
  const { pathname } = useLocation();
  const active = ITEMS.find((item) => item.to === pathname)?.to ?? Routes.settings.root;

  return (
    <Tabs value={active} className="mb-5">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <TabsList className="w-max" aria-label={t("nav.sections")}>
          {ITEMS.map((item) => (
            <TabsTrigger key={item.to} value={item.to} className="gap-1.5" asChild>
              <Link to={item.to}>
                <item.icon className="size-4" /> {t(item.labelKey)}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}
