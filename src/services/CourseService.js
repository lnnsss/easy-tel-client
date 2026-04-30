import $api from '../api/instance';

export default class CourseService {
    static async getCourses() {
        return $api.get('/courses');
    }

    static async getCourse(id) {
        return $api.get(`/courses/${id}`);
    }

    static async getTopic(courseId, topicId) {
        return $api.get(`/courses/${courseId}/topics/${topicId}`);
    }

    static async submitTopicQuiz(courseId, topicId, answers) {
        return $api.post(`/courses/${courseId}/topics/${topicId}/quiz/submit`, { answers });
    }

    static async getAnalytics() {
        return $api.get('/courses/analytics');
    }

    static async getProgress() {
        return $api.get('/courses/progress');
    }

    static async getAdminCategories() {
        return $api.get('/admin/learning/course-categories');
    }

    static async createAdminCategory(payload) {
        return $api.post('/admin/learning/course-categories', payload);
    }

    static async updateAdminCategory(id, payload) {
        return $api.put(`/admin/learning/course-categories/${id}`, payload);
    }

    static async deleteAdminCategory(id) {
        return $api.delete(`/admin/learning/course-categories/${id}`);
    }

    static async getAdminCourses() {
        return $api.get('/admin/learning/courses');
    }

    static async createAdminCourse(payload) {
        return $api.post('/admin/learning/courses', payload);
    }

    static async updateAdminCourse(id, payload) {
        return $api.put(`/admin/learning/courses/${id}`, payload);
    }

    static async deleteAdminCourse(id) {
        return $api.delete(`/admin/learning/courses/${id}`);
    }

    static async getAdminTopics(courseId) {
        return $api.get('/admin/learning/topics', { params: courseId ? { courseId } : {} });
    }

    static async createAdminTopic(payload) {
        return $api.post('/admin/learning/topics', payload);
    }

    static async uploadAdminTopicImage(file) {
        const formData = new FormData();
        formData.append('image', file);
        return $api.post('/admin/learning/topics/upload-image', formData);
    }

    static async updateAdminTopic(id, payload) {
        return $api.put(`/admin/learning/topics/${id}`, payload);
    }

    static async deleteAdminTopic(id) {
        return $api.delete(`/admin/learning/topics/${id}`);
    }

    static async getAdminTopicQuiz(topicId) {
        return $api.get(`/admin/learning/topics/${topicId}/quiz`);
    }

    static async upsertAdminTopicQuiz(topicId, payload) {
        return $api.put(`/admin/learning/topics/${topicId}/quiz`, payload);
    }

    static async reviewAdminCourse(courseId, payload) {
        return $api.patch(`/admin/learning/courses/${courseId}/review`, payload);
    }

    static async getAuthorRequest() {
        return $api.get('/author/requests/me');
    }

    static async createAuthorRequest(payload) {
        return $api.post('/author/requests', payload);
    }

    static async markAuthorRequestSeen(requestId) {
        return $api.patch(`/author/requests/${requestId}/seen`);
    }

    static async getAuthorCategories() {
        return $api.get('/author/learning/course-categories');
    }

    static async getAuthorCourses() {
        return $api.get('/author/learning/courses');
    }

    static async createAuthorCourse(payload) {
        return $api.post('/author/learning/courses', payload);
    }

    static async updateAuthorCourse(id, payload) {
        return $api.put(`/author/learning/courses/${id}`, payload);
    }

    static async deleteAuthorCourse(id) {
        return $api.delete(`/author/learning/courses/${id}`);
    }

    static async submitAuthorCourseForReview(id) {
        return $api.post(`/author/learning/courses/${id}/submit-review`);
    }

    static async createAuthorCourseRevision(id) {
        return $api.post(`/author/learning/courses/${id}/create-revision`);
    }

    static async getAuthorTopics(courseId) {
        return $api.get('/author/learning/topics', { params: courseId ? { courseId } : {} });
    }

    static async createAuthorTopic(payload) {
        return $api.post('/author/learning/topics', payload);
    }

    static async uploadAuthorTopicImage(courseId, file) {
        const formData = new FormData();
        formData.append('courseId', courseId);
        formData.append('image', file);
        return $api.post('/author/learning/topics/upload-image', formData);
    }

    static async updateAuthorTopic(id, payload) {
        return $api.put(`/author/learning/topics/${id}`, payload);
    }

    static async deleteAuthorTopic(id) {
        return $api.delete(`/author/learning/topics/${id}`);
    }

    static async getAuthorTopicQuiz(topicId) {
        return $api.get(`/author/learning/topics/${topicId}/quiz`);
    }

    static async upsertAuthorTopicQuiz(topicId, payload) {
        return $api.put(`/author/learning/topics/${topicId}/quiz`, payload);
    }
}
