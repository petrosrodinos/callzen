import type { FC } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SignInForm } from "./components/sign-in-form";
import { Routes } from "@/routes/routes";
import { usePageMetadata } from "@/hooks/use-page-metadata";

const SignInPage: FC = () => {
  const { t } = useTranslation("auth");
  const { search } = useLocation();
  usePageMetadata({ title: t("signIn.pageTitle") });

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("signIn.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("signIn.subtitle")}</p>
      </div>
      <SignInForm />
      <p className="text-center text-sm text-muted-foreground">
        {t("signIn.noAccount")}{" "}
        <Link to={`${Routes.auth.sign_up}${search}`} className="font-medium text-primary underline-offset-4 hover:underline">
          {t("signIn.createLink")}
        </Link>
      </p>
    </div>
  );
};

export default SignInPage;
