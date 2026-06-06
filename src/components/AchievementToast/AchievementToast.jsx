import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './AchievementToast.module.css';

// Отрисовывает экран или компонент AchievementToast и связывает его с данными приложения.
const AchievementToast = ({ item, isClosing = false }) => {
    const { t } = useTranslation();
    if (!item) return null;
    const hasRewards = Number.isFinite(Number(item.rewards?.coins)) || Number.isFinite(Number(item.rewards?.points));
    return (
        <div className={`${styles.toast} ${isClosing ? styles.toastClosing : ''}`}>
            <div className={styles.title}>{item.title}</div>
            {hasRewards && (
                <div className={styles.rewards}>{t('pages.achievements.rewards', { coins: item.rewards?.coins || 0, points: item.rewards?.points || 0 })}</div>
            )}
        </div>
    );
};

export default AchievementToast;
