import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './NotFoundPage.module.css';

// Отрисовывает экран или компонент NotFoundPage и связывает его с данными приложения.
const NotFoundPage = () => {
    const { t } = useTranslation();
    return (
        <div className={styles.wrap}>
            <p className={styles.code}>404</p>
            <p className={styles.subtitle}>{t('pages.not_found.subtitle')}</p>
            <Link to="/" className={styles.homeLink}>{t('pages.not_found.home')}</Link>
        </div>
    );
};

export default NotFoundPage;
