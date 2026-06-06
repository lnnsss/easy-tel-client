import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import $api from '../../api/instance';
import styles from './TranslatePage.module.css';

const HISTORY_KEY = 'easytel:translate:history';
const MAX_HISTORY = 20;

const DIRECTIONS = [
    { value: 'rus2tat', labelKey: 'pages.translator.rus2tat' },
    { value: 'tat2rus', labelKey: 'pages.translator.tat2rus' }
];
const SPEAKERS = [
    { value: 'almaz', label: 'Алмаз' },
    { value: 'alsu', label: 'Алсу' }
];

// Рисует иконку озвучивания для кнопок воспроизведения.
const SpeakerIcon = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M4 10v4h4l5 4V6l-5 4H4z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 9c1.5 1.3 1.5 4.7 0 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M18.8 7c2.9 2.8 2.9 7.2 0 10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
);

// Рисует иконку остановки для активного воспроизведения.
const StopIcon = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
    </svg>
);

// Рисует иконку копирования текста в буфер обмена.
const CopyIcon = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect x="9" y="9" width="10" height="10" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <rect x="5" y="5" width="10" height="10" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
);

// Читает историю переводов из localStorage и защищается от битых данных.
const readHistory = () => {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

// Сохраняет изменения пользователя.
const saveHistory = (items) => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
};

