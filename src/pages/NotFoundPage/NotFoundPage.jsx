import React from 'react';
import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

const NotFoundPage = () => {
    return (
        <div className={styles.wrap}>
            <p className={styles.code}>404</p>
            <p className={styles.subtitle}>Страница не найдена</p>
            <Link to="/" className={styles.homeLink}>На главную</Link>
        </div>
    );
};

export default NotFoundPage;
