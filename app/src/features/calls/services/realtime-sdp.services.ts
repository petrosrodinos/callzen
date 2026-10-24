import i18n from "@/i18n";
import realtimeAxios from "@/config/api/realtime-axios";
import { ApiError } from "@/lib/api-error";

// Exchanges the local WebRTC offer for OpenAI's answer using the ephemeral session secret.
export const exchangeRealtimeSdp = async ({ url, clientSecret, offerSdp }: { url: string; clientSecret: string; offerSdp: string }): Promise<string> => {
    try {
        const response = await realtimeAxios.post<string>(url, offerSdp, {
            headers: { Authorization: `Bearer ${clientSecret}`, "Content-Type": "application/sdp" },
            responseType: "text",
            transformResponse: (data) => data,
        });
        return response.data;
    } catch (error) {
        throw new ApiError(error, i18n.t("common:errors.calls.couldNotConnectToTheRealtime"));
    }
};
