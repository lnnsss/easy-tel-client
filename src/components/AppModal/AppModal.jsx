import React from 'react';
import styles from './AppModal.module.css';

const AppModal = ({
    isOpen,
    title,
    message,
    variant = 'info',
    onClose,
    onPrimary,
    onSecondary,
    primaryLabel = 'В словарь',
    secondaryLabel = 'Закрыть'
}) => {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h3 className={`${styles.title} ${styles[variant] || ''}`}>{title}</h3>
                <p className={styles.message}>{message}</p>
                <div className={styles.actions}>
                    {onPrimary && (
                        <button
                            className={`${styles.primaryBtn} ${variant === 'error' ? styles.primaryDanger : ''}`}
                            onClick={onPrimary}
                        >
                            {primaryLabel}
                        </button>
                    )}
                    <button className={styles.closeBtn} onClick={onSecondary || onClose}>
                        {secondaryLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AppModal;
