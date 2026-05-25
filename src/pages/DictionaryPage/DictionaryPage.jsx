import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import $api from '../../api/instance';
import { useNavigate } from 'react-router-dom';
import { useStores } from '../../stores/StoreContext';
import styles from './DictionaryPage.module.css';

const SpeakerIcon = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M4 10v4h4l5 4V6l-5 4H4z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 9c1.5 1.3 1.5 4.7 0 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M18.8 7c2.9 2.8 2.9 7.2 0 10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
);

const StopIcon = ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
    </svg>
);

const DictionaryPage = observer(() => {
    const { t } = useTranslation();
    const { uiStore } = useStores();
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('cards');
    const [isMobileView, setIsMobileView] = useState(false);
    const [openedWordId, setOpenedWordId] = useState(null);
    const [openedTableWordId, setOpenedTableWordId] = useState(null);
    const [ttsLoadingKey, setTtsLoadingKey] = useState(null);
    const [ttsPlayingKey, setTtsPlayingKey] = useState(null);
    const [ttsError, setTtsError] = useState('');
    const [audioObj, setAudioObj] = useState(null);
    const [usageExamplesByWordId, setUsageExamplesByWordId] = useState({});
    const [usageExamplesLoadingByWordId, setUsageExamplesLoadingByWordId] = useState({});
    const [usageExamplesErrorByWordId, setUsageExamplesErrorByWordId] = useState({});
    const [usageExamplesRequestedByWordId, setUsageExamplesRequestedByWordId] = useState({});
    const [descriptionExpandedByWordId, setDescriptionExpandedByWordId] = useState({});
    const [assessmentStatus, setAssessmentStatus] = useState({
        hasEnoughWords: false,
        requiredWords: 20,
        wordsCount: 0,
        weekKey: '',
        needsRetake: true,
        result: null
    });
    const [assessmentLoading, setAssessmentLoading] = useState(false);

    const loadDictionaryPage = async (nextPage, query = '') => {
        setLoading(true);

        try {
            const { data } = await $api.get('/dictionary', {
                params: {
                    page: nextPage,
                    limit: 9,
                    q: query || undefined
                }
            });
            const nextItems = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
            setItems(nextItems);
            setPage(Number(data?.currentPage) || nextPage);
            setTotalPages(Number(data?.totalPages) || 1);
            setTotalItems(Number(data?.totalItems) || nextItems.length);
        } catch (err) {
            console.error(err);
            setItems([]);
            setPage(1);
            setTotalPages(1);
            setTotalItems(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setOpenedWordId(null);
            setOpenedTableWordId(null);
            loadDictionaryPage(1, searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        loadDictionaryPage(1, '');
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const media = window.matchMedia('(max-width: 760px)');
        const applyMobileMode = (event) => {
            const mobile = Boolean(event.matches);
            setIsMobileView(mobile);
            if (mobile) {
                setViewMode('cards');
            }
        };
        applyMobileMode(media);
        media.addEventListener('change', applyMobileMode);
        return () => media.removeEventListener('change', applyMobileMode);
    }, []);

    const loadAssessmentStatus = async () => {
        try {
            const { data } = await $api.get('/dictionary/weekly-assessment');
            setAssessmentStatus({
                hasEnoughWords: Boolean(data?.hasEnoughWords),
                requiredWords: Number(data?.requiredWords) || 20,
                wordsCount: Number(data?.wordsCount) || 0,
                weekKey: String(data?.weekKey || ''),
                needsRetake: Boolean(data?.needsRetake),
                result: data?.result || null
            });
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadAssessmentStatus();
    }, []);

    useEffect(() => {
        return () => {
            if (audioObj) {
                audioObj.pause();
                if (typeof audioObj.src === 'string' && audioObj.src.startsWith('blob:')) {
                    URL.revokeObjectURL(audioObj.src);
                }
            }
        };
    }, [audioObj]);

    const getUsageExamples = (wordId) => (
        Array.isArray(usageExamplesByWordId[wordId])
            ? usageExamplesByWordId[wordId]
                .filter((example) => example?.textTatar && example?.textRu)
                .slice(0, 2)
            : []
    );

    const generateUsageExamples = async (wordId) => {
        if (!wordId || usageExamplesLoadingByWordId[wordId]) {
            return;
        }

        setUsageExamplesRequestedByWordId((prev) => ({ ...prev, [wordId]: true }));
        setUsageExamplesErrorByWordId((prev) => ({ ...prev, [wordId]: '' }));
        setUsageExamplesLoadingByWordId((prev) => ({ ...prev, [wordId]: true }));

        try {
            const excludeExamples = Array.isArray(usageExamplesByWordId[wordId])
                ? usageExamplesByWordId[wordId].map((item) => item?.textRu).filter(Boolean)
                : [];

            const { data } = await $api.post('/recognize/examples', { wordId, excludeExamples });
            const examples = Array.isArray(data?.data?.usageExamples) ? data.data.usageExamples : [];
            setUsageExamplesByWordId((prev) => ({ ...prev, [wordId]: examples }));
        } catch (err) {
            setUsageExamplesErrorByWordId((prev) => ({
                ...prev,
                [wordId]: err?.response?.data?.message || 'Не удалось сгенерировать примеры'
            }));
        } finally {
            setUsageExamplesLoadingByWordId((prev) => ({ ...prev, [wordId]: false }));
        }
    };

    const isDescriptionExpanded = (wordId) => Boolean(descriptionExpandedByWordId[wordId]);

    const toggleDescription = (wordId, e) => {
        e?.stopPropagation?.();
        setDescriptionExpandedByWordId((prev) => ({
            ...prev,
            [wordId]: !prev[wordId]
        }));
    };

    const speakText = async (targetKey, text) => {
        setTtsError('');
        const cleanText = String(text || '').trim();
        if (!cleanText) return;

        if (ttsPlayingKey === targetKey) {
            if (audioObj) {
                audioObj.pause();
                audioObj.currentTime = 0;
            }
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            setTtsPlayingKey(null);
            return;
        }

        setTtsLoadingKey(targetKey);
        try {
            const { data } = await $api.post('/translate/tts', {
                speaker: 'almaz',
                text: cleanText
            });
            const wavBase64 = String(data?.wavBase64 || '');
            if (!wavBase64) throw new Error('invalid_tts_payload');

            const binary = atob(wavBase64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i += 1) {
                bytes[i] = binary.charCodeAt(i);
            }

            if (audioObj) {
                audioObj.pause();
                if (typeof audioObj.src === 'string' && audioObj.src.startsWith('blob:')) {
                    URL.revokeObjectURL(audioObj.src);
                }
            }

            const nextUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
            const nextAudio = new Audio(nextUrl);
            nextAudio.onended = () => {
                setTtsPlayingKey(null);
                URL.revokeObjectURL(nextUrl);
            };
            nextAudio.onerror = () => {
                setTtsPlayingKey(null);
                setTtsError('Не удалось воспроизвести озвучку');
                URL.revokeObjectURL(nextUrl);
            };

            setAudioObj(nextAudio);

            await nextAudio.play();
            setTtsPlayingKey(targetKey);
        } catch (err) {
            const browserBlocked = err?.name === 'NotAllowedError';
            if (!browserBlocked) {
                try {
                    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                        const utterance = new SpeechSynthesisUtterance(cleanText);
                        utterance.lang = 'tt-RU';
                        utterance.onend = () => setTtsPlayingKey(null);
                        utterance.onerror = () => {
                            setTtsPlayingKey(null);
                            setTtsError(err?.response?.data?.message || 'Не удалось озвучить слово');
                        };
                        window.speechSynthesis.cancel();
                        window.speechSynthesis.speak(utterance);
                        setTtsPlayingKey(targetKey);
                    } else {
                        setTtsError(err?.response?.data?.message || 'Не удалось озвучить слово');
                    }
                } catch {
                    setTtsError(err?.response?.data?.message || 'Не удалось озвучить слово');
                }
            }
        } finally {
            setTtsLoadingKey(null);
        }
    };

    const openAssessment = async () => {
        if (!assessmentStatus.hasEnoughWords) {
            uiStore.showModal({
                title: t('pages.dictionary.modals.not_enough_words_title'),
                message: t('pages.dictionary.modals.not_enough_words_message', { count: assessmentStatus.requiredWords }),
                variant: 'info',
                secondaryLabel: t('common.close')
            });
            return;
        }
        if (!assessmentStatus.needsRetake && assessmentStatus.result) return;
        setAssessmentLoading(true);
        try {
            navigate('/dictionary/assessment');
        } catch (err) {
            console.error(err);
        } finally {
            setAssessmentLoading(false);
        }
    };

    if (loading) return <div className={styles.loader}>Загрузка словаря...</div>;

    return (
        <div className={`${styles.container} app-page-shell`}>
            <div className={`${styles.headerBar} app-page-top`}>
                <div>
                    <h1 className={`${styles.title} app-page-title`}>{t('pages.dictionary.title')}</h1>
                    <p className={styles.totalLabel}>Всего: {totalItems}</p>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.assessmentStatusWrap}>
                        <button
                            type="button"
                            className={`${styles.assessmentStatus} ${assessmentStatus.needsRetake ? styles.assessmentStatusPending : styles.assessmentStatusDone}`}
                            onClick={openAssessment}
                            disabled={assessmentLoading}
                        >
                            {assessmentLoading
                                ? '...'
                                : assessmentStatus.needsRetake
                                    ? 'Проверить себя'
                                    : (assessmentStatus.result?.level || 'A1')}
                        </button>
                        <div className={styles.assessmentTooltip}>
                            Уровни: A1 (0-11), B1 (12-17), B2 (18-20).<br />
                            Самый высокий уровень: B2.
                        </div>
                    </div>
                    {!isMobileView && (
                        <div className={styles.viewSwitch}>
                            <button
                                className={`${styles.switchBtn} ${viewMode === 'table' ? styles.switchBtnActive : ''}`}
                                onClick={() => setViewMode('table')}
                                aria-label="Режим таблицы"
                                type="button"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                                    <path d="M3 10h18M9 4v16M15 4v16"></path>
                                </svg>
                                <span>Таблица</span>
                            </button>
                            <button
                                className={`${styles.switchBtn} ${viewMode === 'cards' ? styles.switchBtnActive : ''}`}
                                onClick={() => setViewMode('cards')}
                                aria-label="Режим карточек"
                                type="button"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <rect x="3" y="4" width="8" height="7" rx="1.5"></rect>
                                    <rect x="13" y="4" width="8" height="7" rx="1.5"></rect>
                                    <rect x="3" y="13" width="8" height="7" rx="1.5"></rect>
                                    <rect x="13" y="13" width="8" height="7" rx="1.5"></rect>
                                </svg>
                                <span>Блоки</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className={styles.searchRow}>
                <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Поиск по русскому, татарскому или английскому слову"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            {ttsError && <p className={styles.ttsError}>{ttsError}</p>}

            {items.length === 0 ? (
                <div className={styles.empty}>
                    <p>Вы еще не добавили ни одного слова в словарь.</p>
                </div>
            ) : (isMobileView || viewMode === 'cards') ? (
                <div className={styles.grid}>
                    {items.map(item => {
                        const isOpened = openedWordId === item._id;
                        const usageExamples = getUsageExamples(item.word._id);
                        const usageLoading = Boolean(usageExamplesLoadingByWordId[item.word._id]);
                        const usageError = usageExamplesErrorByWordId[item.word._id];
                        const usageRequested = Boolean(usageExamplesRequestedByWordId[item.word._id]);
                        return (
                            <button
                                key={item._id}
                                className={`${styles.wordCard} ${isOpened ? styles.wordCardOpen : ''}`}
                                onClick={() => setOpenedWordId(isOpened ? null : item._id)}
                                type="button"
                            >
                                <div className={styles.header}>
                                    <h2 className={styles.tatar}>{item.word.nameTatar}</h2>
                                    <span className={styles.transcription}>[{item.word.transcription}]</span>
                                </div>
                                <p className={styles.russian}>
                                    <strong>Русский:</strong> {item.word.nameRu}
                                </p>
                                {isOpened && (
                                    <>
                                        <div
                                            className={`${styles.descriptionWrap} ${isDescriptionExpanded(item.word._id) ? styles.descriptionWrapExpanded : ''}`}
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => toggleDescription(item.word._id, e)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    toggleDescription(item.word._id, e);
                                                }
                                            }}
                                        >
                                            <div className={styles.descriptionHead}>
                                                <p className={styles.descriptionLabel}>Описание</p>
                                                <span className={styles.descriptionToggle}>
                                                    {isDescriptionExpanded(item.word._id) ? 'Скрыть' : 'Показать'}
                                                </span>
                                            </div>
                                            <div className={`${styles.descriptionBody} ${!isDescriptionExpanded(item.word._id) ? styles.descriptionBodyCollapsed : ''}`}>
                                                <p className={styles.description}>{item.word.descriptionRu || 'Описание отсутствует'}</p>
                                                {!isDescriptionExpanded(item.word._id) && <div className={styles.descriptionFade} />}
                                            </div>
                                        </div>
                                        <div className={styles.usageBlock}>
                                            <div className={styles.usageActions}>
                                                <button
                                                    type="button"
                                                    className={styles.usageGenerateBtn}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        generateUsageExamples(item.word._id);
                                                    }}
                                                    disabled={usageLoading}
                                                >
                                                    {usageLoading
                                                        ? 'Генерация примеров...'
                                                        : usageExamples.length > 0
                                                            ? 'Другие примеры предложений'
                                                            : 'Примеры предложений'}
                                                </button>
                                            </div>
                                            {usageError && <p className={styles.usageError}>{usageError}</p>}
                                            {usageRequested && usageExamples.length > 0 && (
                                                <div className={styles.usageExamples}>
                                                    <p className={styles.usageTitle}>2 примера предложений</p>
                                                    {usageExamples.map((example, idx) => {
                                                        const usageTtsKey = `${item._id}:example:${idx}`;
                                                        return (
                                                            <div key={usageTtsKey} className={styles.usageItem}>
                                                                <div className={styles.usageTatRow}>
                                                                    <p className={styles.usageTat}>{example.textTatar}</p>
                                                                    <button
                                                                        type="button"
                                                                        className={styles.ttsIconBtn}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            speakText(usageTtsKey, example.textTatar);
                                                                        }}
                                                                        title={ttsPlayingKey === usageTtsKey ? 'Остановить озвучку' : 'Озвучить пример'}
                                                                        aria-label="Озвучить пример"
                                                                        disabled={ttsLoadingKey === usageTtsKey}
                                                                    >
                                                                        {ttsLoadingKey === usageTtsKey ? (
                                                                            <span className={styles.ttsLoading}>…</span>
                                                                        ) : ttsPlayingKey === usageTtsKey ? (
                                                                            <StopIcon className={styles.ttsIconSvg} />
                                                                        ) : (
                                                                            <SpeakerIcon className={styles.ttsIconSvg} />
                                                                        )}
                                                                    </button>
                                                                </div>
                                                                <p className={styles.usageRu}>{example.textRu}</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                                <div className={styles.footer}>
                                    <button
                                        type="button"
                                        className={styles.ttsIconBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            speakText(`${item._id}:word`, item.word.nameTatar);
                                        }}
                                        title={ttsPlayingKey === `${item._id}:word` ? 'Остановить озвучку' : 'Озвучить слово'}
                                        aria-label="Озвучить слово"
                                        disabled={ttsLoadingKey === `${item._id}:word`}
                                    >
                                        {ttsLoadingKey === `${item._id}:word` ? (
                                            <span className={styles.ttsLoading}>…</span>
                                        ) : ttsPlayingKey === `${item._id}:word` ? (
                                            <StopIcon className={styles.ttsIconSvg} />
                                        ) : (
                                            <SpeakerIcon className={styles.ttsIconSvg} />
                                        )}
                                    </button>
                                    <span>Добавлено: {new Date(item.learnedAt).toLocaleDateString()}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Озвучка</th>
                                <th>Татарский</th>
                                <th>Транскрипция</th>
                                <th>Русский</th>
                                <th>Добавлено</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => {
                                const isOpen = openedTableWordId === item._id;
                                const usageExamples = getUsageExamples(item.word._id);
                                const usageLoading = Boolean(usageExamplesLoadingByWordId[item.word._id]);
                                const usageError = usageExamplesErrorByWordId[item.word._id];
                                const usageRequested = Boolean(usageExamplesRequestedByWordId[item.word._id]);
                                return (
                                    <React.Fragment key={item._id}>
                                        <tr
                                            className={styles.tableMainRow}
                                            onClick={() => setOpenedTableWordId(isOpen ? null : item._id)}
                                        >
                                            <td>
                                                <button
                                                    type="button"
                                                    className={styles.ttsIconBtn}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        speakText(`${item._id}:word`, item.word.nameTatar);
                                                    }}
                                                    title={ttsPlayingKey === `${item._id}:word` ? 'Остановить озвучку' : 'Озвучить слово'}
                                                    aria-label="Озвучить слово"
                                                    disabled={ttsLoadingKey === `${item._id}:word`}
                                                >
                                                    {ttsLoadingKey === `${item._id}:word` ? (
                                                        <span className={styles.ttsLoading}>…</span>
                                                    ) : ttsPlayingKey === `${item._id}:word` ? (
                                                        <StopIcon className={styles.ttsIconSvg} />
                                                    ) : (
                                                        <SpeakerIcon className={styles.ttsIconSvg} />
                                                    )}
                                                </button>
                                            </td>
                                            <td>{item.word.nameTatar}</td>
                                            <td>[{item.word.transcription}]</td>
                                            <td>{item.word.nameRu}</td>
                                            <td>{new Date(item.learnedAt).toLocaleDateString()}</td>
                                        </tr>
                                        {isOpen && (
                                            <tr className={styles.tableDescriptionRow}>
                                                <td colSpan={5}>
                                                    <div className={styles.tableDescriptionInner}>
                                                        <div
                                                            className={`${styles.descriptionWrap} ${isDescriptionExpanded(item.word._id) ? styles.descriptionWrapExpanded : ''}`}
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={(e) => toggleDescription(item.word._id, e)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault();
                                                                    toggleDescription(item.word._id, e);
                                                                }
                                                            }}
                                                        >
                                                            <div className={styles.descriptionHead}>
                                                                <p className={styles.descriptionLabel}>Описание</p>
                                                                <span className={styles.descriptionToggle}>
                                                                    {isDescriptionExpanded(item.word._id) ? 'Скрыть' : 'Показать'}
                                                                </span>
                                                            </div>
                                                            <div className={`${styles.descriptionBody} ${!isDescriptionExpanded(item.word._id) ? styles.descriptionBodyCollapsed : ''}`}>
                                                                <p className={styles.description}>
                                                                    {item.word.descriptionRu || 'Описание отсутствует'}
                                                                </p>
                                                                {!isDescriptionExpanded(item.word._id) && <div className={styles.descriptionFade} />}
                                                            </div>
                                                        </div>
                                                        <div className={styles.usageBlock}>
                                                            <div className={styles.usageActions}>
                                                                <button
                                                                    type="button"
                                                                    className={styles.usageGenerateBtn}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        generateUsageExamples(item.word._id);
                                                                    }}
                                                                    disabled={usageLoading}
                                                                >
                                                                    {usageLoading
                                                                        ? 'Генерация примеров...'
                                                                        : usageExamples.length > 0
                                                                            ? 'Другие примеры предложений'
                                                                            : 'Примеры предложений'}
                                                                </button>
                                                            </div>
                                                            {usageError && <p className={styles.usageError}>{usageError}</p>}
                                                            {usageRequested && usageExamples.length > 0 && (
                                                                <div className={styles.usageExamples}>
                                                                    <p className={styles.usageTitle}>2 примера предложений</p>
                                                                    {usageExamples.map((example, idx) => {
                                                                        const usageTtsKey = `${item._id}:example:${idx}`;
                                                                        return (
                                                                            <div key={usageTtsKey} className={styles.usageItem}>
                                                                                <div className={styles.usageTatRow}>
                                                                                    <p className={styles.usageTat}>{example.textTatar}</p>
                                                                                    <button
                                                                                        type="button"
                                                                                        className={styles.ttsIconBtn}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            speakText(usageTtsKey, example.textTatar);
                                                                                        }}
                                                                                        title={ttsPlayingKey === usageTtsKey ? 'Остановить озвучку' : 'Озвучить пример'}
                                                                                        aria-label="Озвучить пример"
                                                                                        disabled={ttsLoadingKey === usageTtsKey}
                                                                                    >
                                                                                        {ttsLoadingKey === usageTtsKey ? (
                                                                                            <span className={styles.ttsLoading}>…</span>
                                                                                        ) : ttsPlayingKey === usageTtsKey ? (
                                                                                            <StopIcon className={styles.ttsIconSvg} />
                                                                                        ) : (
                                                                                            <SpeakerIcon className={styles.ttsIconSvg} />
                                                                                        )}
                                                                                    </button>
                                                                                </div>
                                                                                <p className={styles.usageRu}>{example.textRu}</p>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {totalPages > 1 && (
                <div className={styles.paginationWrap}>
                    <button
                        type="button"
                        className={styles.paginationBtn}
                        onClick={() => loadDictionaryPage(page - 1, searchQuery)}
                        disabled={loading || page <= 1}
                    >
                        ←
                    </button>
                    <span className={styles.paginationInfo}>{page} / {totalPages}</span>
                    <button
                        type="button"
                        className={styles.paginationBtn}
                        onClick={() => loadDictionaryPage(page + 1, searchQuery)}
                        disabled={loading || page >= totalPages}
                    >
                        →
                    </button>
                </div>
            )}
        </div>
    );
});

export default DictionaryPage;
