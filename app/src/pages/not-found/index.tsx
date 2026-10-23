import type { FC } from "react";
import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Routes } from "@/routes/routes";
import { usePageMetadata } from "@/hooks/use-page-metadata";

const NotFoundPage: FC = () => {
  usePageMetadata({ title: "Not found" });
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <EmptyState
        icon={Compass}
        title="This page doesn't exist"
        description="The link may be broken or the page was removed."
        action={
          <Button asChild>
            <Link to={Routes.dashboard}>Back to dashboard</Link>
          </Button>
        }
        className="w-full max-w-lg"
      />
    </div>
  );
};

export default NotFoundPage;
