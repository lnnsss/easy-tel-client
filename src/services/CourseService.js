import $api from '../api/instance';

export default class CourseService {
    // Загружает данные сервиса и возвращает их вызывающему коду.
    static async getCourses() {
        return $api.get('/courses');
    }

    // Загружает данные сервиса и возвращает их вызывающему коду.
    static async getCourse(id) {
        return $api.get(`/courses/${id}`);
    }

    // Загружает данные сервиса и возвращает их вызывающему коду.
    static async getTopic(courseId, topicId) {
        return $api.get(`/courses/${courseId}/topics/${topicId}`);
    }

    // Отправляет TopicQuiz на сервер.
    static async submitTopicQuiz(courseId, topicId, answers) {
        return $api.post(`/courses/${courseId}/topics/${topicId}/quiz/submit`, { answers });
    }

    // Загружает данные сервиса и возвращает их вызывающему коду.
    static async getAnalytics() {
        return $api.get('/courses/analytics');
    }

    // Загружает данные сервиса и возвращает их вызывающему коду.
    static async getProgress() {
        return $api.get('/courses/progress');
    }

    // Загружает данные сервиса и возвращает их вызывающему коду.
    static async getAdminCategories() {
        return $api.get('/admin/learning/course-categories');
    }

    // Создает запись через API или сервисный слой.
    static async createAdminCategory(payload) {
        return $api.post('/admin/learning/course-categories', payload);
    }

    // Обновляет запись через API или сервисный слой.
    static async updateAdminCategory(id, payload) {
        return $api.put(`/admin/learning/course-categories/${id}`, payload);
    }

    // Удаляет запись через API или сервисный слой.
    static async deleteAdminCategory(id) {
        return $api.delete(`/admin/learning/course-categories/${id}`);
    }

    // Загружает данные сервиса и возвращает их вызывающему коду.
    static async getAdminCourses() {
        return $api.get('/admin/learning/courses');
    }

    // Создает запись через API или сервисный слой.
    static async createAdminCourse(payload) {
        return $api.post('/admin/learning/courses', payload);
    }

    // Обновляет запись через API или сервисный слой.
    static async updateAdminCourse(id, payload) {
        return $api.put(`/admin/learning/courses/${id}`, payload);
    }

    // Удаляет запись через API или сервисный слой.
    static async deleteAdminCourse(id) {
        return $api.delete(`/admin/learning/courses/${id}`);
    }

    // Загружает данные сервиса и возвращает их вызывающему коду.
    static async getAdminTopics(courseId) {
        return $api.get('/admin/learning/topics', { params: courseId ? { courseId } : {} });
    }

    // Создает запись через API или сервисный слой.
    static async createAdminTopic(payload) {
        return $api.post('/admin/learning/topics', payload);
    }

    // Загружает файл для AdminTopicImage через API.
    static async uploadAdminTopicImage(file) {
        const formData = new FormData();
        formData.append('image', file);
        return $api.post('/admin/learning/topics/upload-image', formData);
    }

    // Обновляет запись через API или сервисный слой.
    static async updateAdminTopic(id, payload) {
        return $api.put(`/admin/learning/topics/${id}`, payload);
    }

    // Удаляет запись через API или сервисный слой.
    static async deleteAdminTopic(id) {
        return $api.delete(`/admin/learning/topics/${id}`);
    }

    // Загружает данные сервиса и возвращает их вызывающему коду.
    static async getAdminTopicQuiz(topicId) {
        return $api.get(`/admin/learning/topics/${topicId}/quiz`);
    }

    // Создает или обновляет AdminTopicQuiz через API.
    static async upsertAdminTopicQuiz(topicId, payload) {
        return $api.put(`/admin/learning/topics/${topicId}/quiz`, payload);
    }

    // Сохраняет решение проверки для AdminCourse.
    static async reviewAdminCourse(courseId, payload) {
        return $api.patch(`/admin/learning/courses/${courseId}/review`, payload);
    }

