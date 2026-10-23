import { Link, Outlet } from "react-router-dom";
import { PhoneCall } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Routes } from "@/routes/routes";

export default function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-5" />
          <Link to={Routes.dashboard} className="md:hidden" aria-label="Dashboard">
            <BrandLogo compact />
          </Link>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeSwitch />
            <Button asChild size="sm">
              <Link to={Routes.calls.new}>
                <PhoneCall />
                <span className="hidden sm:inline">Start a call</span>
              </Link>
            </Button>
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
