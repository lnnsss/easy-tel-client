import { makeAutoObservable, runInAction } from "mobx";
import $api from "../api/instance";

const AUTH_RETRY_DELAYS_MS = [1000, 2500, 5000];

class AuthStore {
    user = null;
    isAuth = false;
    isLoading = Boolean(localStorage.getItem('token'));
    authRecovering = false;
    authTransientError = '';
    authRetryAttempt = 0;
    authRetryTimer = null;

    constructor() {
        makeAutoObservable(this);
    }

    formatError(e, fallbackMessage) {
        const message = e.response?.data?.message || fallbackMessage;
        const details = e.response?.data?.details;
        return details ? `${message}. ${details}` : message;
    }

    clearAuthRetry() {
        if (this.authRetryTimer) {
            clearTimeout(this.authRetryTimer);
            this.authRetryTimer = null;
        }
    }

    scheduleAuthRetry() {
        if (this.authRetryTimer) return;
        if (this.authRetryAttempt >= AUTH_RETRY_DELAYS_MS.length) return;

        const delay = AUTH_RETRY_DELAYS_MS[this.authRetryAttempt];
        this.authRetryAttempt += 1;

        this.authRetryTimer = setTimeout(async () => {
            runInAction(() => {
                this.authRetryTimer = null;
            });
            await this.checkAuth();
        }, delay);
    }

    async register(fields) {
        try {
            this.isLoading = true;
            const { data } = await $api.post('/auth/register', fields);
            if (data.token) {
                localStorage.setItem('token', data.token);
                await this.checkAuth();
                return { success: true };
            }
            return { success: true, redirect: '/login' };
        } catch (e) {
            return {
                success: false,
                message: this.formatError(e, "Ошибка регистрации")
            };
        } finally {
            runInAction(() => this.isLoading = false);
        }
    }

    async login(identifier, password) {
        try {
            this.isLoading = true;
            const { data } = await $api.post('/auth/login', { identifier, password });
            localStorage.setItem('token', data.token);
            await this.checkAuth();
            return { success: true };
        } catch (e) {
            return {
                success: false,
                message: this.formatError(e, "Ошибка входа")
            };
        } finally {
            runInAction(() => this.isLoading = false);
        }
    }

    async loginWithToken(token) {
        try {
            this.isLoading = true;
            localStorage.setItem('token', token);
            await this.checkAuth();
            if (!this.isAuth) {
                return { success: false, message: 'Не удалось войти через Google' };
            }
            return { success: true };
        } catch (e) {
            return {
                success: false,
                message: this.formatError(e, "Ошибка входа")
            };
        } finally {
            runInAction(() => this.isLoading = false);
        }
    }

    async verifyEmail(code) {
        try {
            const { data } = await $api.post('/auth/verify-email', { code });
            await this.checkAuth();
            return { success: true, message: data.message };
        } catch (e) {
            return {
                success: false,
                message: this.formatError(e, "Ошибка подтверждения почты")
            };
        }
    }

    async resendVerificationCode() {
        try {
            const { data } = await $api.post('/auth/resend-verification-code');
            return { success: true, message: data.message };
        } catch (e) {
            return {
                success: false,
                message: this.formatError(e, "Ошибка повторной отправки кода")
            };
        }
    }

    async forgotPassword(email) {
        try {
            const { data } = await $api.post('/auth/forgot-password', { email });
            return { success: true, message: data.message };
        } catch (e) {
            return {
                success: false,
                message: this.formatError(e, "Ошибка запроса сброса")
            };
        }
    }

    async resetPassword(token, password) {
        try {
            const { data } = await $api.post('/auth/reset-password', { token, password });
            this.logout();
            return { success: true, message: data.message };
        } catch (e) {
            return {
                success: false,
                message: this.formatError(e, "Ошибка сброса пароля")
            };
        }
    }

    async updateProfile(fields) {
        try {
            const { data } = await $api.patch('/auth/profile', fields);
            runInAction(() => {
                this.user = data.user;
            });
            return { success: true, message: data.message };
        } catch (e) {
            return {
                success: false,
                message: this.formatError(e, "Ошибка обновления профиля")
            };
        }
    }

    async uploadAvatar(file) {
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            const { data } = await $api.post('/auth/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            await this.checkAuth();
            return { success: true, message: data.message, avatarUrl: data.avatarUrl };
        } catch (e) {
            return {
                success: false,
                message: this.formatError(e, "Ошибка загрузки аватара")
            };
        }
    }

    async checkAuth() {
        if (!localStorage.getItem('token')) {
            runInAction(() => {
                this.isLoading = false;
            });
            return;
        }

        runInAction(() => {
            this.isLoading = true;
        });

        try {
            const { data } = await $api.get('/auth/profile');
            runInAction(() => {
                this.user = data;
                this.isAuth = true;
                this.authRecovering = false;
                this.authTransientError = '';
                this.authRetryAttempt = 0;
            });
            this.clearAuthRetry();
        } catch (e) {
            const status = Number(e?.response?.status) || 0;
            const isHardAuthFailure = status === 401 || status === 403;

            if (isHardAuthFailure) {
                this.clearAuthRetry();
                this.logout();
            } else {
                runInAction(() => {
                    this.authRecovering = true;
                    this.authTransientError = this.formatError(e, 'Временная ошибка проверки сессии');
                });
                this.scheduleAuthRetry();
            }
        } finally {
            runInAction(() => {
                this.isLoading = false;
            });
        }
    }

    async refreshProfile() {
        if (!localStorage.getItem('token')) return;
        try {
            const { data } = await $api.get('/auth/profile');
            runInAction(() => {
                this.user = data;
                this.isAuth = true;
            });
        } catch (e) {
            if (e?.response?.status === 401) {
                this.logout();
            }
        }
    }

    async markAuthorRequestSeen(requestId) {
        if (!requestId) return;
        try {
            await $api.patch(`/author/requests/${requestId}/seen`);
            runInAction(() => {
                if (!this.user) return;
                const latest = this.user.latestAuthorRequest || null;
                if (latest && String(latest._id) === String(requestId)) {
                    latest.decisionSeenAt = new Date().toISOString();
                }
                this.user.authorRequestNotice = null;
            });
        } catch (e) {
            console.error('markAuthorRequestSeen error', e);
        }
    }

    logout() {
        this.clearAuthRetry();
        this.user = null;
        this.isAuth = false;
        this.authRecovering = false;
        this.authTransientError = '';
        this.authRetryAttempt = 0;
        localStorage.removeItem('token');
    }
}

export const authStore = new AuthStore();
