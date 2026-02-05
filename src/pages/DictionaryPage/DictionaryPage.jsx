import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import $api from '../../api/instance';
import styles from './DictionaryPage.module.css';

const DictionaryPage = observer(() => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        $api.get('/dictionary')
            .then(res => setItems(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className={styles.loader}>Загрузка словаря...</div>;

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Мои изученные слова</h1>

            {items.length === 0 ? (
                <div className={styles.empty}>
                    <p>Вы еще не добавили ни одного слова в словарь.</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {items.map(item => (
                        <div key={item._id} className={styles.wordCard}>
                            <div className={styles.header}>
                                <h2 className={styles.tatar}>{item.word.nameTatar}</h2>
                                <span className={styles.transcription}>[{item.word.transcription}]</span>
                            </div>
                            <p className={styles.russian}>
                                <strong>Русский:</strong> {item.word.nameRu}
                            </p>
                            <div className={styles.footer}>
                                Добавлено: {new Date(item.learnedAt).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

export default DictionaryPage;