import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useStores } from '../../stores/StoreContext';
import UserProfile from './UserProfile';
import AdminProfile from './AdminProfile';
import styles from './Profile.module.css';

// Отрисовывает экран или компонент ProfilePage и связывает его с данными приложения.
const ProfilePage = observer(() => {
    const { t } = useTranslation();
    const { authStore } = useStores();
    const user = authStore.user;

    if (!user) return <div className={styles.loader}>{t('pages.profile.loading')}</div>;

    return (
        <div className={styles.container}>
            {user.role === 'admin' ? (
                <AdminProfile user={user} />
            ) : (
                <UserProfile user={user} />
            )}
        </div>
    );
});

export default ProfilePage;
