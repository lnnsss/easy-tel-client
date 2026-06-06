import $api from '../api/instance';

export default class AiChatService {
    // Отправляет сообщение в AI-чат и возвращает ответ ассистента.
    static async sendMessage({ messages, mode = 'tutor' }) {
        return $api.post('/ai-chat/message', { messages, mode });
    }
}
