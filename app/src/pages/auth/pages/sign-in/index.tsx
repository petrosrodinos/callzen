import type { FC } from "react";
import { Link, useLocation } from "react-router-dom";
import { SignInForm } from "./components/sign-in-form";
import { Routes } from "@/routes/routes";
import { usePageMetadata } from "@/hooks/use-page-metadata";

const SignInPage: FC = () => {
  const { search } = useLocation();
  usePageMetadata({ title: "Sign in" });

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your co-pilot and practice prospects.</p>
      </div>
      <SignInForm />
      <p className="text-center text-sm text-muted-foreground">
        New to CallZen?{" "}
        <Link to={`${Routes.auth.sign_up}${search}`} className="font-medium text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
};

export default SignInPage;
