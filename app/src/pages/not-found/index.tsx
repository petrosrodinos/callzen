import type { FC } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Routes } from "@/routes/routes";
import { usePageMetadata } from "@/hooks/use-page-metadata";

const NotFoundPage: FC = () => {
  const { t } = useTranslation("admin");
  usePageMetadata({ title: t("notFound.pageTitle") });
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <EmptyState
        icon={Compass}
        title={t("notFound.title")}
        description={t("notFound.description")}
        action={
          <Button asChild>
            <Link to={Routes.dashboard}>{t("notFound.cta")}</Link>
          </Button>
        }
        className="w-full max-w-lg"
      />
    </div>
  );
};

export default NotFoundPage;
