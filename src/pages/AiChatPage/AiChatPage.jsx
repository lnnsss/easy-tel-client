import React, { useEffect, useMemo, useRef, useState } from 'react';
import AiChatService from '../../services/AiChatService';
import styles from './AiChatPage.module.css';

const MAX_CONTEXT_MESSAGES = 16;
const AI_CHAT_STORAGE_KEY = 'aiChatMessages:v1';

const buildAssistantGreeting = () => ({
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content: 'Привет! Я Аиша, AI-тьютор платформы EasyTel по татарскому. Напиши слово или фразу, и я помогу с переводом, исправлением и практикой.'
});

const loadMessagesFromStorage = () => {
    try {
        const raw = localStorage.getItem(AI_CHAT_STORAGE_KEY);
        if (!raw) return [buildAssistantGreeting()];

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.length) return [buildAssistantGreeting()];

        const safeMessages = parsed
            .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && String(item.content || '').trim())
            .map((item, index) => ({
                id: String(item.id || `${item.role}-${Date.now()}-${index}`),
                role: item.role,
                content: String(item.content)
            }));

        return safeMessages.length ? safeMessages : [buildAssistantGreeting()];
    } catch {
        return [buildAssistantGreeting()];
    }
};

const AiChatPage = () => {
    const [messages, setMessages] = useState(loadMessagesFromStorage);
    const [draft, setDraft] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');
    const listRef = useRef(null);
    const streamTimerRef = useRef(null);

    const contextMessages = useMemo(() => {
        const normalized = messages.map((item) => ({ role: item.role, content: item.content }));
        return normalized.slice(-MAX_CONTEXT_MESSAGES);
    }, [messages]);

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            if (!listRef.current) return;
            listRef.current.scrollTop = listRef.current.scrollHeight;
        });
    };

    useEffect(() => {
        localStorage.setItem(AI_CHAT_STORAGE_KEY, JSON.stringify(messages));
    }, [messages]);

    useEffect(() => {
        scrollToBottom();
    }, []);

    const clearStreamTimer = () => {
        if (streamTimerRef.current) {
            clearInterval(streamTimerRef.current);
            streamTimerRef.current = null;
        }
    };

    useEffect(() => {
        return () => clearStreamTimer();
    }, []);

    const onStartNewChat = () => {
        if (isSending) return;
        clearStreamTimer();
        setDraft('');
        setError('');
        setMessages([buildAssistantGreeting()]);
    };

    const onSend = async (e) => {
        e.preventDefault();
        const userText = String(draft || '').trim();
        if (!userText || isSending) return;

        const userMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: userText
        };

        setDraft('');
        setError('');
        clearStreamTimer();
        setIsSending(true);
        setMessages((prev) => [...prev, userMessage]);
        scrollToBottom();

        try {
            const nextContext = [...contextMessages, { role: 'user', content: userText }].slice(-MAX_CONTEXT_MESSAGES);
            const { data } = await AiChatService.sendMessage({
                messages: nextContext,
                mode: 'tutor'
            });

            const assistantText = String(data?.reply || '').trim();
            if (!assistantText) {
                throw new Error('Пустой ответ от AI');
            }

            const assistantMessageId = `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const words = assistantText.split(/\s+/).filter(Boolean);
            let currentWord = 0;

            setMessages((prev) => [
                ...prev,
                {
                    id: assistantMessageId,
                    role: 'assistant',
                    content: ''
                }
            ]);
            scrollToBottom();

            streamTimerRef.current = setInterval(() => {
                currentWord += 1;
                const nextChunk = words.slice(0, currentWord).join(' ');

                setMessages((prev) => prev.map((item) => (
                    item.id === assistantMessageId ? { ...item, content: nextChunk } : item
                )));
                scrollToBottom();

                if (currentWord >= words.length) {
                    clearStreamTimer();
                    setIsSending(false);
                }
            }, 80);
        } catch (err) {
            clearStreamTimer();
            setError(err.response?.data?.message || err.message || 'Ошибка AI чата');
            setIsSending(false);
        }
    };

    return (
        <div className={`${styles.page} app-page-shell`}>
            <div className="app-page-top">
                <div>
                    <h1 className="app-page-title">AI чат-бот Аиша</h1>
                    <p className="app-page-subtitle">Практика татарского с ИИ-тьютором.</p>
                </div>
            </div>

            <section className={styles.chatCard}>
                <div className={styles.messages} ref={listRef}>
                    {messages.map((item) => (
                        <div
                            key={item.id}
                            className={`${styles.messageRow} ${item.role === 'user' ? styles.mine : styles.assistant}`}
                        >
                            <div className={styles.bubble}>{item.content}</div>
                        </div>
                    ))}
                    {isSending && (
                        <div className={`${styles.messageRow} ${styles.assistant}`}>
                            <div className={`${styles.bubble} ${styles.typingDotsBubble}`}>
                                <span className={styles.typingDots}>
                                    <span />
                                    <span />
                                    <span />
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <form className={styles.form} onSubmit={onSend}>
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Напиши сообщение на русском или татарском..."
                        maxLength={1200}
                        disabled={isSending}
                    />
                    <button type="submit" disabled={isSending || !draft.trim()}>
                        Отправить
                    </button>
                    <button type="button" onClick={onStartNewChat} disabled={isSending} className={styles.newChatButton}>
                        Новый чат
                    </button>
                </form>

                {error && <p className={styles.error}>{error}</p>}
            </section>
        </div>
    );
};

export default AiChatPage;
