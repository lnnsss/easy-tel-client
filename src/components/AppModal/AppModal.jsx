import React from 'react';
import styles from './AppModal.module.css';

const AppModal = ({
    isOpen,
    title,
    message,
    content,
    disableClose = false,
    variant = 'info',
    onClose,
    onPrimary,
    onSecondary,
    primaryLabel = 'В словарь',
    secondaryLabel = 'Закрыть'
}) => {
    if (!isOpen) return null;
    const hasSecondary = Boolean(secondaryLabel);
    const isSingleAction = !onPrimary || !hasSecondary;

    return (
        <div className={styles.overlay} onClick={disableClose ? undefined : onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h3 className={styles.title}>{title}</h3>
                {content || <p className={styles.message}>{message}</p>}
                <div className={`${styles.actions} ${isSingleAction ? styles.actionsSingle : ''}`}>
                    {onPrimary && (
                        <button
                            className={`${styles.primaryBtn} ${variant === 'error' ? styles.primaryDanger : ''}`}
                            onClick={onPrimary}
                        >
                            {primaryLabel}
                        </button>
                    )}
                    {hasSecondary && (
                        <button className={styles.closeBtn} onClick={onSecondary || onClose}>
                            {secondaryLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppModal;
