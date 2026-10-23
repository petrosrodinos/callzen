import { useQuery } from "@tanstack/react-query";
import { getUsageSummary } from "../services/usage.services";

export const useUsageSummary = (days: number) => {
    return useQuery({
        queryKey: ["usage", days],
        queryFn: () => getUsageSummary(days),
    });
};
