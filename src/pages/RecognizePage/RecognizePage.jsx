import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useStores } from '../../stores/StoreContext';
import $api from '../../api/instance';
import styles from './RecognizePage.module.css';

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

// Отрисовывает экран или компонент RecognizePage и связывает его с данными приложения.
const RecognizePage = observer(() => {
    const { t } = useTranslation();
    const { recognizeStore, authStore } = useStores();
    const [ttsLoadingKey, setTtsLoadingKey] = useState(null);
    const [ttsPlayingKey, setTtsPlayingKey] = useState(null);
    const [ttsError, setTtsError] = useState('');
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const audioRef = useRef(null);

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                if (typeof audioRef.current.src === 'string' && audioRef.current.src.startsWith('blob:')) {
                    URL.revokeObjectURL(audioRef.current.src);
                }
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        setIsDescriptionExpanded(false);
    }, [recognizeStore.result?.id]);

    // Обрабатывает пользовательское или системное событие.
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            recognizeStore.setPreview(file);
            recognizeStore.recognize(file);
            e.target.value = null;
        }
    };

    // ПРОВЕРКА: есть ли уже это слово у пользователя
    // Проверяем по идентификатору слова в массиве словаря пользователя.
    const isAlreadyInDictionary = authStore.user?.dictionary?.some((item) => {
        if (!item) return false;
        // Если словарь содержит развернутые объекты или просто идентификаторы пользовательских слов.
        // Обычно мы сверяем идентификатор, полученный от ИИ, со списком слов пользователя.
        // Если бэкенд возвращает в профиле массив объектов со ссылкой на слово, то:
        const rawWord = item.word ?? item;
        const wordIdInDict = typeof rawWord === 'object' ? rawWord?._id : rawWord;
        return String(wordIdInDict || '') === String(recognizeStore.result?.id || '');
    });

    const hasResult = Boolean(recognizeStore.result);
    const examplesRequested = recognizeStore.examplesRequested;
    const examplesLoading = recognizeStore.examplesLoading;
    const examplesError = recognizeStore.examplesError;
    const usageExamples = Array.isArray(recognizeStore.result?.usageExamples)
        ? recognizeStore.result.usageExamples
            .filter((item) => item?.textTatar && item?.textRu)
            .slice(0, 2)
        : [];
    const stopAudio = () => {
        if (audioRef.current) {
            if (typeof audioRef.current.src === 'string' && audioRef.current.src.startsWith('blob:')) {
                URL.revokeObjectURL(audioRef.current.src);
            }
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setTtsPlayingKey(null);
    };

    // Обрабатывает событие интерфейса пользователя.
    const onSpeakText = async (targetKey, rawText) => {
        setTtsError('');
        const textToSpeak = String(rawText || '').trim();

        if (!textToSpeak) {
            return;
        }

        if (ttsPlayingKey === targetKey) {
            stopAudio();
            return;
        }

        setTtsLoadingKey(targetKey);
        try {
            const { data } = await $api.post('/translate/tts', {
                speaker: 'almaz',
                text: textToSpeak
            });

            const wavBase64 = String(data?.wavBase64 || '');
            if (!wavBase64) {
                throw new Error('invalid_tts_payload');
            }

            const binary = atob(wavBase64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i += 1) {
                bytes[i] = binary.charCodeAt(i);
            }

            if (audioRef.current) {
                if (typeof audioRef.current.src === 'string' && audioRef.current.src.startsWith('blob:')) {
                    URL.revokeObjectURL(audioRef.current.src);
                }
                audioRef.current.pause();
            }

            const audioUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            audio.onended = () => {
                setTtsPlayingKey(null);
                URL.revokeObjectURL(audioUrl);
            };
            audio.onerror = () => {
                setTtsPlayingKey(null);
                URL.revokeObjectURL(audioUrl);
                setTtsError(t('pages.scanner.tts_play_error'));
            };
            audio.play()
                .then(() => setTtsPlayingKey(targetKey))
                .catch((err) => {
                    if (err?.name === 'NotAllowedError') {
                        return;
                    }
                    setTtsError(t('pages.scanner.tts_play_error'));
                });
        } catch (e) {
            setTtsError(e?.response?.data?.message || t('pages.scanner.tts_word_error'));
        } finally {
            setTtsLoadingKey(null);
        }
    };

    return (
        <div className={`${styles.container} ${hasResult ? styles.containerExpanded : ''}`}>
            <div className={styles.instructionBlock}>
                <h2 className={styles.pageTitle}>{t('pages.scanner.title')}</h2>
                <p className={styles.pageSubtitle}>
                    {t('pages.scanner.subtitle')}
                </p>
            </div>

            <div className={`${styles.uploadCard} ${hasResult ? styles.uploadCardExpanded : ''}`}>
                <div className={`${styles.contentLayout} ${hasResult ? styles.contentLayoutExpanded : ''}`}>
                    <div className={`${styles.previewPane} ${hasResult ? styles.previewPaneShifted : ''}`}>
                        <label className={styles.dropzone}>
                            <input type="file" onChange={handleFileChange} hidden accept="image/*" />
                            {recognizeStore.preview ? (
                                <img src={recognizeStore.preview} alt="Preview" className={styles.imagePreview} />
                            ) : (
                                <div className={styles.placeholder}>
                                    <span className={styles.placeholderText}>{t('pages.scanner.choose_photo')}</span>
                                </div>
                            )}
                        </label>
                    </div>

                    {recognizeStore.result && (
                        <div className={`${styles.resultPane} ${hasResult ? styles.resultPaneVisible : ''}`}>
                            <div className={styles.resultCard}>
                                <div className={styles.resultMain}>
                                    <h2 className={styles.tatarWord}>{recognizeStore.result.nameTatar}</h2>
                                    <span className={styles.transcription}>[{recognizeStore.result.transcription}]</span>
                                </div>

                                <div className={styles.details}>
                                    <p><strong>{t('pages.scanner.russian')}</strong> {recognizeStore.result.nameRu}</p>
                                    <div
                                        className={`${styles.descriptionWrap} ${isDescriptionExpanded ? styles.descriptionWrapExpanded : ''}`}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setIsDescriptionExpanded((prev) => !prev)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setIsDescriptionExpanded((prev) => !prev);
                                            }
                                        }}
                                    >
                                        <div className={styles.descriptionHead}>
                                            <p className={styles.descriptionLabel}>{t('pages.scanner.description')}</p>
                                            <span className={styles.descriptionToggle}>
                                                {isDescriptionExpanded ? t('pages.scanner.hide') : t('pages.scanner.show')}
                                            </span>
                                        </div>
                                        <div className={`${styles.descriptionBody} ${!isDescriptionExpanded ? styles.descriptionBodyCollapsed : ''}`}>
                                            <p className={styles.descriptionText}>
                                                {recognizeStore.result.description || t('pages.scanner.no_description')}
                                            </p>
                                            {!isDescriptionExpanded && <div className={styles.descriptionFade} />}
                                        </div>
                                    </div>
                                    {examplesError && <p className={styles.examplesError}>{examplesError}</p>}
                                    {examplesRequested && usageExamples.length > 0 && (
                                        <div className={styles.usageExamples}>
                                            <p className={styles.usageTitle}>{t('pages.scanner.examples_count')}</p>
                                            {usageExamples.map((item, idx) => (
                                                <div key={`${item.textTatar}_${idx}`} className={styles.usageItem}>
                                                    <div className={styles.usageTatRow}>
                                                        <p className={styles.usageTat}>{item.textTatar}</p>
                                                        <button
                                                            type="button"
                                                            className={styles.usageSpeakBtn}
                                                            onClick={() => onSpeakText(`example_${idx}`, item.textTatar)}
                                                            title={ttsPlayingKey === `example_${idx}` ? t('pages.scanner.stop_tts') : t('pages.scanner.speak_example')}
                                                            aria-label={t('pages.scanner.speak_example')}
                                                            disabled={ttsLoadingKey === `example_${idx}`}
                                                        >
                                                            {ttsLoadingKey === `example_${idx}` ? (
                                                                <span className={styles.usageDots}>...</span>
                                                            ) : ttsPlayingKey === `example_${idx}` ? (
                                                                <StopIcon className={styles.usageSpeakIcon} />
                                                            ) : (
                                                                <SpeakerIcon className={styles.usageSpeakIcon} />
                                                            )}
                                                        </button>
                                                    </div>
                                                    <p className={styles.usageRu}>{item.textRu}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {ttsError && <p className={styles.ttsError}>{ttsError}</p>}
                                </div>

                                <div className={styles.btnGroup}>
                                    <button
                                        type="button"
                                        className={styles.speakBtn}
                                        onClick={() => recognizeStore.generateUsageExamples()}
                                        disabled={examplesLoading}
                                    >
                                        {examplesLoading
                                            ? t('pages.scanner.examples_loading')
                                            : usageExamples.length > 0
                                                ? t('pages.scanner.more_examples')
                                                : t('pages.scanner.examples')}
                                    </button>

                                    <button
                                        onClick={() => onSpeakText('word', recognizeStore.result?.nameTatar)}
                                        className={styles.speakBtn}
                                        disabled={ttsLoadingKey === 'word'}
                                        type="button"
                                    >
                                        {ttsLoadingKey === 'word'
                                            ? t('pages.scanner.tts_preparing')
                                            : ttsPlayingKey === 'word'
                                                ? t('pages.scanner.stop_tts')
                                                : t('pages.scanner.speak')}
                                    </button>

                                    {authStore.isAuth ? (
                                        <div className={styles.mainActionRow}>
                                            {isAlreadyInDictionary ? (
                                                <button className={`${styles.alreadyBtn} ${styles.halfBtn}`} disabled>
                                                    {t('pages.scanner.already_saved')}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => recognizeStore.addToDictionary()}
                                                    className={`${styles.addBtn} ${styles.halfBtn}`}
                                                    disabled={recognizeStore.isSaving}
                                                >
                                                    {recognizeStore.isSaving ? t('pages.scanner.saving') : t('pages.scanner.add_to_dictionary')}
                                                </button>
                                            )}
                                            <button onClick={() => recognizeStore.reset()} className={`${styles.resetBtn} ${styles.halfBtn}`}>
                                                {t('pages.scanner.retry')}
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <p className={styles.authAlert}>{t('pages.scanner.login_to_save')}</p>
                                            <button onClick={() => recognizeStore.reset()} className={styles.resetBtn}>
                                                {t('pages.scanner.retry')}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {recognizeStore.loading && <div className={styles.loader}>{t('pages.scanner.analyzing')}</div>}
                {recognizeStore.error && <div className={styles.error}>{recognizeStore.error}</div>}
            </div>

        </div>
    );
});

export default RecognizePage;
