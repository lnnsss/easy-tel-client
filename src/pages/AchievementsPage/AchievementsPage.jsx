import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import $api from '../../api/instance';
import styles from './AchievementsPage.module.css';

// Сортирует достижения в выбранном режиме отображения.
const sortItems = (items, mode) => {
    const list = [...items];
    if (mode === 'incomplete') return list.sort((a, b) => Number(a.isUnlocked) - Number(b.isUnlocked));
    return list.sort((a, b) => Number(b.isUnlocked) - Number(a.isUnlocked));
};

// Отрисовывает экран или компонент AchievementsPage и связывает его с данными приложения.
const AchievementsPage = () => {
    const { t } = useTranslation();
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

    if (loading) return <div className={styles.loader}>{t('pages.achievements.loading')}</div>;

    return (
        <div className={`${styles.container} app-page-shell`}>
            <div className={`app-page-top ${styles.topRow}`}>
                <h1 className="app-page-title">{t('pages.achievements.title')}</h1>
                <div className={styles.viewSwitch}>
                <button
                    type="button"
                    className={`${styles.switchBtn} ${sortMode === 'completed' ? styles.switchBtnActive : ''}`}
                    onClick={() => setSortMode('completed')}
                >
                    {t('pages.achievements.completed')}
                </button>
                <button
                    type="button"
                    className={`${styles.switchBtn} ${sortMode === 'incomplete' ? styles.switchBtnActive : ''}`}
                    onClick={() => setSortMode('incomplete')}
                >
                    {t('pages.achievements.incomplete')}
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
                            <div className={styles.rewards}>{t('pages.achievements.rewards', { coins: item.rewards?.coins || 0, points: item.rewards?.points || 0 })}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AchievementsPage;
