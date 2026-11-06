import i18n from "@/i18n";
import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { ApiError } from "@/lib/api-error";
import type {
    BillingInvoice,
    BillingOverview,
    CancelPlanDto,
    ChangePlanDto,
    ChangePlanResult,
    ChangePreview,
    CheckoutDto,
    CursorPage,
    MyPurchases,
    PlansCatalog,
    PlanUsage,
    RedirectResponse,
    SubscriptionEvent,
    TopupDto,
} from "../interfaces/billing.interfaces";

const failed = (key: string) => i18n.t(`common:errors.billing.${key}`);

export const getPlans = async (): Promise<PlansCatalog> => {
    try {
        return (await axiosInstance.get(ApiRoutes.plans.prefix)).data;
    } catch (error) {
        throw new ApiError(error, failed("loadPlans"));
    }
};

// No session needed: used by the public landing page.
export const getPublicPlans = async (): Promise<PlansCatalog> => {
    try {
        return (await axiosInstance.get(ApiRoutes.plans.public)).data;
    } catch (error) {
        throw new ApiError(error, failed("loadPlans"));
    }
};

export const getPlanUsage = async (): Promise<PlanUsage> => {
    try {
        return (await axiosInstance.get(ApiRoutes.usage.plan)).data;
    } catch (error) {
        throw new ApiError(error, failed("loadPlanUsage"));
    }
};

export const getBillingOverview = async (): Promise<BillingOverview> => {
    try {
        return (await axiosInstance.get(ApiRoutes.billing.overview)).data;
    } catch (error) {
        throw new ApiError(error, failed("loadBilling"));
    }
};

export const getBillingInvoices = async (cursor?: string): Promise<CursorPage<BillingInvoice>> => {
    try {
        return (await axiosInstance.get(ApiRoutes.billing.invoices, { params: { cursor } })).data;
    } catch (error) {
        throw new ApiError(error, failed("loadInvoices"));
    }
};

export const getBillingEvents = async (): Promise<SubscriptionEvent[]> => {
    try {
        return (await axiosInstance.get(ApiRoutes.billing.events)).data;
    } catch (error) {
        throw new ApiError(error, failed("loadHistory"));
    }
};

export const previewPlanChange = async (dto: ChangePlanDto): Promise<ChangePreview> => {
    try {
        return (await axiosInstance.post(ApiRoutes.billing.preview_change, dto)).data;
    } catch (error) {
        throw new ApiError(error, failed("previewChange"));
    }
};

export const changePlan = async (dto: ChangePlanDto): Promise<ChangePlanResult> => {
    try {
        // The idempotency key makes a double click never double-charge (§11a).
        return (await axiosInstance.post(ApiRoutes.billing.change_plan, dto, { headers: dto.idempotency_key ? { "Idempotency-Key": dto.idempotency_key } : undefined })).data;
    } catch (error) {
        throw new ApiError(error, failed("changePlan"));
    }
};

export const cancelPlan = async (dto: CancelPlanDto): Promise<BillingOverview> => {
    try {
        return (await axiosInstance.post(ApiRoutes.billing.cancel, dto)).data;
    } catch (error) {
        throw new ApiError(error, failed("cancelPlan"));
    }
};

export const resumePlan = async (): Promise<BillingOverview> => {
    try {
        return (await axiosInstance.post(ApiRoutes.billing.resume)).data;
    } catch (error) {
        throw new ApiError(error, failed("resumePlan"));
    }
};

export const openBillingPortal = async (): Promise<RedirectResponse> => {
    try {
        return (await axiosInstance.post(ApiRoutes.billing.portal)).data;
    } catch (error) {
        throw new ApiError(error, failed("openPortal"));
    }
};

export const startCheckout = async (dto: CheckoutDto): Promise<RedirectResponse> => {
    try {
        return (await axiosInstance.post(ApiRoutes.billing.checkout, dto)).data;
    } catch (error) {
        throw new ApiError(error, failed("checkout"));
    }
};

export const startTopup = async (dto: TopupDto): Promise<RedirectResponse> => {
    try {
        return (await axiosInstance.post(ApiRoutes.billing.topup, dto)).data;
    } catch (error) {
        throw new ApiError(error, failed("topup"));
    }
};

export const getMyPurchases = async (): Promise<MyPurchases> => {
    try {
        return (await axiosInstance.get(ApiRoutes.billing.my_purchases)).data;
    } catch (error) {
        throw new ApiError(error, failed("loadPurchases"));
    }
};
