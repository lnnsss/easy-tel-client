import React from 'react';
import { useTranslation } from 'react-i18next';
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
    primaryLabel,
    secondaryLabel
}) => {
    const { t } = useTranslation();
    if (!isOpen) return null;
    const resolvedPrimaryLabel = primaryLabel || t('common.to_dictionary');
    const resolvedSecondaryLabel = secondaryLabel === undefined ? t('common.close') : secondaryLabel;
    const hasSecondary = Boolean(resolvedSecondaryLabel);
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
                            {resolvedPrimaryLabel}
                        </button>
                    )}
                    {hasSecondary && (
                        <button className={styles.closeBtn} onClick={onSecondary || onClose}>
                            {resolvedSecondaryLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppModal;
