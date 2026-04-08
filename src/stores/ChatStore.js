import { makeAutoObservable, runInAction } from 'mobx';
import { io } from 'socket.io-client';
import $api from '../api/instance';
import { authStore } from './AuthStore';

const getSocketBaseUrl = () => {
    const api = import.meta.env.VITE_API_URL || '';
    return api.replace(/\/api\/?$/, '');
};

class ChatStore {
    chats = [];
    messagesByConversation = new Map();
    hasMoreByConversation = new Map();
    activeConversationId = '';
    unreadTotal = 0;
    chatsPagination = { page: 1, limit: 20, total: 0, totalPages: 1 };
    connected = false;
    socket = null;

    isLoadingChats = false;
    isLoadingMessages = false;
    isSending = false;

    constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    connectSocket() {
        const token = localStorage.getItem('token');
        if (!token || this.socket) return;

        this.socket = io(getSocketBaseUrl(), {
            auth: { token }
        });

        this.socket.on('connect', () => {
            runInAction(() => {
                this.connected = true;
            });
        });

        this.socket.on('disconnect', () => {
            runInAction(() => {
                this.connected = false;
            });
        });

        this.socket.on('chat:new', (message) => {
            this.upsertIncomingMessage(message);
        });

        this.socket.on('chat:read_update', (payload) => {
            const conversationId = String(payload?.conversationId || '');
            const unreadCount = Number(payload?.unreadCount);
            const totalUnread = Number(payload?.totalUnread);

            if (conversationId && Number.isFinite(unreadCount)) {
                this.chats = this.chats.map((chat) => (
                    String(chat._id) === conversationId ? { ...chat, unreadCount } : chat
                ));
            }

            if (Number.isFinite(totalUnread)) {
                this.unreadTotal = totalUnread;
            } else {
                this.unreadTotal = this.chats.reduce((sum, chat) => sum + (Number(chat.unreadCount) || 0), 0);
            }
        });
    }

    disconnectSocket() {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
        this.connected = false;
    }

    async loadChats(page = 1, limit = 20) {
        this.isLoadingChats = true;
        try {
            const { data } = await $api.get('/chats', { params: { page, limit } });
            runInAction(() => {
                this.chats = data?.items || [];
                this.unreadTotal = Number(data?.totalUnread) || 0;
                this.chatsPagination = data?.pagination || { page, limit, total: 0, totalPages: 1 };
            });
        } catch {
            runInAction(() => {
                this.chats = [];
                this.unreadTotal = 0;
                this.chatsPagination = { page, limit, total: 0, totalPages: 1 };
            });
        } finally {
            runInAction(() => {
                this.isLoadingChats = false;
            });
        }
    }

    async openOrCreateChat(friendUserId) {
        const { data } = await $api.post(`/chats/with/${friendUserId}`);
        const conversation = data?.conversation;
        if (!conversation?._id) return null;

        runInAction(() => {
            const existing = this.chats.find((chat) => String(chat._id) === String(conversation._id));
            if (existing) {
                this.chats = this.chats.map((chat) => (
                    String(chat._id) === String(conversation._id) ? { ...chat, ...conversation } : chat
                ));
            } else {
                this.chats = [conversation, ...this.chats];
            }
            this.activeConversationId = String(conversation._id);
        });

        return conversation;
    }

    async loadMessages(conversationId, before = null, limit = 30) {
        if (!conversationId) return;
        this.isLoadingMessages = true;
        try {
            const { data } = await $api.get(`/chats/${conversationId}/messages`, {
                params: { before, limit }
            });

            const items = data?.items || [];
            const existing = this.messagesByConversation.get(conversationId) || [];
            const merged = before ? [...items, ...existing] : items;
            const dedupMap = new Map();
            merged.forEach((item) => dedupMap.set(String(item._id), item));
            const next = Array.from(dedupMap.values()).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            runInAction(() => {
                this.messagesByConversation.set(conversationId, next);
                this.hasMoreByConversation.set(conversationId, Boolean(data?.hasMore));
            });
        } finally {
            runInAction(() => {
                this.isLoadingMessages = false;
            });
        }
    }

    setActiveConversation(conversationId) {
        this.activeConversationId = String(conversationId || '');
    }

    async markAsRead(conversationId) {
        if (!conversationId) return;
        await $api.post(`/chats/${conversationId}/read`);

        runInAction(() => {
            this.chats = this.chats.map((chat) => (
                String(chat._id) === String(conversationId) ? { ...chat, unreadCount: 0 } : chat
            ));
            this.unreadTotal = this.chats.reduce((sum, chat) => sum + (Number(chat.unreadCount) || 0), 0);
        });

        if (this.socket) {
            this.socket.emit('chat:read', { conversationId });
        }
    }

    async sendMessage(conversationId, text) {
        const message = String(text || '').trim();
        if (!conversationId || !message) return;
        if (message.length > 2000) throw new Error('Слишком длинное сообщение');

        this.isSending = true;
        try {
            if (!this.socket) this.connectSocket();
            this.socket?.emit('chat:send', { conversationId, text: message });
        } finally {
            this.isSending = false;
        }
    }

    upsertIncomingMessage(message) {
        if (!message?._id || !message?.conversationId) return;

        const conversationId = String(message.conversationId);
        const existing = this.messagesByConversation.get(conversationId) || [];
        const exists = existing.some((item) => String(item._id) === String(message._id));
        const nextMessages = exists ? existing : [...existing, message];

        this.messagesByConversation.set(
            conversationId,
            nextMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        );

        this.chats = this.chats.map((chat) => (
            String(chat._id) === conversationId
                ? {
                    ...chat,
                    lastMessageText: message.text,
                    lastMessageAt: message.createdAt
                }
                : chat
        ));

        if (!this.chats.some((chat) => String(chat._id) === conversationId)) {
            this.loadChats();
        }

        const me = String(authStore.user?._id || '');
        const isMine = String(message.senderId) === me;
        const isActive = String(this.activeConversationId) === conversationId;

        if (!isMine && !isActive) {
            this.chats = this.chats.map((chat) => (
                String(chat._id) === conversationId
                    ? { ...chat, unreadCount: (Number(chat.unreadCount) || 0) + 1 }
                    : chat
            ));
            this.unreadTotal += 1;
        } else if (!isMine && isActive) {
            this.markAsRead(conversationId);
        }
    }
}

export const chatStore = new ChatStore();
