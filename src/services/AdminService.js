import $api from "../api/instance.js";

export default class AdminService {
    static async createWord(wordData) {
        return $api.post('/admin/words', wordData);
    }

    static async getWords(page = 1, search = '', limit = 10) {
        return $api.get('/admin/words', {
            params: {
                page,
                limit,
                search
            }
        });
    }

    static async updateWord(id, updateData) {
        return $api.put(`/admin/words/${id}`, updateData);
    }

    static async deleteWord(id) {
        return $api.delete(`/admin/words/${id}`);
    }
}
