import { Link } from "react-router-dom";
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
  const steps = [
    canCreateAgent
      ? {
          done: hasAgent,
          icon: Bot,
          title: "Create your co-pilot",
          text: "Start from a template: script, objections and goal in one click.",
          to: Routes.assistant_agents.new,
          cta: "Create co-pilot",
        }
      : {
          done: hasAgent,
          icon: Bot,
          title: "Wait for a co-pilot",
          text: "An admin of this organisation sets up the co-pilots you'll use. Ask them if none is available yet.",
          to: Routes.organisation.root,
          cta: "View organisation",
        },
    {
      done: hasPractice,
      icon: Headphones,
      title: "Rehearse with an AI prospect",
      text: "Talk out loud to a realistic prospect, with the co-pilot coaching you.",
      to: Routes.practice.root,
      cta: "Practice now",
    },
    {
      done: hasLiveCall,
      icon: PhoneCall,
      title: "Take your first assisted call",
      text: "Phone on speaker or an online meeting. Get suggestions live.",
      to: Routes.calls.new,
      cta: "Start a call",
    },
  ];
  const next = steps.find((step) => !step.done);

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
      <h2 className="font-semibold">Get set up in three steps</h2>
      <p className="text-sm text-muted-foreground">
        Most people finish this in under five minutes.
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
