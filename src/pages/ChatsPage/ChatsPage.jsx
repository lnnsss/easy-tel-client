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

const getAbsoluteMediaUrl = (url) => {
    const raw = String(url || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    const apiBase = import.meta.env.VITE_API_URL || '';
    const serverBase = apiBase.replace(/\/api\/?$/, '');
    return `${serverBase}${raw}`;
};

const VoiceMessagePlayer = ({ src, messageId, isUnlistened = false, onListened = null, onEndedNext = null }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const listenedRef = useRef(false);

    const togglePlay = async () => {
        if (!audioRef.current || !isReady) return;
        if (isPlaying) {
            audioRef.current.pause();
            return;
        }
        try {
            await audioRef.current.play();
        } catch {
            setIsPlaying(false);
        }
    };

    return (
        <div className={styles.voiceMessagePlayer}>
            <audio
                ref={audioRef}
                preload="metadata"
                src={src}
                data-message-id={String(messageId || '')}
                onCanPlay={() => setIsReady(true)}
                onPlay={() => {
                    setIsPlaying(true);
                    if (!listenedRef.current) {
                        listenedRef.current = true;
                        if (onListened) onListened();
                    }
                }}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                    setIsPlaying(false);
                    if (onEndedNext) onEndedNext();
                }}
                className={styles.voiceNativeHidden}
            />
            <button
                type="button"
                className={styles.voicePlayBtn}
                onClick={togglePlay}
                aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
                disabled={!isReady}
            >
                {isPlaying ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8 6h3v12H8zm5 0h3v12h-3z" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8 6.5v11l9-5.5z" />
                    </svg>
                )}
            </button>
            <div className={`${styles.voiceBars} ${isPlaying ? styles.voiceBarsActive : ''}`} aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
            </div>
            {isUnlistened && <span className={styles.voiceUnreadDot} aria-label="Не прослушано" />}
        </div>
    );
};

