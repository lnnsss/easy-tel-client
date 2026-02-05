import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Profile.module.css';

const AdminProfile = ({ user }) => {
    return (
        <div className={styles.adminContainer}>
            <div className={styles.header}>
                <h1 className={styles.fullName}>{user.firstName} {user.lastName}</h1>
                <p className={styles.username}>Логин: {user.username}</p>
                <div className={styles.adminBadge}>Администратор</div>
            </div>

            <div className={styles.adminInfoCard}>
                <h3>Управление системой</h3>
                <p className={styles.adminText}>
                    Вы вошли как администратор. Вам доступны функции редактирования базы слов и управления контентом.
                </p>
                <Link to="/admin" className={styles.adminLinkBtn}>
                    Перейти в панель управления
                </Link>
            </div>
        </div>
    );
};

export default AdminProfile;