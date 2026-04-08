import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '../../stores/StoreContext';
import $api from '../../api/instance';
import styles from './RecognizePage.module.css';

const RecognizePage = observer(() => {
    const { recognizeStore, authStore } = useStores();
    const [ttsLoading, setTtsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [ttsError, setTtsError] = useState('');
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

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            recognizeStore.setPreview(file);
            recognizeStore.recognize(file);
            e.target.value = null;
        }
    };

    // ПРОВЕРКА: есть ли уже это слово у пользователя
    // Проверяем по ID слова в массиве словаря пользователя
    const isAlreadyInDictionary = authStore.user?.dictionary?.some(item => {
        // Если словарь содержит объекты (после populate) или просто ID UserWord
        // Обычно мы проверяем wordId, полученный от ИИ, со списком слов пользователя
        // Если бэкенд возвращает в профиле массив объектов { word: 'id' }, то:
        const wordIdInDict = typeof item.word === 'object' ? item.word._id : item.word;
        return wordIdInDict === recognizeStore.result?.id;
    });

    const hasResult = Boolean(recognizeStore.result);
    const stopAudio = () => {
        if (audioRef.current) {
            if (typeof audioRef.current.src === 'string' && audioRef.current.src.startsWith('blob:')) {
                URL.revokeObjectURL(audioRef.current.src);
            }
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
    };

    const onSpeakWord = async () => {
        setTtsError('');
        const textToSpeak = String(recognizeStore.result?.nameTatar || '').trim();

        if (!textToSpeak) {
            return;
        }

        if (isPlaying) {
            stopAudio();
            return;
        }

        setTtsLoading(true);
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
                setIsPlaying(false);
                URL.revokeObjectURL(audioUrl);
            };
            audio.onerror = () => {
                setIsPlaying(false);
                URL.revokeObjectURL(audioUrl);
                setTtsError('Не удалось воспроизвести озвучку');
            };
            audio.play()
                .then(() => setIsPlaying(true))
                .catch((err) => {
                    if (err?.name === 'NotAllowedError') {
                        return;
                    }
                    setTtsError('Не удалось воспроизвести озвучку');
                });
        } catch (e) {
            setTtsError(e?.response?.data?.message || 'Не удалось озвучить слово');
        } finally {
            setTtsLoading(false);
        }
    };

    return (
        <div className={`${styles.container} ${hasResult ? styles.containerExpanded : ''}`}>
            <div className={styles.instructionBlock}>
                <h2 className={styles.pageTitle}>Интеллектуальный сканер</h2>
                <p className={styles.pageSubtitle}>
                    Загрузите фотографию для мгновенного распознавания.
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
                                    <span className={styles.placeholderText}>Нажмите, чтобы выбрать фото</span>
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
                                    <p><strong>Русский:</strong> {recognizeStore.result.nameRu}</p>
                                    <p className={styles.descriptionText}>{recognizeStore.result.description}</p>
                                    {ttsError && <p className={styles.ttsError}>{ttsError}</p>}
                                </div>

                                <div className={styles.btnGroup}>
                                    {authStore.isAuth ? (
                                        isAlreadyInDictionary ? (
                                            <button className={styles.alreadyBtn} disabled>
                                                Уже в словаре
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => recognizeStore.addToDictionary()}
                                                className={styles.addBtn}
                                                disabled={recognizeStore.isSaving}
                                            >
                                                {recognizeStore.isSaving ? "Сохранение..." : "Добавить в словарь"}
                                            </button>
                                        )
                                    ) : (
                                        <p className={styles.authAlert}>Войдите, чтобы сохранить слово</p>
                                    )}

                                    <button
                                        onClick={onSpeakWord}
                                        className={styles.speakBtn}
                                        disabled={ttsLoading}
                                        type="button"
                                    >
                                        {ttsLoading ? 'Подготовка озвучки...' : isPlaying ? 'Остановить озвучку' : 'Озвучить'}
                                    </button>

                                    <button onClick={() => recognizeStore.reset()} className={styles.resetBtn}>
                                        Заново
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {recognizeStore.loading && <div className={styles.loader}>Анализ изображения...</div>}
                {recognizeStore.error && <div className={styles.error}>{recognizeStore.error}</div>}
            </div>

        </div>
    );
});

export default RecognizePage;
