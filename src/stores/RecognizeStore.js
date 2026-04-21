import { makeAutoObservable, runInAction } from "mobx";
import $api from "../api/instance";
import { authStore } from "./AuthStore";
import { uiStore } from "./UIStore";

class RecognizeStore {
    result = null;
    loading = false;
    examplesLoading = false;
    examplesRequested = false;
    examplesError = null;
    isSaving = false;
    error = null;
    preview = null;

    constructor() {
        makeAutoObservable(this);
    }

    setPreview(file) {
        this.result = null;
        this.error = null;
        this.examplesLoading = false;
        this.examplesRequested = false;
        this.examplesError = null;
        if (this.preview) URL.revokeObjectURL(this.preview);
        this.preview = URL.createObjectURL(file);
    }

    async recognize(file) {
        this.loading = true;
        this.error = null;
        this.result = null;
        this.examplesLoading = false;
        this.examplesRequested = false;
        this.examplesError = null;
        const formData = new FormData();
        formData.append("image", file);

        try {
            const { data } = await $api.post("/recognize", formData);
            runInAction(() => {
                if (data.success) {
                    this.result = {
                        ...data.data,
                        usageExamples: []
                    };
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

    async generateUsageExamples() {
        if (!this.result?.id || this.examplesLoading) return;

        this.examplesRequested = true;
        this.examplesError = null;
        this.examplesLoading = true;
        try {
            const excludeExamples = Array.isArray(this.result?.usageExamples)
                ? this.result.usageExamples.map((item) => item?.textRu).filter(Boolean)
                : [];

            const { data } = await $api.post("/recognize/examples", {
                wordId: this.result.id,
                excludeExamples
            });

            runInAction(() => {
                const usageExamples = Array.isArray(data?.data?.usageExamples)
                    ? data.data.usageExamples
                    : [];
                this.result = {
                    ...this.result,
                    usageExamples
                };
            });
        } catch (err) {
            runInAction(() => {
                this.examplesError = err.response?.data?.message || "Не удалось загрузить примеры";
            });
        } finally {
            runInAction(() => {
                this.examplesLoading = false;
            });
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
                uiStore.showModal({
                    title: "Готово",
                    message: "Слово добавлено в ваш словарь!",
                    variant: "success",
                    primaryLabel: "В словарь",
                    secondaryLabel: "Закрыть",
                    primaryRoute: "/dictionary"
                });
                this.reset();
            });
        } catch (err) {
            runInAction(() => {
                uiStore.showModal({
                    title: "Ошибка",
                    message: err.response?.data?.message || "Ошибка при добавлении",
                    variant: "error"
                });
            });
        } finally {
            runInAction(() => this.isSaving = false);
        }
    }

    reset() {
        this.result = null;
        this.preview = null;
        this.error = null;
        this.examplesLoading = false;
        this.examplesRequested = false;
        this.examplesError = null;
    }
}

export const recognizeStore = new RecognizeStore();
