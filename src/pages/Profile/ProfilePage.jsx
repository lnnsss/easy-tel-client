import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '../../stores/StoreContext';
import UserProfile from './UserProfile';
import AdminProfile from './AdminProfile';
import styles from './Profile.module.css';

const ProfilePage = observer(() => {
    const { authStore } = useStores();
    const user = authStore.user;

    if (!user) return <div className={styles.loader}>Загрузка...</div>;

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