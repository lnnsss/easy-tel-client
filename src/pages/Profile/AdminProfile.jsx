import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStores } from '../../stores/StoreContext';
import styles from './Profile.module.css';

// Отрисовывает профиль администратора с переходами в управляющие разделы.
const AdminProfile = ({ user }) => {
    const { t } = useTranslation();
    const { authStore } = useStores();
    const navigate = useNavigate();

    // Обрабатывает событие интерфейса пользователя.
    const onLogout = () => {
        authStore.logout();
        navigate('/login');
    };

    return (
        <div className={styles.adminContainer}>
            <div className={`${styles.header} ${styles.adminHeader}`}>
                <h1 className={styles.fullName}>{user.firstName} {user.lastName}</h1>
                <div className={styles.adminBadge}>{t('pages.admin_profile.badge')}</div>
            </div>

            <div className={styles.adminInfoCard}>
                <h3>{t('pages.admin_profile.title')}</h3>
                <p className={styles.adminText}>
                    {t('pages.admin_profile.description')}
                </p>
                <div className={styles.controlsStack}>
                    <button type="button" className={styles.logoutBtn} onClick={onLogout}>
                        {t('pages.profile.logout')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminProfile;
