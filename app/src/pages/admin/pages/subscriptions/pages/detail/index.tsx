import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DetailSkeleton } from "@/components/ui/page-skeletons";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useAdminSubscription } from "@/features/admin-subscriptions/hooks/use-admin-subscriptions";
import { Routes } from "@/routes/routes";
import { SubscriptionActions } from "./components/subscription-actions";
import { DetailInvoices } from "./components/detail-invoices";
import { CreditsAndPeriodsSection, LimitsSection, MembersSection, NotesSection, SummarySection, TimelineSection } from "./components/detail-sections";

// One organisation's subscription for platform admins (§11b page 2).
const AdminSubscriptionDetailPage: FC = () => {
    const { t } = useTranslation("subscriptions");
    const { organisationId } = useParams<{ organisationId: string }>();
    const [eventType, setEventType] = useState("");
    const { data: detail, isPending, error } = useAdminSubscription(organisationId, eventType || undefined);
    usePageMetadata({ title: detail?.organisation.name ?? t("title") });

    const back = (
        <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link to={Routes.admin.subscriptions}>
                <ArrowLeft /> {t("detail.back")}
            </Link>
        </Button>
    );

    if (isPending) return <DetailSkeleton />;
    if (!detail)
        return (
            <div className="space-y-3">
                {back}
                <p className="text-sm text-muted-foreground">{error?.message ?? t("detail.notFound")}</p>
            </div>
        );

    return (
        <div className="space-y-4">
            {back}
            <PageHeader title={detail.organisation.name} actions={<SubscriptionActions detail={detail} />} />
            <SummarySection detail={detail} />
            <LimitsSection detail={detail} />
            <CreditsAndPeriodsSection detail={detail} />
            <DetailInvoices detail={detail} />
            <MembersSection detail={detail} />
            <TimelineSection detail={detail} eventType={eventType} onEventTypeChange={setEventType} />
            <NotesSection detail={detail} />
        </div>
    );
};

export default AdminSubscriptionDetailPage;
