import React, { useEffect, useMemo, useState } from 'react';
import $api from '../../api/instance';
import styles from './AchievementsPage.module.css';

const sortItems = (items, mode) => {
    const list = [...items];
    if (mode === 'incomplete') return list.sort((a, b) => Number(a.isUnlocked) - Number(b.isUnlocked));
    return list.sort((a, b) => Number(b.isUnlocked) - Number(a.isUnlocked));
};

const AchievementsPage = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortMode, setSortMode] = useState('completed');

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await $api.get('/achievements');
                setItems(Array.isArray(data?.items) ? data.items : []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const sorted = useMemo(() => sortItems(items, sortMode), [items, sortMode]);

    if (loading) return <div className={styles.loader}>Загрузка достижений...</div>;

    return (
        <div className={`${styles.container} app-page-shell`}>
            <div className={`app-page-top ${styles.topRow}`}>
                <h1 className="app-page-title">Достижения</h1>
                <div className={styles.viewSwitch}>
                <button
                    type="button"
                    className={`${styles.switchBtn} ${sortMode === 'completed' ? styles.switchBtnActive : ''}`}
                    onClick={() => setSortMode('completed')}
                >
                    Завершенные
                </button>
                <button
                    type="button"
                    className={`${styles.switchBtn} ${sortMode === 'incomplete' ? styles.switchBtnActive : ''}`}
                    onClick={() => setSortMode('incomplete')}
                >
                    Незавершенные
                </button>
                </div>
            </div>

            <div key={sortMode} className={styles.list}>
                {sorted.map((item, index) => {
                    const pct = item.hasProgressBar ? Math.min(100, Math.round((item.progressCurrent / Math.max(1, item.progressTarget)) * 100)) : (item.isUnlocked ? 100 : 0);
                    return (
                        <div key={item.code} className={`${styles.row} ${styles.rowAnimated} ${item.isUnlocked ? styles.unlocked : styles.locked}`} style={{ animationDelay: `${Math.min(index, 14) * 0.045}s` }}>
                            <div className={styles.main}>
                                <div className={styles.title}>{item.title}</div>
                                <div className={styles.desc}>{item.description}</div>
                                {item.hasProgressBar && (
                                    <div className={styles.progressWrap}>
                                        <div className={styles.progressBar}>
                                            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                                        </div>
                                        {!item.isUnlocked && (
                                            <div className={styles.progressText}>{item.progressCurrent}/{item.progressTarget}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className={styles.rewards}>+{item.rewards?.coins || 0} монет · +{item.rewards?.points || 0} очков</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AchievementsPage;
