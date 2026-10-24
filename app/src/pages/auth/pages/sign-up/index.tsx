import type { FC } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SignUpForm } from "./components/sign-up-form";
import { Routes } from "@/routes/routes";
import { usePageMetadata } from "@/hooks/use-page-metadata";

const SignUpPage: FC = () => {
  const { t } = useTranslation("auth");
  const { search } = useLocation();
  usePageMetadata({ title: t("signUp.pageTitle") });

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("signUp.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("signUp.subtitle")}</p>
      </div>
      <SignUpForm />
      <p className="text-center text-sm text-muted-foreground">
        {t("signUp.hasAccount")}{" "}
        <Link to={`${Routes.auth.sign_in}${search}`} className="font-medium text-primary underline-offset-4 hover:underline">
          {t("signUp.signInLink")}
        </Link>
      </p>
    </div>
  );
};

export default SignUpPage;
