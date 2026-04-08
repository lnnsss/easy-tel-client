import { makeAutoObservable, runInAction } from 'mobx';
import $api from '../api/instance';

const DEFAULT_PAGINATION = { page: 1, limit: 10, total: 0, totalPages: 1 };

class SocialStore {
    searchResults = [];
    friends = [];
    incomingRequests = [];
    outgoingRequests = [];
    friendRanking = [];
    companionRequests = [];
    myCompanionRequest = null;

    searchPagination = { ...DEFAULT_PAGINATION, limit: 20 };
    friendsPagination = { ...DEFAULT_PAGINATION };
    incomingPagination = { ...DEFAULT_PAGINATION };
    outgoingPagination = { ...DEFAULT_PAGINATION };
    rankingPagination = { ...DEFAULT_PAGINATION };
    companionPagination = { ...DEFAULT_PAGINATION };

    searchQuery = '';

    isLoadingSearch = false;
    isLoadingFriends = false;
    isLoadingRequests = false;
    isLoadingRanking = false;
    isLoadingCompanion = false;

    constructor() {
        makeAutoObservable(this);
    }

    async searchUsers(q = '', page = 1, limit = 20) {
        this.isLoadingSearch = true;
        this.searchQuery = q;
        try {
            const { data } = await $api.get('/friends/search', {
                params: { q, page, limit }
            });
            runInAction(() => {
                this.searchResults = data?.items || [];
                this.searchPagination = data?.pagination || { page, limit, total: 0, totalPages: 1 };
            });
        } catch {
            runInAction(() => {
                this.searchResults = [];
                this.searchPagination = { page, limit, total: 0, totalPages: 1 };
            });
        } finally {
            runInAction(() => {
                this.isLoadingSearch = false;
            });
        }
    }

    async loadFriends(page = 1, limit = 10) {
        this.isLoadingFriends = true;
        try {
            const { data } = await $api.get('/friends/list', { params: { page, limit } });
            runInAction(() => {
                this.friends = data?.items || [];
                this.friendsPagination = data?.pagination || { page, limit, total: 0, totalPages: 1 };
            });
        } catch {
            runInAction(() => {
                this.friends = [];
                this.friendsPagination = { page, limit, total: 0, totalPages: 1 };
            });
        } finally {
            runInAction(() => {
                this.isLoadingFriends = false;
            });
        }
    }

    async loadIncomingRequests(page = 1, limit = 10) {
        this.isLoadingRequests = true;
        try {
            const { data } = await $api.get('/friends/requests/incoming', { params: { page, limit } });
            runInAction(() => {
                this.incomingRequests = data?.items || [];
                this.incomingPagination = data?.pagination || { page, limit, total: 0, totalPages: 1 };
            });
        } catch {
            runInAction(() => {
                this.incomingRequests = [];
                this.incomingPagination = { page, limit, total: 0, totalPages: 1 };
            });
        } finally {
            runInAction(() => {
                this.isLoadingRequests = false;
            });
        }
    }

    async loadOutgoingRequests(page = 1, limit = 10) {
        this.isLoadingRequests = true;
        try {
            const { data } = await $api.get('/friends/requests/outgoing', { params: { page, limit } });
            runInAction(() => {
                this.outgoingRequests = data?.items || [];
                this.outgoingPagination = data?.pagination || { page, limit, total: 0, totalPages: 1 };
            });
        } catch {
            runInAction(() => {
                this.outgoingRequests = [];
                this.outgoingPagination = { page, limit, total: 0, totalPages: 1 };
            });
        } finally {
            runInAction(() => {
                this.isLoadingRequests = false;
            });
        }
    }