const ChatsPage = observer(() => {
    const { chatStore, authStore } = useStores();
    const [searchParams] = useSearchParams();
    const [message, setMessage] = useState('');
    const [chatPage, setChatPage] = useState(1);
    const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
    const [topic, setTopic] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingPreview, setRecordingPreview] = useState(null);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const [recordingLevel, setRecordingLevel] = useState(0);
    const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
    const [messageMenu, setMessageMenu] = useState(null);
    const inputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const mediaChunksRef = useRef([]);
    const mediaStreamRef = useRef(null);
    const recordingStartedAtRef = useRef(0);
    const recordingTimerRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const analyserAnimationRef = useRef(null);

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

    useEffect(() => {
        const closeMenus = () => {
            setIsChatMenuOpen(false);
            setMessageMenu(null);
        };
        window.addEventListener('click', closeMenus);
        return () => window.removeEventListener('click', closeMenus);
    }, []);

    useEffect(() => () => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
        }
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        if (analyserAnimationRef.current) cancelAnimationFrame(analyserAnimationRef.current);
        if (audioContextRef.current) audioContextRef.current.close();
        if (recordingPreview?.url) URL.revokeObjectURL(recordingPreview.url);
    }, [recordingPreview]);

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

    const onToggleVoiceRecord = async () => {
        if (!activeConversationId || chatStore.isSending) return;
        if (recordingPreview) return;

        if (isRecording && mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }
            if (analyserAnimationRef.current) {
                cancelAnimationFrame(analyserAnimationRef.current);
                analyserAnimationRef.current = null;
            }
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            mediaChunksRef.current = [];
            recordingStartedAtRef.current = Date.now();

            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;

            if (audioContextRef.current) {
                await audioContextRef.current.close();
            }
            const audioContext = new AudioContext();
            const sourceNode = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            sourceNode.connect(analyser);
            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            const buffer = new Uint8Array(analyser.frequencyBinCount);
            const tickMeter = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(buffer);
                const avg = buffer.reduce((sum, value) => sum + value, 0) / Math.max(buffer.length, 1);
                setRecordingLevel(Math.max(0, Math.min(1, avg / 128)));
                analyserAnimationRef.current = requestAnimationFrame(tickMeter);
            };
            tickMeter();

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) mediaChunksRef.current.push(event.data);
            };

            recorder.onstop = () => {
                const chunks = mediaChunksRef.current;
                mediaChunksRef.current = [];
                const durationSec = Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000));
                setRecordingLevel(0);

                if (mediaStreamRef.current) {
                    mediaStreamRef.current.getTracks().forEach((track) => track.stop());
                    mediaStreamRef.current = null;
                }
                if (audioContextRef.current) {
                    audioContextRef.current.close();
                    audioContextRef.current = null;
                }
                analyserRef.current = null;

                if (!chunks.length) return;
                const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setRecordingPreview({ blob, url, durationSec });
            };

            recorder.start();
            setIsRecording(true);
            setRecordingSeconds(0);
            recordingTimerRef.current = setInterval(() => {
                setRecordingSeconds(Math.max(0, Math.round((Date.now() - recordingStartedAtRef.current) / 1000)));
            }, 250);
        } catch (err) {
            window.alert(err?.message || 'Не удалось получить доступ к микрофону');
        }
    };
    const removeRecordingPreview = () => {
        if (!recordingPreview) return;
        URL.revokeObjectURL(recordingPreview.url);
        setRecordingPreview(null);
    };
    const sendRecordingPreview = async () => {
        if (!recordingPreview || !activeConversationId) return;
        try {
            await chatStore.sendVoiceMessage(activeConversationId, recordingPreview.blob, recordingPreview.durationSec);
            removeRecordingPreview();
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Не удалось отправить голосовое сообщение';
            window.alert(msg);
        }
    };
    const formatDuration = (sec) => {
        const safe = Math.max(0, Number(sec) || 0);
        const mm = String(Math.floor(safe / 60)).padStart(2, '0');
        const ss = String(safe % 60).padStart(2, '0');
        return `${mm}:${ss}`;
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
    const meId = String(authStore.user?._id || '');
    const voiceIndices = useMemo(() => {
        const map = new Map();
        let idx = 0;
        currentMessages.forEach((item) => {
            if (item.messageType === 'voice' && item.audioUrl) {
                map.set(String(item._id), idx);
                idx += 1;
            }
        });
        return map;
    }, [currentMessages]);
    const voiceItems = useMemo(
        () => currentMessages.filter((item) => item.messageType === 'voice' && item.audioUrl),
        [currentMessages]
    );
    const playNextVoice = (currentId) => {
        const currentIdx = voiceIndices.get(String(currentId));
        if (!Number.isFinite(currentIdx)) return;
        const next = voiceItems[currentIdx + 1];
        if (!next) return;
        const el = document.querySelector(`audio[data-message-id="${String(next._id)}"]`);
        if (el) el.play().catch(() => {});
    };
    const onDeleteConversation = async () => {
        if (!activeConversationId) return;
        const ok = window.confirm('Удалить чат? Это удалит всю переписку для обоих пользователей.');
        if (!ok) return;
        await chatStore.deleteConversation(activeConversationId);
    };
    const onDeleteMessage = async () => {
        if (!messageMenu?.messageId || !activeConversationId) return;
        const ok = window.confirm('Удалить это сообщение?');
        if (!ok) return;
        await chatStore.deleteMessage(activeConversationId, messageMenu.messageId);
        setMessageMenu(null);
    };

    return (
        <div className="app-page-shell">
            <div className="app-page-top">
                <h1 className="app-page-title">Чаты</h1>
            </div>
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
                                ←
                            </button>
                            <span>{chatStore.chatsPagination.page} / {chatStore.chatsPagination.totalPages}</span>
                            <button
                                type="button"
                                disabled={chatStore.chatsPagination.page >= chatStore.chatsPagination.totalPages}
                                onClick={() => setChatPage((p) => Math.min(p + 1, chatStore.chatsPagination.totalPages))}
                            >
                                →
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
                                <div className={styles.chatMenuWrap}>
                                    <button
                                        type="button"
                                        className={styles.chatMenuBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsChatMenuOpen((v) => !v);
                                        }}
                                        aria-label="Меню чата"
                                    >
                                        ⋯
                                    </button>
                                    {isChatMenuOpen && (
                                        <div className={styles.chatMenuPopover} onClick={(e) => e.stopPropagation()}>
                                            <button type="button" onClick={onDeleteConversation}>Удалить чат</button>
                                        </div>
                                    )}
                                </div>
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
                                                {item.messageType === 'voice' && item.audioUrl ? (
                                                    <div
                                                        onContextMenu={(e) => {
                                                            if (!mine) return;
                                                            e.preventDefault();
                                                            setMessageMenu({ messageId: String(item._id) });
                                                        }}
                                                    >
                                                        <VoiceMessagePlayer
                                                            src={getAbsoluteMediaUrl(item.audioUrl)}
                                                            messageId={item._id}
                                                            isUnlistened={!((item.listenedBy || []).map(String).includes(meId))}
                                                            onListened={() => chatStore.markVoiceListened(activeConversationId, item._id)}
                                                            onEndedNext={() => playNextVoice(item._id)}
                                                        />
                                                    </div>
                                                ) : (
                                                    <p
                                                        onContextMenu={(e) => {
                                                            if (!mine) return;
                                                            e.preventDefault();
                                                            setMessageMenu({ messageId: String(item._id) });
                                                        }}
                                                    >
                                                        {item.text}
                                                    </p>
                                                )}
                                                <time className={styles.messageTime}>{formatMessageDate(item.createdAt)}</time>
                                                {messageMenu?.messageId === String(item._id) && (
                                                    <div
                                                        className={styles.messageInlineMenu}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <button type="button" onClick={onDeleteMessage}>Удалить сообщение</button>
                                                    </div>
                                                )}
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
                                {!recordingPreview && (
                                    <div className={styles.composeRow}>
                                        <input
                                            ref={inputRef}
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Введите сообщение..."
                                            maxLength={2000}
                                            disabled={isRecording}
                                        />
                                        <button type="submit">Отправить</button>
                                        <button
                                            type="button"
                                            className={`${styles.voiceBtn} ${isRecording ? styles.voiceBtnRecording : ''}`}
                                            onClick={onToggleVoiceRecord}
                                            aria-label={isRecording ? 'Остановить запись' : 'Записать голосовое сообщение'}
                                            title={isRecording ? 'Остановить запись' : 'Записать голосовое'}
                                        >
                                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                                {isRecording ? (
                                                    <path d="M7 7h10v10H7z" />
                                                ) : (
                                                    <path d="M12 2.75a3.75 3.75 0 0 1 3.75 3.75v4.6a3.75 3.75 0 1 1-7.5 0V6.5A3.75 3.75 0 0 1 12 2.75Zm-5.25 8.35a.95.95 0 1 1 1.9 0 3.35 3.35 0 1 0 6.7 0 .95.95 0 0 1 1.9 0 5.26 5.26 0 0 1-4.3 5.18V18h2.1a.95.95 0 1 1 0 1.9h-6.1a.95.95 0 1 1 0-1.9H11v-1.72a5.26 5.26 0 0 1-4.25-5.18Z" />
                                                )}
                                            </svg>
                                        </button>
                                    </div>
                                )}
                                {isRecording && (
                                    <div className={styles.recordingBar}>
                                        <div className={styles.recordingDot} />
                                        <div className={styles.recordingWaves} aria-hidden="true">
                                            <span style={{ transform: `scaleY(${0.35 + recordingLevel * 0.9})` }} />
                                            <span style={{ transform: `scaleY(${0.25 + recordingLevel * 0.8})` }} />
                                            <span style={{ transform: `scaleY(${0.4 + recordingLevel})` }} />
                                            <span style={{ transform: `scaleY(${0.3 + recordingLevel * 0.85})` }} />
                                            <span style={{ transform: `scaleY(${0.2 + recordingLevel * 0.75})` }} />
                                        </div>
                                        <span className={styles.recordingTime}>{formatDuration(recordingSeconds)}</span>
                                    </div>
                                )}
                                {recordingPreview && (
                                    <div className={styles.voicePreview}>
                                        <audio controls preload="metadata" src={recordingPreview.url} className={styles.voicePlayer} />
                                        <div className={styles.voicePreviewActions}>
                                            <button type="button" className={styles.voiceDeleteBtn} onClick={removeRecordingPreview}>Удалить</button>
                                            <button type="button" className={styles.voiceSendBtn} onClick={sendRecordingPreview}>Отправить</button>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </>
                    ) : (
                        <div className={styles.placeholder}>Выберите чат слева</div>
                    )}
                </section>
            </div>
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
