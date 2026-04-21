import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStores } from '../../stores/StoreContext';
import styles from './Profile.module.css';

const AdminProfile = ({ user }) => {
    const { authStore } = useStores();
    const navigate = useNavigate();

    const onLogout = () => {
        authStore.logout();
        navigate('/login');
    };

    return (
        <div className={styles.adminContainer}>
            <div className={styles.header}>
                <h1 className={styles.fullName}>{user.firstName} {user.lastName}</h1>
                <div className={styles.adminBadge}>Администратор</div>
            </div>

            <div className={styles.adminInfoCard}>
                <h3>Управление системой</h3>
                <p className={styles.adminText}>
                    Вы вошли как администратор. Вам доступны функции редактирования базы слов и управления контентом.
                </p>
                <div className={styles.controlsStack}>
                    <button type="button" className={styles.logoutBtn} onClick={onLogout}>
                        Выйти
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminProfile;
