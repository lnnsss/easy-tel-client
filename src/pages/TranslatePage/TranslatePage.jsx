import React, { useEffect, useRef, useState } from 'react';
import $api from '../../api/instance';
import styles from './TranslatePage.module.css';

const HISTORY_KEY = 'easytel:translate:history';
const MAX_HISTORY = 20;

const DIRECTIONS = [
    { value: 'rus2tat', label: 'Русский → Татарский' },
    { value: 'tat2rus', label: 'Татарский → Русский' }
];
const SPEAKERS = [
    { value: 'almaz', label: 'Алмаз' },
    { value: 'alsu', label: 'Алсу' }
];

const readHistory = () => {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const saveHistory = (items) => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
};

const TranslatePage = () => {
    const [direction, setDirection] = useState('rus2tat');
    const [ruText, setRuText] = useState('');
    const [ttText, setTtText] = useState('');
    const [loading, setLoading] = useState(false);
    const [ttsLoading, setTtsLoading] = useState(false);
    const [speaker, setSpeaker] = useState('almaz');
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState('');
    const [history, setHistory] = useState([]);
    const leftTextareaRef = useRef(null);
    const rightTextareaRef = useRef(null);
    const audioRef = useRef(null);
    const audioCacheRef = useRef(new Map());

    useEffect(() => {
        setHistory(readHistory());
    }, []);

    useEffect(() => {
        const leftEl = leftTextareaRef.current;
        const rightEl = rightTextareaRef.current;
        if (!leftEl || !rightEl || typeof ResizeObserver === 'undefined') {
            return undefined;
        }

        const syncHeight = (sourceEl, targetEl) => {
            const sourceHeight = Math.round(sourceEl.getBoundingClientRect().height);
            const targetHeight = Math.round(targetEl.getBoundingClientRect().height);
            if (sourceHeight > 0 && sourceHeight !== targetHeight) {
                targetEl.style.height = `${sourceHeight}px`;
            }
        };

        syncHeight(leftEl, rightEl);

        const leftObserver = new ResizeObserver(() => {
            syncHeight(leftEl, rightEl);
        });
        const rightObserver = new ResizeObserver(() => {
            syncHeight(rightEl, leftEl);
        });

        leftObserver.observe(leftEl);
        rightObserver.observe(rightEl);

        return () => {
            leftObserver.disconnect();
            rightObserver.disconnect();
        };
    }, [direction]);

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            audioCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
            audioCacheRef.current.clear();
        };
    }, []);

    const leftLang = direction === 'rus2tat' ? 'ru' : 'tt';
    const rightLang = leftLang === 'ru' ? 'tt' : 'ru';
    const leftTitle = leftLang === 'ru' ? 'Русский' : 'Татарский';
    const rightTitle = rightLang === 'ru' ? 'Русский' : 'Татарский';
    const leftPlaceholder = leftLang === 'ru' ? 'Введите текст на русском...' : 'Татарча текстны кертегез...';
    const rightPlaceholder = rightLang === 'ru' ? 'Здесь появится перевод на русский...' : 'Монда тәрҗемә күренәчәк...';
    const leftValue = leftLang === 'ru' ? ruText : ttText;
    const rightValue = rightLang === 'ru' ? ruText : ttText;
    const leftHasTatarSpeech = leftLang === 'tt';
    const rightHasTatarSpeech = rightLang === 'tt';

    const onSwapDirection = () => {
        setDirection((prev) => (prev === 'rus2tat' ? 'tat2rus' : 'rus2tat'));
    };

    const onTranslate = async () => {
        setError('');
        const sourceText = direction === 'rus2tat' ? ruText : ttText;

        if (!sourceText.trim()) {
            setError('Введите исходный текст');
            return;
        }

        setLoading(true);
        try {
            const { data } = await $api.post('/translate', {
                direction,
                text: sourceText
            });

            const nextTranslation = String(data?.translation || '');
            if (direction === 'rus2tat') {
                setTtText(nextTranslation);
            } else {
                setRuText(nextTranslation);
            }

            // Прогреваем озвучку перевода заранее, чтобы первый клик играл мгновенно.
            prefetchAudio(nextTranslation, speaker);

            const entry = {
                id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                ts: new Date().toISOString(),
                direction,
                source: sourceText.trim(),
                translation: nextTranslation
            };
            const nextHistory = [entry, ...history].slice(0, MAX_HISTORY);
            setHistory(nextHistory);
            saveHistory(nextHistory);
        } catch (e) {
            setError(e?.response?.data?.message || 'Не удалось выполнить перевод');
        } finally {
            setLoading(false);
        }
    };

    const onCopy = async (value) => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
        } catch {
            // no-op
        }
    };

    const onReuseHistory = (item) => {
        setDirection(item.direction || 'rus2tat');
        if ((item.direction || 'rus2tat') === 'rus2tat') {
            setRuText(item.source || '');
            setTtText(item.translation || '');
        } else {
            setTtText(item.source || '');
            setRuText(item.translation || '');
        }
        setError('');
    };

    const onDeleteHistory = (id) => {
        const next = history.filter((item) => item.id !== id);
        setHistory(next);
        saveHistory(next);
    };

    const onChangeLeftText = (value) => {
        if (leftLang === 'ru') {
            setRuText(value);
        } else {
            setTtText(value);
        }
    };

    const onClearHistory = () => {
        setHistory([]);
        saveHistory([]);
    };

    const stopAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
    };

    const toAudioUrlFromBase64 = (wavBase64) => {
        const binary = atob(wavBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/wav' });
        return URL.createObjectURL(blob);
    };

    const fetchAudioUrl = async (textToSpeak, speakerValue) => {
        const audioKey = `${speakerValue}::${textToSpeak}`;
        const cached = audioCacheRef.current.get(audioKey);
        if (cached) {
            return { key: audioKey, url: cached, fromCache: true };
        }

        const { data } = await $api.post('/translate/tts', {
            speaker: speakerValue,
            text: textToSpeak
        });

        const wavBase64 = String(data?.wavBase64 || '');
        if (!wavBase64) {
            throw new Error('invalid_tts_payload');
        }

        const url = toAudioUrlFromBase64(wavBase64);
        audioCacheRef.current.set(audioKey, url);
        return { key: audioKey, url, fromCache: false };
    };

    const prefetchAudio = async (textToSpeak, speakerValue) => {
        const cleanText = String(textToSpeak || '').trim();
        if (!cleanText) return;

        try {
            await fetchAudioUrl(cleanText, speakerValue);
        } catch {
            // silent prefetch fail: пользователь увидит ошибку только при явном клике озвучки
        }
    };

    const playAudioFromUrl = (url, options = {}) => {
        const suppressBlockedError = Boolean(options.suppressBlockedError);
        if (audioRef.current) {
            audioRef.current.pause();
        }
        const nextAudio = new Audio(url);
        audioRef.current = nextAudio;
        nextAudio.onended = () => setIsPlaying(false);
        nextAudio.onerror = () => {
            setIsPlaying(false);
            setError('Не удалось воспроизвести аудио');
        };
        nextAudio.play()
            .then(() => setIsPlaying(true))
            .catch((err) => {
                if (suppressBlockedError && err?.name === 'NotAllowedError') {
                    setIsPlaying(false);
                    return;
                }
                setIsPlaying(false);
                setError('Не удалось воспроизвести аудио');
            });
    };

    const onSpeak = async (rawText) => {
        setError('');
        const textToSpeak = String(rawText || '').trim();

        if (!textToSpeak) {
            setError('Сначала введите или получите текст для озвучки');
            return;
        }

        if (isPlaying) {
            stopAudio();
            return;
        }

        setTtsLoading(true);
        try {
            const { url, fromCache } = await fetchAudioUrl(textToSpeak, speaker);
            playAudioFromUrl(url, { suppressBlockedError: true });
            if (!fromCache) {
                // no-op: пометка для читаемости, что первый клик прошел через свежую загрузку
            }
        } catch (e) {
            setError(e?.response?.data?.message || 'Не удалось озвучить перевод');
        } finally {
            setTtsLoading(false);
        }
    };

    useEffect(() => {
        if (leftLang !== 'tt') return;
        const source = String(leftValue || '').trim();
        if (!source) return;

        const timer = setTimeout(() => {
            prefetchAudio(source, speaker);
        }, 450);

        return () => clearTimeout(timer);
    }, [leftLang, leftValue, speaker]);

    return (
        <div className={styles.container}>
            <section className={styles.card}>
                <div className={styles.cardHead}>
                    <h1>Переводчик</h1>
                    <select
                        className={styles.speakerSelect}
                        value={speaker}
                        onChange={(e) => setSpeaker(e.target.value)}
                        aria-label="Голос озвучки"
                    >
                        {SPEAKERS.map((item) => (
                            <option key={item.value} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.headersRow}>
                    <h3 className={styles.langTitle}>{leftTitle}</h3>
                    <button
                        type="button"
                        className={styles.swapBtn}
                        onClick={onSwapDirection}
                        title="Поменять направление"
                        aria-label="Поменять направление"
                    >
                        ⇄
                    </button>
                    <h3 className={styles.langTitle}>{rightTitle}</h3>
                </div>

                <div className={styles.controls}>
                    <div className={styles.langColumn}>
                        <div className={styles.textWrap}>
                            <textarea
                                ref={leftTextareaRef}
                                className={styles.langTextarea}
                                value={leftValue}
                                onChange={(e) => onChangeLeftText(e.target.value)}
                                placeholder={leftPlaceholder}
                                maxLength={5000}
                            />
                            <div className={styles.iconGroup}>
                                {leftHasTatarSpeech && (
                                    <button
                                        type="button"
                                        className={styles.copyIconBtn}
                                        onClick={() => onSpeak(leftValue)}
                                        disabled={ttsLoading || (!leftValue.trim() && !isPlaying)}
                                        aria-label="Озвучить татарский текст"
                                        title={isPlaying ? 'Остановить озвучку' : 'Озвучить'}
                                    >
                                        {isPlaying ? '■' : '🔊'}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className={styles.copyIconBtn}
                                    onClick={() => onCopy(leftValue)}
                                    disabled={!leftValue}
                                    aria-label="Копировать исходный текст"
                                    title="Копировать"
                                >
                                    ⧉
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className={styles.langColumn}>
                        <div className={styles.textWrap}>
                            <textarea
                                ref={rightTextareaRef}
                                className={styles.langTextarea}
                                value={rightValue}
                                readOnly
                                placeholder={rightPlaceholder}
                                maxLength={5000}
                            />
                            <div className={styles.iconGroup}>
                                {rightHasTatarSpeech && (
                                    <button
                                        type="button"
                                        className={styles.copyIconBtn}
                                        onClick={() => onSpeak(rightValue)}
                                        disabled={ttsLoading || (!rightValue.trim() && !isPlaying)}
                                        aria-label="Озвучить татарский текст"
                                        title={isPlaying ? 'Остановить озвучку' : 'Озвучить'}
                                    >
                                        {isPlaying ? '■' : '🔊'}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className={styles.copyIconBtn}
                                    onClick={() => onCopy(rightValue)}
                                    disabled={!rightValue}
                                    aria-label="Копировать перевод"
                                    title="Копировать"
                                >
                                    ⧉
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.actionsSingle}>
                    <button type="button" className={styles.primaryBtn} onClick={onTranslate} disabled={loading}>
                        {loading ? 'Переводим...' : 'Перевести'}
                    </button>
                </div>

                {error && <p className={styles.error}>{error}</p>}
            </section>

            <section className={styles.card}>
                <div className={styles.historyHead}>
                    <h2>История переводов</h2>
                    <button type="button" className={styles.ghostBtn} onClick={onClearHistory} disabled={!history.length}>
                        Очистить все
                    </button>
                </div>

                <div className={styles.historyList}>
                    {history.map((item) => (
                        <div key={item.id} className={styles.historyItem}>
                            <div className={styles.historyMeta}>
                                <strong>{DIRECTIONS.find((x) => x.value === item.direction)?.label || item.direction}</strong>
                                <span>{new Date(item.ts).toLocaleString('ru-RU')}</span>
                            </div>
                            <p className={styles.historyText}><b>Исходный:</b> {item.source}</p>
                            <p className={styles.historyText}><b>Перевод:</b> {item.translation}</p>
                            <div className={styles.historyActions}>
                                <button type="button" className={styles.ghostBtn} onClick={() => onReuseHistory(item)}>
                                    Использовать
                                </button>
                                <button type="button" className={styles.ghostBtn} onClick={() => onDeleteHistory(item.id)}>
                                    Удалить
                                </button>
                            </div>
                        </div>
                    ))}
                    {!history.length && <p className={styles.empty}>История пока пуста</p>}
                </div>
            </section>
        </div>
    );
};

export default TranslatePage;
