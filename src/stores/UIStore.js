import { makeAutoObservable } from "mobx";

class UIStore {
    modal = {
        isOpen: false,
        title: '',
        message: '',
        variant: 'info',
        primaryLabel: '',
        secondaryLabel: 'Закрыть',
        primaryRoute: ''
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
        primaryRoute = ''
    }) {
        this.modal = {
            isOpen: true,
            title,
            message,
            variant,
            primaryLabel,
            secondaryLabel,
            primaryRoute
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
