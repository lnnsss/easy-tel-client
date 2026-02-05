import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '../../stores/StoreContext';
import styles from './Profile.module.css';

const ProfilePage = observer(() => {
    const { authStore } = useStores();
    const user = authStore.user;

    if (!user) return <div className={styles.loader}>Загрузка...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>{user.firstName} {user.lastName}</h1>
                <p className={styles.username}>Логин: {user.username}</p>
                <div className={styles.rank}>Ранг: {user.rank}</div>
            </div>

            <div className={styles.statsRow}>
                <div className={styles.statBox}>
                    <span className={styles.statVal}>{user.streak}</span>
                    <span className={styles.statLabel}>Дней в ударе</span>
                </div>
                <div className={styles.statBox}>
                    <span className={styles.statVal}>{user.dictionary?.length || 0}</span>
                    <span className={styles.statLabel}>Слов изучено</span>
                </div>
            </div>

            <div className={styles.achievementsCard}>
                <h3>Достижения</h3>
                <div className={styles.achList}>
                    {user.achievements && user.achievements.length > 0 ? (
                        user.achievements.map((ach, i) => (
                            <div key={i} className={styles.achItem}>
                                <div className={styles.bullet}></div>
                                <span>{ach}</span>
                            </div>
                        ))
                    ) : (
                        <p className={styles.empty}>Список достижений пуст</p>
                    )}
                </div>
            </div>
        </div>
    );
});

export default ProfilePage;