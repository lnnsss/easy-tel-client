import { makeAutoObservable } from "mobx";
import { recognizeStore } from "./RecognizeStore";
import { authStore } from "./AuthStore";
import { uiStore } from "./UIStore";

class RootStore {
    constructor() {
        this.recognizeStore = recognizeStore;
        this.authStore = authStore;
        this.uiStore = uiStore;
        makeAutoObservable(this);
    }
}

export const rootStore = new RootStore();
