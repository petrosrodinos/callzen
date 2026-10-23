import AppRoutes from "./routes";
import { BrowserRouter } from "react-router-dom";
import QueryProvider from "./components/providers/query-provider.tsx";
import { Toaster } from "./components/ui/toaster.tsx";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import { RadixPointerEventsGuard } from "./components/providers/radix-pointer-events-guard.tsx";
import { ThemeInitializer } from "./components/providers/theme-initializer.tsx";

function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <TooltipProvider delayDuration={200}>
          <ThemeInitializer />
          <AppRoutes />
          <Toaster />
          <RadixPointerEventsGuard />
        </TooltipProvider>
      </QueryProvider>
    </BrowserRouter>
  );
}

export default App;
