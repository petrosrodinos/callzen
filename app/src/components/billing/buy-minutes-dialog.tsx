import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Headphones, ShoppingCart, User, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { useEntitlements, usePlans, useTopup } from "@/features/billing/hooks/use-billing";
import { TopupScopes, type TopupScope } from "@/features/billing/interfaces/billing.interfaces";
import { getTopupPackLabel } from "@/config/constants/dropdowns/billing/plan.options";
import { usePlanPromptStore } from "@/stores/plan-prompt";

// Buy minutes (§2.4, §11): every member of a paid organisation can buy personal minutes; owners and billing
// managers of multi-seat organisations can also buy for the whole team. Bought minutes never expire.
export function BuyMinutesDialog() {
  const { t } = useTranslation("billing");
  const open = usePlanPromptStore((state) => state.buyMinutesOpen);
  const setOpen = usePlanPromptStore((state) => state.setBuyMinutesOpen);
  const { data: plans, isPending: plansPending } = usePlans();
  const { data: usage } = useEntitlements(open);
  const topup = useTopup();
  const [packId, setPackId] = useState<string | null>(null);
  const [scope, setScope] = useState<TopupScope>(TopupScopes.PERSONAL);

  const showScope = !!usage?.can_buy_team_topups && usage.seats.total > 1;
  const packs = plans?.topup_packs.filter((pack) => pack.available) ?? [];
  const selected = packs.find((pack) => pack.id === packId) ?? packs[0];

  return (
    <Dialog open={open} onOpenChange={(next) => !topup.isPending && setOpen(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("buyMinutes.title")}</DialogTitle>
          <DialogDescription>{t("buyMinutes.description")}</DialogDescription>
        </DialogHeader>

        {usage && !usage.can_buy_topups ? (
          <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">{t("buyMinutes.unavailable")}</p>
        ) : plansPending ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : !packs.length ? (
          <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">{t("buyMinutes.noPacks")}</p>
        ) : (
          <div className="space-y-4">
            {showScope && (
              <div role="radiogroup" aria-label={t("buyMinutes.scopeLabel")} className="grid grid-cols-2 gap-2">
                {[
                  { id: TopupScopes.TEAM, icon: Users, label: t("buyMinutes.forTeam"), hint: t("buyMinutes.forTeamHint") },
                  { id: TopupScopes.PERSONAL, icon: User, label: t("buyMinutes.justForMe"), hint: t("buyMinutes.justForMeHint") },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={scope === option.id}
                    onClick={() => setScope(option.id)}
                    className={cn(
                      "flex flex-col gap-1 rounded-xl border p-3 text-left text-sm transition-colors hover:border-primary/50",
                      scope === option.id && "border-primary bg-primary/5 ring-1 ring-primary",
                    )}
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      <option.icon className="size-4" /> {option.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{option.hint}</span>
                  </button>
                ))}
              </div>
            )}
            <div role="radiogroup" aria-label={t("buyMinutes.packLabel")} className="space-y-2">
              {packs.map((pack) => {
                const isSelected = pack.id === selected?.id;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setPackId(pack.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:border-primary/50",
                      isSelected && "border-primary bg-primary/5 ring-1 ring-primary",
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {pack.live_minutes ? <Clock className="size-4" /> : <Headphones className="size-4" />}
                    </span>
                    <span className="flex-1">
                      <span className="block font-medium">{getTopupPackLabel(pack)}</span>
                      <span className="block text-xs text-muted-foreground">{t("buyMinutes.neverExpire")}</span>
                    </span>
                    {pack.price && <span className="font-semibold tabular-nums">{formatMoney(pack.price.amount_cents, pack.price.currency)}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={topup.isPending}>
            {t("actions.close")}
          </Button>
          <Button
            disabled={!selected || !usage?.can_buy_topups || topup.isPending}
            loading={topup.isPending}
            onClick={() => selected && topup.mutate({ pack_id: selected.id, scope: showScope ? scope : TopupScopes.PERSONAL })}
          >
            {!topup.isPending && <ShoppingCart />} {t("buyMinutes.checkout")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
