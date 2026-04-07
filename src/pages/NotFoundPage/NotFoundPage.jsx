import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

const NotFoundPage = () => {
    const navigate = useNavigate();

    return (
        <div className={styles.wrap}>
            <div className={styles.card}>
                <p className={styles.code}>404</p>
                <h1>Страница не найдена</h1>
                <p>Проверьте адрес или вернитесь назад.</p>
                <div className={styles.actions}>
                    <Link to="/" className={styles.primaryBtn}>На главную</Link>
                    <button type="button" className={styles.secondaryBtn} onClick={() => navigate(-1)}>Назад</button>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;
