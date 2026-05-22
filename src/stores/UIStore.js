import { makeAutoObservable } from "mobx";

class UIStore {
    achievementQueue = [];
    copyToast = {
        isOpen: false,
        message: ''
    };

    modal = {
        isOpen: false,
        title: '',
        message: '',
        content: null,
        disableClose: false,
        variant: 'info',
        primaryLabel: '',
        secondaryLabel: 'Закрыть',
        primaryRoute: '',
        onPrimary: null,
        onSecondary: null
    };

    constructor() {
        makeAutoObservable(this);
    }

    showModal({
        title,
        message,
        content = null,
        disableClose = false,
        variant = 'info',
        primaryLabel = '',
        secondaryLabel = 'Закрыть',
        primaryRoute = '',
        onPrimary = null,
        onSecondary = null
    }) {
        this.modal = {
            isOpen: true,
            title,
            message,
            content,
            disableClose,
            variant,
            primaryLabel,
            secondaryLabel,
            primaryRoute,
            onPrimary,
            onSecondary
        };
    }

    enqueueAchievements(items = []) {
        const next = Array.isArray(items) ? items.filter(Boolean) : [];
        if (!next.length) return;
        this.achievementQueue = [...this.achievementQueue, ...next];
    }

    shiftAchievement() {
        if (!this.achievementQueue.length) return null;
        const [first, ...rest] = this.achievementQueue;
        this.achievementQueue = rest;
        return first;
    }

    closeModal() {
        this.modal = {
            ...this.modal,
            isOpen: false,
            content: null,
            disableClose: false
        };
    }

    showCopyToast(message = 'Скопировано в буфер обмена') {
        this.copyToast = {
            isOpen: true,
            message
        };
    }

    hideCopyToast() {
        this.copyToast = {
            ...this.copyToast,
            isOpen: false
        };
    }
}

export const uiStore = new UIStore();
