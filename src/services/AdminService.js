import $api from "../api/instance.js";

export default class AdminService {
    // Создает запись через API или сервисный слой.
    static async createWord(wordData) {
        return $api.post('/admin/words', wordData);
    }

    // Загружает данные сервиса и возвращает их вызывающему коду.
    static async getWords(page = 1, search = '', limit = 10) {
        return $api.get('/admin/words', {
            params: {
                page,
                limit,
                search
            }
        });
    }

    // Обновляет запись через API или сервисный слой.
    static async updateWord(id, updateData) {
        return $api.put(`/admin/words/${id}`, updateData);
    }

    // Удаляет запись через API или сервисный слой.
    static async deleteWord(id) {
        return $api.delete(`/admin/words/${id}`);
    }

    // Загружает данные сервиса и возвращает их вызывающему коду.
    static async getUsers(params = {}) {
        const {
            page = 1,
            search = '',
            limit = 10,
            role = '',
            authorRequestStatus = '',
            registrationDateFrom = '',
            registrationDateTo = '',
            hasCourses = '',
            minPoints = '',
            maxPoints = '',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = params;
        return $api.get('/admin/users', {
            params: {
                page,
                limit,
                search,
                role,
                authorRequestStatus,
                registrationDateFrom,
                registrationDateTo,
                hasCourses,
                minPoints,
                maxPoints,
                sortBy,
                sortOrder
            }
        });
    }

    // Удаляет запись через API или сервисный слой.
    static async deleteUser(id) {
        return $api.delete(`/admin/users/${id}`);
    }

    // Обновляет запись через API или сервисный слой.
    static async updateUserRole(id, role) {
        return $api.patch(`/admin/users/${id}/role`, { role });
    }

    // Загружает данные сервиса и возвращает их вызывающему коду.
    static async getAuthorRequests(page = 1, search = '', status = '', limit = 20) {
        return $api.get('/admin/author/requests', {
            params: {
                page,
                search,
                status,
                limit
            }
        });
    }

    // Сохраняет решение проверки для AuthorRequest.
    static async reviewAuthorRequest(id, decision, adminComment = '') {
        return $api.patch(`/admin/author/requests/${id}/review`, {
            decision,
            adminComment
        });
    }
}
