import type { FC } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { AlertTriangle, Building2, CheckCircle2, LogOut, MailCheck } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { UiLanguageSwitch } from "@/components/ui/ui-language-switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAcceptInvitationByToken, useInvitationPreview } from "@/features/organisations/hooks/use-organisations";
import { InvitationStatuses } from "@/features/organisations/interfaces/organisations.interfaces";
import { getOrgRoleLabel } from "@/config/constants/dropdowns/organisations/org-role-form.options";
import { useAuthStore } from "@/stores/auth";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { rememberRedirect } from "@/lib/redirect";
import { formatDate } from "@/lib/date";
import { Routes } from "@/routes/routes";

const InvitePage: FC = () => {
  const { t } = useTranslation("invite");
  usePageMetadata({ title: t("pageTitle") });
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data: preview, isPending, isError, error } = useInvitationPreview(token);
  const accept = useAcceptInvitationByToken();
  const { isLoggedIn, email: myEmail, logout } = useAuthStore();

  const here = Routes.invite.accept(token ?? "");
  const query = preview ? `?redirect=${encodeURIComponent(here)}&email=${encodeURIComponent(preview.email)}` : "";
  const emailMatches = !!preview && !!myEmail && preview.email.toLowerCase() === myEmail.toLowerCase();

  const switchAccount = () => {
    rememberRedirect(here);
    logout();
  };

  return (
    <div className="flex min-h-dvh flex-col bg-muted/30">
      <header className="flex items-center justify-between p-4">
        <BrandLogo />
        <ThemeSwitch />
        <UiLanguageSwitch />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-10 pt-6 sm:items-center sm:pt-0">
        <Card className="w-full max-w-md space-y-5 p-6">
          {isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isError || !preview ? (
            <div className="space-y-4 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                <AlertTriangle className="size-6" />
              </span>
              <h1 className="text-xl font-semibold">{t("notFound.title")}</h1>
              <p className="text-sm text-muted-foreground">{error?.message ?? t("notFound.defaultMessage")} {t("notFound.resend")}</p>
              <Button asChild variant="outline">
                <Link to={Routes.root}>{t("notFound.cta")}</Link>
              </Button>
            </div>
          ) : preview.status !== InvitationStatuses.PENDING ? (
            <div className="space-y-4 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <MailCheck className="size-6" />
              </span>
              <h1 className="text-xl font-semibold">{t("inactive.title", { status: t(`status.${preview.status.toLowerCase()}`, { defaultValue: preview.status.toLowerCase() }) })}</h1>
              <p className="text-sm text-muted-foreground">
                {preview.status === InvitationStatuses.ACCEPTED
                  ? t("inactive.used", { organisation: preview.organisation_name })
                  : preview.invited_by
                    ? t("inactive.askInviter", { inviter: preview.invited_by })
                    : t("inactive.askAdmins")}
              </p>
              <Button asChild>
                <Link to={Routes.dashboard}>{t("inactive.cta")}</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3 text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Building2 className="size-6" />
                </span>
                <h1 className="text-xl font-semibold tracking-tight">{t("join.title", { organisation: preview.organisation_name })}</h1>
                <p className="text-sm text-muted-foreground">
                  <Trans
                    t={t}
                    i18nKey={preview.invited_by ? "join.invitedBy" : "join.invitedByTeammate"}
                    values={{ inviter: preview.invited_by, role: getOrgRoleLabel(preview.role) }}
                    components={{ badge: <Badge variant="secondary" /> }}
                  />
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("join.sentTo", { email: preview.email, date: formatDate(preview.expires_at) })}
                </p>
              </div>

              {!isLoggedIn ? (
                <div className="space-y-3">
                  <p className="text-center text-sm text-muted-foreground">{preview.account_exists ? t("join.signInHint") : t("join.createHint")}</p>
                  <Button asChild size="lg" className="w-full">
                    <Link to={`${preview.account_exists ? Routes.auth.sign_in : Routes.auth.sign_up}${query}`}>{preview.account_exists ? t("join.signInCta") : t("join.createCta")}</Link>
                  </Button>
                  <Button asChild variant="ghost" className="w-full">
                    <Link to={`${preview.account_exists ? Routes.auth.sign_up : Routes.auth.sign_in}${query}`}>{preview.account_exists ? t("join.needAccount") : t("join.haveAccount")}</Link>
                  </Button>
                </div>
              ) : emailMatches ? (
                <div className="space-y-3">
                  <Button size="lg" className="w-full" loading={accept.isPending} disabled={accept.isPending} onClick={() => token && accept.mutate(token, { onSuccess: () => navigate(Routes.dashboard, { replace: true }) })}>
                    {!accept.isPending && <CheckCircle2 />} {t("join.accept")}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">{t("join.signedInAs", { email: myEmail })}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
                    <Trans
                      t={t}
                      i18nKey="join.mismatch"
                      values={{ invited: preview.email, current: myEmail }}
                      components={{ strong: <strong /> }}
                    />
                  </p>
                  <Button variant="outline" className="w-full" onClick={switchAccount}>
                    <LogOut /> {t("join.signOut", { email: preview.email })}
                  </Button>
                  <Button asChild variant="ghost" className="w-full">
                    <Link to={Routes.dashboard}>{t("join.back")}</Link>
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </main>
    </div>
  );
};

export default InvitePage;
