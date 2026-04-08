import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import $api from '../../api/instance';
import styles from './DictionaryPage.module.css';

const DictionaryPage = observer(() => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('cards');
    const [openedWordId, setOpenedWordId] = useState(null);
    const [openedTableWordId, setOpenedTableWordId] = useState(null);
    const [ttsLoadingWordId, setTtsLoadingWordId] = useState(null);
    const [ttsPlayingWordId, setTtsPlayingWordId] = useState(null);
    const [ttsError, setTtsError] = useState('');
    const [audioObj, setAudioObj] = useState(null);

    useEffect(() => {
        $api.get('/dictionary')
            .then(res => setItems(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
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

    const speakWord = async (wordId, text) => {
        setTtsError('');
        const cleanText = String(text || '').trim();
        if (!cleanText) return;

        if (ttsPlayingWordId === wordId && audioObj) {
            audioObj.pause();
            audioObj.currentTime = 0;
            setTtsPlayingWordId(null);
            return;
        }

        setTtsLoadingWordId(wordId);
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
                setTtsPlayingWordId(null);
                URL.revokeObjectURL(nextUrl);
            };
            nextAudio.onerror = () => {
                setTtsPlayingWordId(null);
                setTtsError('Не удалось воспроизвести озвучку');
                URL.revokeObjectURL(nextUrl);
            };

            setAudioObj(nextAudio);

            await nextAudio.play();
            setTtsPlayingWordId(wordId);
        } catch (err) {
            const browserBlocked = err?.name === 'NotAllowedError';
            if (!browserBlocked) {
                setTtsError(err?.response?.data?.message || 'Не удалось озвучить слово');
            }
        } finally {
            setTtsLoadingWordId(null);
        }
    };

    if (loading) return <div className={styles.loader}>Загрузка словаря...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.headerBar}>
                <h1 className={styles.title}>Мои изученные слова</h1>
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
            </div>
            {ttsError && <p className={styles.ttsError}>{ttsError}</p>}

            {items.length === 0 ? (
                <div className={styles.empty}>
                    <p>Вы еще не добавили ни одного слова в словарь.</p>
                </div>
            ) : viewMode === 'cards' ? (
                <div className={styles.grid}>
                    {items.map(item => {
                        const isOpened = openedWordId === item._id;
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
                                    <div className={styles.descriptionWrap}>
                                        <p className={styles.descriptionLabel}>Описание</p>
                                        <p className={styles.description}>{item.word.descriptionRu || 'Описание отсутствует'}</p>
                                    </div>
                                )}
                                <div className={styles.footer}>
                                    <button
                                        type="button"
                                        className={styles.ttsIconBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            speakWord(item._id, item.word.nameTatar);
                                        }}
                                        title={ttsPlayingWordId === item._id ? 'Остановить озвучку' : 'Озвучить слово'}
                                        aria-label="Озвучить слово"
                                        disabled={ttsLoadingWordId === item._id}
                                    >
                                        {ttsLoadingWordId === item._id ? '…' : ttsPlayingWordId === item._id ? '■' : '🔊'}
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
                                <th>Татарский</th>
                                <th>Транскрипция</th>
                                <th>Русский</th>
                                <th>Добавлено</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => {
                                const isOpen = openedTableWordId === item._id;
                                return (
                                    <React.Fragment key={item._id}>
                                        <tr
                                            className={styles.tableMainRow}
                                            onClick={() => setOpenedTableWordId(isOpen ? null : item._id)}
                                        >
                                            <td>{item.word.nameTatar}</td>
                                            <td>[{item.word.transcription}]</td>
                                            <td>{item.word.nameRu}</td>
                                            <td>
                                                <div className={styles.tableWordCell}>
                                                    <button
                                                        type="button"
                                                        className={styles.ttsIconBtn}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            speakWord(item._id, item.word.nameTatar);
                                                        }}
                                                        title={ttsPlayingWordId === item._id ? 'Остановить озвучку' : 'Озвучить слово'}
                                                        aria-label="Озвучить слово"
                                                        disabled={ttsLoadingWordId === item._id}
                                                    >
                                                        {ttsLoadingWordId === item._id ? '…' : ttsPlayingWordId === item._id ? '■' : '🔊'}
                                                    </button>
                                                    <span>{new Date(item.learnedAt).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                        </tr>
                                        {isOpen && (
                                            <tr className={styles.tableDescriptionRow}>
                                                <td colSpan={4}>
                                                    <div className={styles.tableDescriptionInner}>
                                                        <span className={styles.descriptionLabel}>Описание</span>
                                                        <p className={styles.description}>
                                                            {item.word.descriptionRu || 'Описание отсутствует'}
                                                        </p>
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
        </div>
    );
});

export default DictionaryPage;
