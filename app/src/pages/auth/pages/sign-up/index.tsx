import type { FC } from "react";
import { Link } from "react-router-dom";
import { SignUpForm } from "./components/sign-up-form";
import { Routes } from "@/routes/routes";
import { usePageMetadata } from "@/hooks/use-page-metadata";

const SignUpPage: FC = () => {
  usePageMetadata({ title: "Create account" });

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Set up your first co-pilot in under two minutes.</p>
      </div>
      <SignUpForm />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to={Routes.auth.sign_in} className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default SignUpPage;
