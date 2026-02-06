import { makeAutoObservable, runInAction } from "mobx";
import $api from "../api/instance";
import { authStore } from "./AuthStore";

class RecognizeStore {
    result = null;
    loading = false;
    isSaving = false;
    error = null;
    preview = null;

    constructor() {
        makeAutoObservable(this);
    }

    setPreview(file) {
        this.result = null;
        this.error = null;
        if (this.preview) URL.revokeObjectURL(this.preview);
        this.preview = URL.createObjectURL(file);
    }

    async recognize(file) {
        this.loading = true;
        this.error = null;
        this.result = null;
        const formData = new FormData();
        formData.append("image", file);

        try {
            const { data } = await $api.post("/recognize", formData);
            runInAction(() => {
                if (data.success) {
                    this.result = data.data;
                } else {
                    this.error = data.message;
                }
            });
        } catch (err) {
            runInAction(() => {
                this.error = err.response?.data?.message || "Ошибка соединения";
            });
        } finally {
            runInAction(() => this.loading = false);
        }
    }

    async addToDictionary() {
        if (!this.result?.id) return;
        this.isSaving = true;
        try {
            await $api.post("/dictionary/add", { wordId: this.result.id });
            // После успешного добавления вызываем обновление профиля
            await authStore.checkAuth();
            runInAction(() => {
                alert("Слово добавлено в ваш словарь!");
                this.reset();
            });
        } catch (err) {
            runInAction(() => {
                alert(err.response?.data?.message || "Ошибка при добавлении");
            });
        } finally {
            runInAction(() => this.isSaving = false);
        }
    }

    reset() {
        this.result = null;
        this.preview = null;
        this.error = null;
    }
}

export const recognizeStore = new RecognizeStore();