import { makeAutoObservable, runInAction } from "mobx";
import $api from "../api/instance";

class RecognizeStore {
    result = null;
    loading = false;
    error = null;
    preview = null;

    constructor() {
        makeAutoObservable(this);
    }

    setPreview(file) {
        // Очищаем старые результаты и ошибки при выборе нового фото
        this.result = null;
        this.error = null;
        // Создаем ссылку для превью
        this.preview = URL.createObjectURL(file);
    }

    async recognize(file) { // Переименовали для соответствия компоненту
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
                this.error = err.response?.data?.message || "Ошибка соединения с сервером";
            });
        } finally {
            runInAction(() => this.loading = false);
        }
    }

    reset() {
        this.result = null;
        this.preview = null;
        this.error = null;
    }
}

export const recognizeStore = new RecognizeStore();