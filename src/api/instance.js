import axios from "axios";

const $api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

$api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default $api;

$api.interceptors.response.use((response) => {
    const payload = response?.data;
    const unlocked = Array.isArray(payload?.unlockedNow)
        ? payload.unlockedNow
        : Array.isArray(payload?.data?.unlockedNow)
            ? payload.data.unlockedNow
            : [];

    if (unlocked.length && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('achievements:unlocked', { detail: unlocked }));
    }

    return response;
});
