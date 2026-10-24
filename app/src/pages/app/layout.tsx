import { Link, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PhoneCall } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { UiLanguageSwitch } from "@/components/ui/ui-language-switch";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Routes } from "@/routes/routes";
import { OrganisationGate } from "@/components/providers/organisation-gate";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";

export default function AppLayout() {
  return (
    <OrganisationGate>
      <AppShell />
    </OrganisationGate>
  );
}

function AppShell() {
  const { t } = useTranslation("admin");
  const { can } = usePermissions();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-5" />
          <Link
            to={Routes.dashboard}
            className="md:hidden"
            aria-label={t("app.dashboard")}
          >
            <BrandLogo compact />
          </Link>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeSwitch />
            <UiLanguageSwitch />
            {can(Permissions.CALLS_CREATE) && (
              <Button asChild size="sm">
                <Link to={Routes.calls.new}>
                  <PhoneCall />
                  <span className="hidden sm:inline">{t("app.startCall")}</span>
                </Link>
              </Button>
            )}
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
