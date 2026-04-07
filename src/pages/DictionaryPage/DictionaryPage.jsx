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

    useEffect(() => {
        $api.get('/dictionary')
            .then(res => setItems(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

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
                                    Добавлено: {new Date(item.learnedAt).toLocaleDateString()}
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
                                            <td>{new Date(item.learnedAt).toLocaleDateString()}</td>
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
