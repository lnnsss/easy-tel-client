import { makeAutoObservable } from "mobx";
import { recognizeStore } from "./RecognizeStore";
import { authStore } from "./AuthStore";
import { uiStore } from "./UIStore";
import { socialStore } from './SocialStore';
import { chatStore } from './ChatStore';

class RootStore {
    constructor() {
        this.recognizeStore = recognizeStore;
        this.authStore = authStore;
        this.uiStore = uiStore;
        this.socialStore = socialStore;
        this.chatStore = chatStore;
        makeAutoObservable(this);
    }
}

export const rootStore = new RootStore();
