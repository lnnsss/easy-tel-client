import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './LevelHeader.module.css';

const POINTS_PER_LEVEL = 10;

// Отрисовывает экран или компонент LevelHeader и связывает его с данными приложения.
const LevelHeader = ({ totalPoints = 0, coins = 0 }) => {
    const { t } = useTranslation();
    const safePoints = Math.max(0, Number(totalPoints) || 0);
    const safeCoins = Math.max(0, Number(coins) || 0);

    const level = Math.floor(safePoints / POINTS_PER_LEVEL) + 1;
    const levelStart = (level - 1) * POINTS_PER_LEVEL;
    const levelEnd = level * POINTS_PER_LEVEL;
    const progressInLevel = safePoints - levelStart;
    const remaining = Math.max(0, levelEnd - safePoints);
    const progressPct = Math.min(100, Math.round((progressInLevel / POINTS_PER_LEVEL) * 100));

    return (
        <div className={styles.wrap}>
            <div className={styles.inner}>
                <div className={styles.topRow}>
                    <div className={styles.level}>{t('pages.profile.level', { level })}</div>
                    <div className={styles.coins}>{t('pages.character.coins', { count: safeCoins })}</div>
                </div>
                <div className={styles.meta}>{t('pages.profile.next_level', { count: remaining })}</div>
                <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
                </div>
            </div>
        </div>
    );
};

export default LevelHeader;
