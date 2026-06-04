import React, { useEffect, useMemo, useRef, useState } from 'react';
import AiChatService from '../../services/AiChatService';
import styles from './AiChatPage.module.css';

const MAX_CONTEXT_MESSAGES = 16;
const AI_CHAT_STORAGE_KEY = 'aiChatMessages:v1';
const AI_CHAT_MODE_STORAGE_KEY = 'aiChatMode:v1';
const AI_CHAT_MODES = [
    { value: 'tutor', label: 'Тьютор' },
    { value: 'translate', label: 'Переводчик' }
];

const loadModeFromStorage = () => {
    const saved = String(localStorage.getItem(AI_CHAT_MODE_STORAGE_KEY) || '').trim();
    return AI_CHAT_MODES.some((item) => item.value === saved) ? saved : 'tutor';
};

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
    const [mode, setMode] = useState(loadModeFromStorage);
    const [draft, setDraft] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');
    const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
    const listRef = useRef(null);
    const modeMenuRef = useRef(null);
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
        localStorage.setItem(AI_CHAT_MODE_STORAGE_KEY, mode);
    }, [mode]);

    useEffect(() => {
        if (!isModeMenuOpen) return undefined;

        const handleClickOutside = (event) => {
            if (modeMenuRef.current?.contains(event.target)) return;
            setIsModeMenuOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isModeMenuOpen]);

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
        setIsModeMenuOpen(false);
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
                mode
            });

            const assistantText = String(data?.reply || '').trim();
            if (!assistantText) {
                throw new Error('Пустой ответ от AI');
            }

            const assistantMessageId = `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const chunks = assistantText.match(/\S+\s*/g) || [assistantText];
            let currentChunk = 0;

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
                currentChunk += 1;
                const nextChunk = chunks.slice(0, currentChunk).join('');

                setMessages((prev) => prev.map((item) => (
                    item.id === assistantMessageId ? { ...item, content: nextChunk } : item
                )));
                scrollToBottom();

                if (currentChunk >= chunks.length) {
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
                    <div className={styles.inputShell} ref={modeMenuRef}>
                        <div className={styles.modePicker}>
                            <button
                                type="button"
                                className={styles.modeButton}
                                onClick={() => setIsModeMenuOpen((prev) => !prev)}
                                disabled={isSending}
                                aria-label="Выбрать режим AI-чата"
                                aria-expanded={isModeMenuOpen}
                            >
                                +
                            </button>
                            {isModeMenuOpen && (
                                <div className={styles.modeMenu} role="menu">
                                    {AI_CHAT_MODES.map((item) => {
                                        const isActive = item.value === mode;
                                        return (
                                            <button
                                                key={item.value}
                                                type="button"
                                                className={styles.modeMenuItem}
                                                onClick={() => {
                                                    setMode(item.value);
                                                    setIsModeMenuOpen(false);
                                                }}
                                                role="menuitemradio"
                                                aria-checked={isActive}
                                            >
                                                <span>{item.label}</span>
                                                {isActive && <span className={styles.modeCheck}>✓</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="Напиши сообщение на русском или татарском..."
                            maxLength={1200}
                            disabled={isSending}
                        />
                    </div>
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
