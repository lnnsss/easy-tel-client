import { makeAutoObservable, runInAction } from "mobx";
import $api from "../api/instance";

class AuthStore {
    user = null;
    isAuth = false;
    isLoading = false;

    constructor() {
        makeAutoObservable(this);
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
            return { success: false, message: e.response?.data?.message || "Ошибка" };
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
            return { success: false, message: e.response?.data?.message || "Ошибка" };
        } finally {
            runInAction(() => this.isLoading = false);
        }
    }

    async checkAuth() {
        if (!localStorage.getItem('token')) return;
        try {
            const { data } = await $api.get('/auth/profile');
            runInAction(() => {
                this.user = data;
                this.isAuth = true;
            });
        } catch (e) {
            this.logout();
        }
    }

    logout() {
        this.user = null;
        this.isAuth = false;
        localStorage.removeItem('token');
    }
}

export const authStore = new AuthStore();