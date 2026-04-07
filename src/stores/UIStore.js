import { makeAutoObservable } from "mobx";

class UIStore {
    modal = {
        isOpen: false,
        title: '',
        message: '',
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
            variant,
            primaryLabel,
            secondaryLabel,
            primaryRoute,
            onPrimary,
            onSecondary
        };
    }

    closeModal() {
        this.modal = {
            ...this.modal,
            isOpen: false
        };
    }
}

export const uiStore = new UIStore();
