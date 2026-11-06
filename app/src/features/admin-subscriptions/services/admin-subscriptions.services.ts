import i18n from "@/i18n";
import axiosInstance from "@/config/api/axios";
import { ApiRoutes } from "@/config/api/routes";
import { ApiError } from "@/lib/api-error";
import type {
    AdminCancelDto,
    AdminPaymentsList,
    AdminPaymentsQuery,
    AdminSubscriptionDetail,
    AdminSubscriptionsList,
    AdminSubscriptionsQuery,
    AssignManualPlanDto,
    ExtendTrialDto,
    GrantCreditsDto,
    RefundInvoiceDto,
} from "../interfaces/admin-subscriptions.interfaces";

const failed = (key: string) => i18n.t(`common:errors.adminSubscriptions.${key}`);

// Booleans and empty values are left out so the API's defaults apply.
const toParams = (query: object) =>
    Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== "" && value !== false && value !== null));

export const getAdminSubscriptions = async (query: AdminSubscriptionsQuery): Promise<AdminSubscriptionsList> => {
    try {
        return (await axiosInstance.get(ApiRoutes.admin.subscriptions.prefix, { params: toParams(query) })).data;
    } catch (error) {
        throw new ApiError(error, failed("loadList"));
    }
};

export const exportAdminSubscriptionsCsv = async (query: AdminSubscriptionsQuery): Promise<Blob> => {
    try {
        const response = await axiosInstance.get(ApiRoutes.admin.subscriptions.export_csv, { params: toParams(query), responseType: "blob" });
        return response.data;
    } catch (error) {
        throw new ApiError(error, failed("export"));
    }
};

export const getAdminSubscription = async (organisationId: string, eventType?: string): Promise<AdminSubscriptionDetail> => {
    try {
        return (await axiosInstance.get(ApiRoutes.admin.subscriptions.detail(organisationId), { params: toParams({ event_type: eventType }) })).data;
    } catch (error) {
        throw new ApiError(error, failed("loadDetail"));
    }
};

export const getAdminPayments = async (query: AdminPaymentsQuery): Promise<AdminPaymentsList> => {
    try {
        return (await axiosInstance.get(ApiRoutes.admin.payments, { params: toParams(query) })).data;
    } catch (error) {
        throw new ApiError(error, failed("loadPayments"));
    }
};

const post = async (url: string, body: unknown, errorKey: string) => {
    try {
        return (await axiosInstance.post(url, body)).data;
    } catch (error) {
        throw new ApiError(error, failed(errorKey));
    }
};

export const assignManualPlan = async ({ organisationId, dto }: { organisationId: string; dto: AssignManualPlanDto }) => {
    try {
        return (await axiosInstance.put(ApiRoutes.admin.organisations.subscription(organisationId), dto)).data;
    } catch (error) {
        throw new ApiError(error, failed("assignPlan"));
    }
};

export const grantCredits = ({ organisationId, dto }: { organisationId: string; dto: GrantCreditsDto }) =>
    post(ApiRoutes.admin.organisations.credits(organisationId), dto, "grantMinutes");

export const extendTrial = ({ organisationId, dto }: { organisationId: string; dto: ExtendTrialDto }) =>
    post(ApiRoutes.admin.subscriptions.extend_trial(organisationId), dto, "extendTrial");

export const applyDiscount = ({ organisationId, couponId }: { organisationId: string; couponId: string }) =>
    post(ApiRoutes.admin.subscriptions.discount(organisationId), { coupon_id: couponId }, "discount");

export const adminCancelSubscription = ({ organisationId, dto }: { organisationId: string; dto: AdminCancelDto }) =>
    post(ApiRoutes.admin.subscriptions.cancel(organisationId), dto, "cancel");

export const adminResumeSubscription = (organisationId: string) => post(ApiRoutes.admin.subscriptions.resume(organisationId), {}, "resume");

export const syncSubscription = (organisationId: string): Promise<{ drift: boolean; synced: boolean }> =>
    post(ApiRoutes.admin.subscriptions.sync(organisationId), {}, "sync");

export const refundInvoice = ({ invoiceId, dto }: { invoiceId: string; dto: RefundInvoiceDto }) =>
    post(ApiRoutes.admin.refund_invoice(invoiceId), dto, "refund");
