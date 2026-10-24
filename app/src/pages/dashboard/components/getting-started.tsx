import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Circle,
  Headphones,
  PhoneCall,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Routes } from "@/routes/routes";

interface GettingStartedProps {
  hasAgent: boolean;
  canCreateAgent: boolean;
  hasPractice: boolean;
  hasLiveCall: boolean;
}

export function GettingStarted({
  hasAgent,
  canCreateAgent,
  hasPractice,
  hasLiveCall,
}: GettingStartedProps) {
  const { t } = useTranslation("dashboard");
  const steps = [
    canCreateAgent
      ? {
          done: hasAgent,
          icon: Bot,
          title: t("gettingStarted.createCopilot.title"),
          text: t("gettingStarted.createCopilot.text"),
          to: Routes.assistant_agents.new,
          cta: t("gettingStarted.createCopilot.cta"),
        }
      : {
          done: hasAgent,
          icon: Bot,
          title: t("gettingStarted.waitCopilot.title"),
          text: t("gettingStarted.waitCopilot.text"),
          to: Routes.organisation.root,
          cta: t("gettingStarted.waitCopilot.cta"),
        },
    {
      done: hasPractice,
      icon: Headphones,
      title: t("gettingStarted.practice.title"),
      text: t("gettingStarted.practice.text"),
      to: Routes.practice.root,
      cta: t("gettingStarted.practice.cta"),
    },
    {
      done: hasLiveCall,
      icon: PhoneCall,
      title: t("gettingStarted.firstCall.title"),
      text: t("gettingStarted.firstCall.text"),
      to: Routes.calls.new,
      cta: t("gettingStarted.firstCall.cta"),
    },
  ];
  const next = steps.find((step) => !step.done);

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
      <h2 className="font-semibold">{t("gettingStarted.heading")}</h2>
      <p className="text-sm text-muted-foreground">
        {t("gettingStarted.subheading")}
      </p>
      <ol className="mt-4 grid gap-3 md:grid-cols-3">
        {steps.map((step) => (
          <li
            key={step.title}
            className={cn(
              "flex flex-col gap-2 rounded-lg border bg-background p-4",
              step === next && "ring-2 ring-primary/40",
            )}
          >
            <div className="flex items-center gap-2">
              {step.done ? (
                <CheckCircle2 className="size-5 text-emerald-600" />
              ) : (
                <Circle className="size-5 text-muted-foreground" />
              )}
              <step.icon className="size-4 text-muted-foreground" />
              <span
                className={cn(
                  "text-sm font-medium",
                  step.done && "text-muted-foreground line-through",
                )}
              >
                {step.title}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{step.text}</p>
            {!step.done && (
              <Button
                asChild
                size="sm"
                variant={step === next ? "default" : "outline"}
                className="mt-auto self-start"
              >
                <Link to={step.to}>
                  {step.cta} <ArrowRight />
                </Link>
              </Button>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}
