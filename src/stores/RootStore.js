import { makeAutoObservable } from "mobx";
import { recognizeStore } from "./RecognizeStore";
import { authStore } from "./AuthStore";

class RootStore {
    constructor() {
        this.recognizeStore = recognizeStore;
        this.authStore = authStore;
        makeAutoObservable(this);
    }
}

export const rootStore = new RootStore();