    // Загружает данные сервиса и возвращает их вызывающему коду.
    static async getAdminDailyRewardsConfig() {
        return $api.get('/admin/learning/daily-rewards');
    }

    // Обновляет запись через API или сервисный слой.
    static async updateAdminDailyRewardsConfig(days) {
        return $api.put('/admin/learning/daily-rewards', { days });
    }

    // Загружает данные сервиса и возвращает их вызывающему коду.
    static async getDailyRewards() {
        return $api.get('/rewards/daily');
    }

    // Получает награду или бонус через API.
    static async claimDailyReward() {
        return $api.post('/rewards/daily/claim');
    }

    // Помечает состояние DailyRewardModalSeen на сервере.
    static async markDailyRewardModalSeen() {
        return $api.post('/rewards/daily/modal-seen');
    }

    // Загружает данные сервиса и возвращает их вызывающему коду.
    static async getAuthorRequest() {
        return $api.get('/author/requests/me');
    }

    // Создает запись через API или сервисный слой.
    static async createAuthorRequest(payload) {
        return $api.post('/author/requests', payload);
    }

    // Помечает состояние AuthorRequestSeen на сервере.
    static async markAuthorRequestSeen(requestId) {
        return $api.patch(`/author/requests/${requestId}/seen`);
    }

    // Загружает данные сервиса и возвращает их вызывающему коду.
    static async getAuthorCategories() {
        return $api.get('/author/learning/course-categories');
    }

    // Загружает данные сервиса и возвращает их вызывающему коду.
    static async getAuthorCourses() {
        return $api.get('/author/learning/courses');
    }

    // Создает запись через API или сервисный слой.
    static async createAuthorCourse(payload) {
        return $api.post('/author/learning/courses', payload);
    }

    // Обновляет запись через API или сервисный слой.
    static async updateAuthorCourse(id, payload) {
        return $api.put(`/author/learning/courses/${id}`, payload);
    }

    // Удаляет запись через API или сервисный слой.
    static async deleteAuthorCourse(id) {
        return $api.delete(`/author/learning/courses/${id}`);
    }

    // Отправляет AuthorCourseForReview на сервер.
    static async submitAuthorCourseForReview(id) {
        return $api.post(`/author/learning/courses/${id}/submit-review`);
    }

    // Создает запись через API или сервисный слой.
    static async createAuthorCourseRevision(id) {
        return $api.post(`/author/learning/courses/${id}/create-revision`);
    }

    // Загружает данные сервиса и возвращает их вызывающему коду.
    static async getAuthorTopics(courseId) {
        return $api.get('/author/learning/topics', { params: courseId ? { courseId } : {} });
    }

    // Создает запись через API или сервисный слой.
    static async createAuthorTopic(payload) {
        return $api.post('/author/learning/topics', payload);
    }

    // Загружает файл для AuthorTopicImage через API.
    static async uploadAuthorTopicImage(courseId, file) {
        const formData = new FormData();
        formData.append('courseId', courseId);
        formData.append('image', file);
        return $api.post('/author/learning/topics/upload-image', formData);
    }

    // Обновляет запись через API или сервисный слой.
    static async updateAuthorTopic(id, payload) {
        return $api.put(`/author/learning/topics/${id}`, payload);
    }

    // Удаляет запись через API или сервисный слой.
    static async deleteAuthorTopic(id) {
        return $api.delete(`/author/learning/topics/${id}`);
    }

    // Загружает данные сервиса и возвращает их вызывающему коду.
    static async getAuthorTopicQuiz(topicId) {
        return $api.get(`/author/learning/topics/${topicId}/quiz`);
    }

    // Создает или обновляет AuthorTopicQuiz через API.
    static async upsertAuthorTopicQuiz(topicId, payload) {
        return $api.put(`/author/learning/topics/${topicId}/quiz`, payload);
    }
}
