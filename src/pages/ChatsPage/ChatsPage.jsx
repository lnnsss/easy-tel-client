import React, { useEffect, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Link, useSearchParams } from 'react-router-dom';
import { useStores } from '../../stores/StoreContext';
import styles from './ChatsPage.module.css';

const TATAR_SYMBOLS = ['ә', 'ө', 'ү', 'җ', 'ң', 'һ'];
const CONVERSATION_TOPICS = [
    'О городах Татарстана и их особенностях',
    'О национальной татарской кухне и любимых блюдах',
    'О традициях и семейных праздниках',
    'О путешествиях по Казани и республике',
    'О любимых татарских песнях и исполнителях',
    'О том, как изучение языка помогает в жизни',
    'О школе, учебе и любимых предметах',
    'О спорте, тренировках и командных играх',
    'О фильмах, сериалах и книгах на татарском',
    'О планах на выходные и интересных хобби'
];

const ChatsPage = observer(() => {
    const { chatStore, authStore } = useStores();
    const [searchParams] = useSearchParams();
    const [message, setMessage] = useState('');
    const [chatPage, setChatPage] = useState(1);
    const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
    const [topic, setTopic] = useState('');
    const inputRef = useRef(null);
    const messagesEndRef = useRef(null);

    const activeConversationId = chatStore.activeConversationId || searchParams.get('conversationId') || '';
    const currentMessages = chatStore.messagesByConversation.get(String(activeConversationId)) || [];

    useEffect(() => {
        chatStore.connectSocket();
    }, [chatStore]);

    useEffect(() => {
        chatStore.loadChats(chatPage, 20);
    }, [chatStore, chatPage]);

    useEffect(() => {
        const queryId = searchParams.get('conversationId');
        if (queryId) {
            chatStore.setActiveConversation(queryId);
        }
    }, [searchParams, chatStore]);

    useEffect(() => {
        if (!activeConversationId) return;
        chatStore.setActiveConversation(activeConversationId);
        chatStore.loadMessages(activeConversationId);
        chatStore.markAsRead(activeConversationId);
    }, [activeConversationId, chatStore]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeConversationId, currentMessages.length]);

    const activeChat = useMemo(
        () => chatStore.chats.find((chat) => String(chat._id) === String(activeConversationId)),
        [chatStore.chats, activeConversationId]
    );

    const onSend = async (e) => {
        e.preventDefault();
        if (!activeConversationId) return;
        await chatStore.sendMessage(activeConversationId, message);
        setMessage('');
    };

    const insertSymbol = (symbol) => {
        const input = inputRef.current;
        if (!input) return;

        const start = input.selectionStart ?? message.length;
        const end = input.selectionEnd ?? message.length;
        const next = `${message.slice(0, start)}${symbol}${message.slice(end)}`;
        setMessage(next);

        requestAnimationFrame(() => {
            input.focus();
            const pos = start + symbol.length;
            input.setSelectionRange(pos, pos);
        });
    };

    const pickRandomTopic = () => {
        if (!CONVERSATION_TOPICS.length) return '';
        if (CONVERSATION_TOPICS.length === 1) return CONVERSATION_TOPICS[0];
        let next = CONVERSATION_TOPICS[Math.floor(Math.random() * CONVERSATION_TOPICS.length)];
        while (next === topic) {
            next = CONVERSATION_TOPICS[Math.floor(Math.random() * CONVERSATION_TOPICS.length)];
        }
        return next;
    };

    const openTopicModal = () => {
        setTopic(pickRandomTopic());
        setIsTopicModalOpen(true);
    };

    const isMine = (senderId) => String(senderId) === String(authStore.user?._id || '');
    const formatDateLabel = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long'
        });
    };
    const formatMessageDate = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={styles.container}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHead}>
                    <h2>Чаты</h2>
                    <span>{chatStore.unreadTotal}</span>
                </div>
                <div className={styles.chatList}>
                    {(chatStore.chats || []).map((chat) => (
                        <button
                            key={chat._id}
                            type="button"
                            className={`${styles.chatItem} ${String(chat._id) === String(activeConversationId) ? styles.chatItemActive : ''}`}
                            onClick={() => chatStore.setActiveConversation(chat._id)}
                        >
                            <div className={styles.chatTitle}>
                                {chat.otherUser?.firstName} {chat.otherUser?.lastName}
                            </div>
                            <div className={styles.chatPreview}>{chat.lastMessageText || 'Нет сообщений'}</div>
                            {chat.unreadCount > 0 && <span className={styles.unread}>{chat.unreadCount}</span>}
                        </button>
                    ))}
                    {!chatStore.isLoadingChats && !(chatStore.chats || []).length && (
                        <p className={styles.empty}>Пока нет диалогов</p>
                    )}
                </div>
                {chatStore.chatsPagination.totalPages > 1 && (
                    <div className={styles.pagination}>
                        <button
                            type="button"
                            disabled={chatStore.chatsPagination.page <= 1}
                            onClick={() => setChatPage((p) => Math.max(p - 1, 1))}
                        >
                            Назад
                        </button>
                        <span>{chatStore.chatsPagination.page} / {chatStore.chatsPagination.totalPages}</span>
                        <button
                            type="button"
                            disabled={chatStore.chatsPagination.page >= chatStore.chatsPagination.totalPages}
                            onClick={() => setChatPage((p) => Math.min(p + 1, chatStore.chatsPagination.totalPages))}
                        >
                            Вперед
                        </button>
                    </div>
                )}
            </aside>

            <section className={styles.chatPanel}>
                {activeChat ? (
                    <>
                        <header className={styles.panelHead}>
                            <h3>
                                <Link to={`/u/${encodeURIComponent(activeChat.otherUser?.username || '')}`} className={styles.chatUserLink}>
                                    {activeChat.otherUser?.firstName} {activeChat.otherUser?.lastName}
                                </Link>
                            </h3>
                        </header>
                        <div className={styles.messages}>
                            {currentMessages.map((item, index) => {
                                const mine = isMine(item.senderId);
                                const prev = currentMessages[index - 1];
                                const currentDay = formatDateLabel(item.createdAt);
                                const prevDay = prev ? formatDateLabel(prev.createdAt) : '';
                                return (
                                    <React.Fragment key={item._id}>
                                        {currentDay !== prevDay && (
                                            <div className={styles.dayDivider}>
                                                <span>{currentDay}</span>
                                            </div>
                                        )}
                                        <div className={`${styles.message} ${mine ? styles.messageMine : styles.messageOther}`}>
                                            <p>{item.text}</p>
                                            <time className={styles.messageTime}>{formatMessageDate(item.createdAt)}</time>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                        <form className={styles.inputArea} onSubmit={onSend}>
                            <div className={styles.symbolBar}>
                                <div className={styles.symbolButtons}>
                                    {TATAR_SYMBOLS.map((symbol) => (
                                        <button key={symbol} type="button" onClick={() => insertSymbol(symbol)}>
                                            {symbol}
                                        </button>
                                    ))}
                                </div>
                                <button type="button" className={styles.topicBtn} onClick={openTopicModal}>
                                    Тема для разговора
                                </button>
                            </div>
                            <div className={styles.composeRow}>
                                <input
                                    ref={inputRef}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Введите сообщение..."
                                    maxLength={2000}
                                />
                                <button type="submit">Отправить</button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className={styles.placeholder}>Выберите чат слева</div>
                )}
            </section>
            {isTopicModalOpen && (
                <div className={styles.topicModalOverlay} onClick={() => setIsTopicModalOpen(false)}>
                    <div className={styles.topicModal} onClick={(e) => e.stopPropagation()}>
                        <h4>Случайная тема</h4>
                        <p>{topic}</p>
                        <div className={styles.topicModalActions}>
                            <button type="button" className={styles.topicSecondary} onClick={() => setTopic(pickRandomTopic())}>
                                Другая тема
                            </button>
                            <button type="button" className={styles.topicPrimary} onClick={() => setIsTopicModalOpen(false)}>
                                Отлично
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default ChatsPage;
