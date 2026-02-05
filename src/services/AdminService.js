import $api from "../api/instance.js";

export default class AdminService {
    static async createWord(wordData) {
        return $api.post('/admin/words', wordData);
    }

    static async getWords() {
        return $api.get('/admin/words');
    }

    // Метод для обновления (включая смену статуса isActive)
    static async updateWord(id, updateData) {
        return $api.put(`/admin/words/${id}`, updateData);
    }

    // Метод для полного удаления из БД
    static async deleteWord(id) {
        return $api.delete(`/admin/words/${id}`);
    }
}