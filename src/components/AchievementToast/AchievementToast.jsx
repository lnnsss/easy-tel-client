import React from 'react';
import styles from './AchievementToast.module.css';

const AchievementToast = ({ item, isClosing = false }) => {
    if (!item) return null;
    const hasRewards = Number.isFinite(Number(item.rewards?.coins)) || Number.isFinite(Number(item.rewards?.points));
    return (
        <div className={`${styles.toast} ${isClosing ? styles.toastClosing : ''}`}>
            <div className={styles.title}>{item.title}</div>
            {hasRewards && (
                <div className={styles.rewards}>+{item.rewards?.coins || 0} монет · +{item.rewards?.points || 0} очков</div>
            )}
        </div>
    );
};

export default AchievementToast;