// Отрисовывает экран или компонент TranslatePage и связывает его с данными приложения.
const TranslatePage = () => {
    const { t, i18n } = useTranslation();
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
    const locale = i18n.language?.startsWith('tt') ? 'tt-RU' : 'ru-RU';
    const leftTitle = leftLang === 'ru' ? t('pages.translator.ru') : t('pages.translator.tt');
    const rightTitle = rightLang === 'ru' ? t('pages.translator.ru') : t('pages.translator.tt');
    const leftPlaceholder = leftLang === 'ru' ? t('pages.translator.left_ru_placeholder') : t('pages.translator.left_tt_placeholder');
    const rightPlaceholder = rightLang === 'ru' ? t('pages.translator.right_ru_placeholder') : t('pages.translator.right_tt_placeholder');
    const leftValue = leftLang === 'ru' ? ruText : ttText;
    const rightValue = rightLang === 'ru' ? ruText : ttText;
    const leftHasTatarSpeech = leftLang === 'tt';
    const rightHasTatarSpeech = rightLang === 'tt';

    // Обрабатывает событие интерфейса пользователя.
    const onSwapDirection = () => {
        setDirection((prev) => (prev === 'rus2tat' ? 'tat2rus' : 'rus2tat'));
    };

    // Обрабатывает событие интерфейса пользователя.
    const onTranslate = async () => {
        setError('');
        const sourceText = direction === 'rus2tat' ? ruText : ttText;

        if (!sourceText.trim()) {
            setError(t('pages.translator.source_required'));
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
            setError(e?.response?.data?.message || t('pages.translator.translate_failed'));
        } finally {
            setLoading(false);
        }
    };

    // Обрабатывает событие интерфейса пользователя.
    const onCopy = async (value) => {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
        } catch {
            // Ничего не делаем.
        }
    };

    // Обрабатывает событие интерфейса пользователя.
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Обрабатывает событие интерфейса пользователя.
    const onDeleteHistory = (id) => {
        const next = history.filter((item) => item.id !== id);
        setHistory(next);
        saveHistory(next);
    };

    // Обрабатывает событие интерфейса пользователя.
    const onChangeLeftText = (value) => {
        if (leftLang === 'ru') {
            setRuText(value);
        } else {
            setTtText(value);
        }
    };

    // Обрабатывает событие интерфейса пользователя.
    const onLeftTextareaKeyDown = (e) => {
        if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent?.isComposing) return;
        e.preventDefault();
        if (!loading) {
            onTranslate();
        }
    };

    // Обрабатывает событие интерфейса пользователя.
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

    // Загружает данные из внешнего источника или API.
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
            // Тихая ошибка предварительной загрузки: пользователь увидит ошибку только при явном клике озвучки.
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
            setError(t('pages.translator.audio_failed'));
        };
        nextAudio.play()
            .then(() => setIsPlaying(true))
            .catch((err) => {
                if (suppressBlockedError && err?.name === 'NotAllowedError') {
                    setIsPlaying(false);
                    return;
                }
                setIsPlaying(false);
                setError(t('pages.translator.audio_failed'));
            });
    };

    // Обрабатывает событие интерфейса пользователя.
    const onSpeak = async (rawText) => {
        setError('');
        const textToSpeak = String(rawText || '').trim();

        if (!textToSpeak) {
            setError(t('pages.translator.speak_required'));
            return;
        }

        if (isPlaying) {
            stopAudio();
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            return;
        }

        setTtsLoading(true);
        try {
            const { url, fromCache } = await fetchAudioUrl(textToSpeak, speaker);
            playAudioFromUrl(url, { suppressBlockedError: true });
            if (!fromCache) {
                // Ничего не делаем: пометка для читаемости, что первый клик прошел через свежую загрузку.
            }
        } catch (e) {
            try {
                if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(textToSpeak);
                    utterance.lang = 'tt-RU';
                    utterance.onend = () => setIsPlaying(false);
                    utterance.onerror = () => {
                        setIsPlaying(false);
                        setError(e?.response?.data?.message || t('pages.translator.speak_translate_failed'));
                    };
                    window.speechSynthesis.cancel();
                    window.speechSynthesis.speak(utterance);
                    setIsPlaying(true);
                } else {
                    setError(e?.response?.data?.message || t('pages.translator.speak_translate_failed'));
                }
            } catch {
                setError(e?.response?.data?.message || t('pages.translator.speak_translate_failed'));
            }
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
        <div className={`${styles.container} app-page-shell`}>
            <div className="app-page-top">
                <h1 className="app-page-title">{t('pages.translator.title')}</h1>
            </div>
            <section className={styles.card}>
                <div className={styles.cardHead}>
                    <h2>{t('pages.translator.settings')}</h2>
                    <select
                        className={styles.speakerSelect}
                        value={speaker}
                        onChange={(e) => setSpeaker(e.target.value)}
                        aria-label={t('pages.translator.voice')}
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
                        title={t('pages.translator.swap')}
                        aria-label={t('pages.translator.swap')}
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
                                onKeyDown={onLeftTextareaKeyDown}
                                placeholder={leftPlaceholder}
                                maxLength={5000}
                            />
                            <div className={styles.iconGroup}>
                                {leftHasTatarSpeech && (
                                    <button
                                        type="button"
                                        className={`${styles.copyIconBtn} ${styles.audioIconBtn}`}
                                        onClick={() => onSpeak(leftValue)}
                                        disabled={ttsLoading || (!leftValue.trim() && !isPlaying)}
                                        aria-label={t('pages.translator.speak_tatar_aria')}
                                        title={isPlaying ? t('pages.translator.stop_speech') : t('pages.translator.speak')}
                                    >
                                        {isPlaying ? (
                                            <StopIcon className={styles.audioIcon} />
                                        ) : (
                                            <SpeakerIcon className={styles.audioIcon} />
                                        )}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className={`${styles.copyIconBtn} ${styles.audioIconBtn}`}
                                    onClick={() => onCopy(leftValue)}
                                    disabled={!leftValue}
                                    aria-label={t('pages.translator.copy_source_aria')}
                                    title={t('pages.translator.copy')}
                                >
                                    <CopyIcon className={styles.audioIcon} />
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
                                        className={`${styles.copyIconBtn} ${styles.audioIconBtn}`}
                                        onClick={() => onSpeak(rightValue)}
                                        disabled={ttsLoading || (!rightValue.trim() && !isPlaying)}
                                        aria-label={t('pages.translator.speak_tatar_aria')}
                                        title={isPlaying ? t('pages.translator.stop_speech') : t('pages.translator.speak')}
                                    >
                                        {isPlaying ? (
                                            <StopIcon className={styles.audioIcon} />
                                        ) : (
                                            <SpeakerIcon className={styles.audioIcon} />
                                        )}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className={`${styles.copyIconBtn} ${styles.audioIconBtn}`}
                                    onClick={() => onCopy(rightValue)}
                                    disabled={!rightValue}
                                    aria-label={t('pages.translator.copy_translation_aria')}
                                    title={t('pages.translator.copy')}
                                >
                                    <CopyIcon className={styles.audioIcon} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.actionsSingle}>
                    <button type="button" className={styles.primaryBtn} onClick={onTranslate} disabled={loading}>
                        {loading ? t('pages.translator.translating') : t('pages.translator.translate')}
                    </button>
                </div>

                {error && <p className={styles.error}>{error}</p>}
            </section>

            <section className={styles.card}>
                <div className={styles.historyHead}>
                    <h2>{t('pages.translator.history')}</h2>
                    <button type="button" className={styles.ghostBtn} onClick={onClearHistory} disabled={!history.length}>
                        {t('pages.translator.clear_all')}
                    </button>
                </div>

                <div className={styles.historyList}>
                    {history.map((item) => (
                        <div key={item.id} className={styles.historyItem}>
                            <div className={styles.historyMeta}>
                                <strong>{t(DIRECTIONS.find((x) => x.value === item.direction)?.labelKey || 'pages.translator.rus2tat')}</strong>
                                <span>{new Date(item.ts).toLocaleString(locale)}</span>
                            </div>
                            <p className={styles.historyText}><b>{t('pages.translator.source')}</b> {item.source}</p>
                            <p className={styles.historyText}><b>{t('pages.translator.translation')}</b> {item.translation}</p>
                            <div className={styles.historyActions}>
                                <button type="button" className={styles.ghostBtn} onClick={() => onReuseHistory(item)}>
                                    {t('pages.translator.use')}
                                </button>
                                <button type="button" className={styles.ghostBtn} onClick={() => onDeleteHistory(item.id)}>
                                    {t('pages.translator.delete')}
                                </button>
                            </div>
                        </div>
                    ))}
                    {!history.length && <p className={styles.empty}>{t('pages.translator.empty')}</p>}
                </div>
            </section>
        </div>
    );
};

export default TranslatePage;
