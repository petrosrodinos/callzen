import { useAuthStore } from "@/stores/auth";
import { RoleTypes } from "@/features/user/interfaces/user.interface";

// CallZen staff (platform ADMIN / SUPER_ADMIN). Only they see AI costs, model choices and browser voice; the API
// enforces the same rule and omits that data for everyone else.
export const useIsPlatformAdmin = (): boolean => {
    const role = useAuthStore((state) => state.role);
    return role === RoleTypes.ADMIN || role === RoleTypes.SUPER_ADMIN;
};
