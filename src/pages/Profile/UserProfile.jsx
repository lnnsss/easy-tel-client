import React from 'react';
import styles from './Profile.module.css';

const UserProfile = ({ user }) => {
    return (
        <>
            <div className={styles.header}>
                <h1 className={styles.fullName}>{user.firstName} {user.lastName}</h1>
                <p className={styles.username}>Логин: {user.username}</p>
                <div className={styles.rank}>Ранг: {user.rank}</div>
            </div>

            <div className={styles.statsRow}>
                <div className={styles.statBox}>
                    <span className={styles.statVal}>{user.streak || 0}</span>
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
        </>
    );
};

export default UserProfile;