import axios from 'axios'
import { getAuthStoreState } from '@/stores/auth'
import { isTokenExpired } from '@/lib/token';
import { environments } from '@/config/environments';
import { getOrganisationStoreState } from '@/stores/organisation';

const axiosInstance = axios.create({
    baseURL: environments.API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

axiosInstance.interceptors.request.use((config) => {
    const authState = getAuthStoreState();

    if (authState?.expires_in && isTokenExpired(authState.expires_in)) {
        authState.logout();

        return Promise.reject(new Error('Token expired'));
    }

    if (authState.access_token) {
        config.headers.Authorization = `Bearer ${authState.access_token}`;
    }

    // Every request is scoped to the organisation the user is currently working in.
    const { activeOrganisationId } = getOrganisationStoreState();
    if (activeOrganisationId) config.headers["X-Organisation-Id"] = activeOrganisationId;

    return config;
});

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        // An invalid or expired session (e.g. JWT secret rotated) must not leave pages stuck loading.
        const authState = getAuthStoreState();
        if (error?.response?.status === 401 && authState.isLoggedIn) authState.logout();

        // Removed from the active organisation (or it was deleted): fall back to another one.
        if (error?.response?.data?.code === "NOT_A_MEMBER" && getOrganisationStoreState().activeOrganisationId) {
            getOrganisationStoreState().setActiveOrganisationId(null);
            window.location.assign("/");
        }
        return Promise.reject(error);
    },
);

export default axiosInstance