    async loadFriendRanking(page = 1, limit = 10) {
        this.isLoadingRanking = true;
        try {
            const { data } = await $api.get('/ranking/friends', { params: { page, limit } });
            runInAction(() => {
                this.friendRanking = Array.isArray(data) ? data : (data?.items || []);
                this.rankingPagination = data?.pagination || { page, limit, total: 0, totalPages: 1 };
            });
        } catch {
            runInAction(() => {
                this.friendRanking = [];
                this.rankingPagination = { page, limit, total: 0, totalPages: 1 };
            });
        } finally {
            runInAction(() => {
                this.isLoadingRanking = false;
            });
        }
    }

    async loadCompanionRequests(page = 1, limit = 10) {
        this.isLoadingCompanion = true;
        try {
            const { data } = await $api.get('/friends/companion-requests', { params: { page, limit } });
            runInAction(() => {
                this.companionRequests = data?.items || [];
                this.myCompanionRequest = data?.myRequest || null;
                this.companionPagination = data?.pagination || { page, limit, total: 0, totalPages: 1 };
            });
        } catch {
            runInAction(() => {
                this.companionRequests = [];
                this.myCompanionRequest = null;
                this.companionPagination = { page, limit, total: 0, totalPages: 1 };
            });
        } finally {
            runInAction(() => {
                this.isLoadingCompanion = false;
            });
        }
    }

    async publishCompanionRequest(purpose, customPurpose = '') {
        const { data } = await $api.post('/friends/companion-requests', { purpose, customPurpose });
        await this.loadCompanionRequests(this.companionPagination.page, this.companionPagination.limit);
        return data?.request || null;
    }

    async withdrawCompanionRequest() {
        await $api.delete('/friends/companion-requests/me');
        await this.loadCompanionRequests(this.companionPagination.page, this.companionPagination.limit);
    }

    async refreshCurrentSlices(options = {}) {
        const {
            search = true,
            friends = true,
            incoming = true,
            outgoing = true,
            ranking = true,
            companion = false
        } = options;

        const tasks = [];
        if (search) tasks.push(this.searchUsers(this.searchQuery, this.searchPagination.page, this.searchPagination.limit));
        if (friends) tasks.push(this.loadFriends(this.friendsPagination.page, this.friendsPagination.limit));
        if (incoming) tasks.push(this.loadIncomingRequests(this.incomingPagination.page, this.incomingPagination.limit));
        if (outgoing) tasks.push(this.loadOutgoingRequests(this.outgoingPagination.page, this.outgoingPagination.limit));
        if (ranking) tasks.push(this.loadFriendRanking(this.rankingPagination.page, this.rankingPagination.limit));
        if (companion) tasks.push(this.loadCompanionRequests(this.companionPagination.page, this.companionPagination.limit));

        await Promise.allSettled(tasks);
    }

    async sendFriendRequest(toUserId) {
        await $api.post('/friends/requests', { toUserId });
        await this.refreshCurrentSlices({
            search: true,
            friends: false,
            incoming: false,
            outgoing: true,
            ranking: false,
            companion: true
        });
    }

    async acceptRequest(requestId) {
        await $api.post(`/friends/requests/${requestId}/accept`);
        await this.refreshCurrentSlices({
            search: true,
            friends: true,
            incoming: true,
            outgoing: true,
            ranking: true,
            companion: true
        });
    }

    async declineRequest(requestId) {
        await $api.post(`/friends/requests/${requestId}/decline`);
        await this.refreshCurrentSlices({
            search: true,
            friends: false,
            incoming: true,
            outgoing: false,
            ranking: false,
            companion: true
        });
    }

    async cancelRequest(requestId) {
        await $api.post(`/friends/requests/${requestId}/cancel`);
        await this.refreshCurrentSlices({
            search: true,
            friends: false,
            incoming: false,
            outgoing: true,
            ranking: false,
            companion: true
        });
    }

    async removeFriend(friendUserId) {
        await $api.delete(`/friends/${friendUserId}`);
        await this.refreshCurrentSlices({
            search: true,
            friends: true,
            incoming: false,
            outgoing: false,
            ranking: true,
            companion: true
        });
    }
}

export const socialStore = new SocialStore();
