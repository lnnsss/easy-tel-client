import $api from '../api/instance';

export default class AiChatService {
    static async sendMessage({ messages, mode = 'tutor' }) {
        return $api.post('/ai-chat/message', { messages, mode });
    }
}
