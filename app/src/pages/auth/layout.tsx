import { Outlet } from "react-router-dom";
import { Headphones, LineChart, Mic, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ThemeSwitch } from "@/components/ui/theme-switch";

const HIGHLIGHTS = [
  { icon: Sparkles, title: "Live co-pilot", text: "Know exactly what to say next, while the prospect is still talking." },
  { icon: Headphones, title: "AI practice prospects", text: "Rehearse cold calls and objections against realistic voice prospects." },
  { icon: LineChart, title: "Measurable progress", text: "Scored reviews after every call and trends over time." },
];

export default function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-10 text-white lg:flex lg:flex-col">
        <BrandLogo className="text-white" invert />
        <div className="my-auto max-w-md space-y-8">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Sell better on every call.
            <br />
            Get better between calls.
          </h2>
          <ul className="space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-indigo-100">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="flex items-center gap-2 text-xs text-indigo-200">
          <Mic className="size-3.5" /> Always get consent before recording a call.
        </p>
        <div className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-white/10 blur-3xl" />
      </aside>

      <main className="flex flex-col">
        <div className="flex items-center justify-between p-4 lg:justify-end">
          <BrandLogo className="lg:hidden" />
          <ThemeSwitch />
        </div>
        <div className="flex flex-1 items-start justify-center px-4 pb-10 pt-4 sm:items-center sm:pt-0">
          <div className="w-full max-w-sm">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
