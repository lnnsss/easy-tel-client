import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStores } from '../../stores/StoreContext';
import styles from './Profile.module.css';

const UserProfile = ({ user }) => {
    const { authStore, uiStore } = useStores();
    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || ''
    });

    const wordsTotal = user.dictionary?.length || 0;
    const wordsWeek = useMemo(() => {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return (user.dictionary || []).filter((entry) => {
            const ts = new Date(entry.learnedAt || 0).getTime();
            return Number.isFinite(ts) && ts >= weekAgo;
        }).length;
    }, [user.dictionary]);

    const initials = useMemo(() => {
        const first = (user.firstName || '').trim().charAt(0);
        const last = (user.lastName || '').trim().charAt(0);
        return `${first}${last}`.toUpperCase() || 'U';
    }, [user.firstName, user.lastName]);

    const avatarSrc = useMemo(() => {
        if (!user.avatarUrl) return '';
        if (user.avatarUrl.startsWith('http')) return user.avatarUrl;
        const apiBase = import.meta.env.VITE_API_URL || '';
        const serverBase = apiBase.replace(/\/api\/?$/, '');
        return `${serverBase}${user.avatarUrl}`;
    }, [user.avatarUrl]);

    const onAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const res = await authStore.uploadAvatar(file);
        if (res.success) {
            setAvatarLoadFailed(false);
            uiStore.showModal({
                title: 'Готово',
                message: 'Аватар обновлен',
                variant: 'success',
                primaryLabel: 'Закрыть',
                secondaryLabel: 'Закрыть'
            });
        } else {
            uiStore.showModal({
                title: 'Ошибка',
                message: res.message,
                variant: 'error',
                primaryLabel: 'Закрыть',
                secondaryLabel: 'Закрыть'
            });
        }
        e.target.value = '';
    };

    const onSaveProfile = async (e) => {
        e.preventDefault();
        const res = await authStore.updateProfile({
            firstName: form.firstName,
            lastName: form.lastName,
            username: form.username
        });

        if (res.success) {
            setIsEditing(false);
            uiStore.showModal({
                title: 'Готово',
                message: 'Профиль обновлен',
                variant: 'success',
                primaryLabel: 'Закрыть',
                secondaryLabel: 'Закрыть'
            });
        } else {
            uiStore.showModal({
                title: 'Ошибка',
                message: res.message,
                variant: 'error',
                primaryLabel: 'Закрыть',
                secondaryLabel: 'Закрыть'
            });
        }
    };

    return (
        <>
            {!user.emailVerified && (
                <div className={styles.verifyNotice}>
                    <p>Почта не подтверждена. Подтвердите email, чтобы защитить аккаунт и быстро восстанавливать доступ.</p>
                    <Link to="/verify-email" className={styles.verifyLink}>Подтвердить почту</Link>
                </div>
            )}

            <div className={styles.header}>
                <div className={styles.avatarRow}>
                    <div className={styles.avatarCircle}>
                        {avatarSrc && !avatarLoadFailed ? (
                            <img
                                src={avatarSrc}
                                alt="Аватар"
                                className={styles.avatarImage}
                                onError={() => setAvatarLoadFailed(true)}
                            />
                        ) : (
                            <span className={styles.avatarInitials}>{initials}</span>
                        )}
                    </div>
                    <label className={styles.avatarUploadBtn}>
                        Сменить фото
                        <input type="file" accept="image/*" hidden onChange={onAvatarChange} />
                    </label>
                </div>

                <h1 className={styles.fullName}>{user.firstName} {user.lastName}</h1>
                <p className={styles.username}>Логин: {user.username}</p>
                <div className={styles.rank}>Ранг: {user.rank}</div>

                <button
                    className={styles.editBtn}
                    type="button"
                    onClick={() => {
                        setIsEditing(!isEditing);
                        setForm({
                            firstName: user.firstName || '',
                            lastName: user.lastName || '',
                            username: user.username || ''
                        });
                    }}
                >
                    {isEditing ? 'Отмена' : 'Редактировать профиль'}
                </button>

                {isEditing && (
                    <form className={styles.editForm} onSubmit={onSaveProfile}>
                        <div className={styles.editGrid}>
                            <input
                                value={form.firstName}
                                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                                placeholder="Имя"
                                required
                            />
                            <input
                                value={form.lastName}
                                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                                placeholder="Фамилия"
                                required
                            />
                        </div>
                        <input
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            placeholder="Username"
                            required
                        />
                        <button type="submit" className={styles.saveBtn}>Сохранить</button>
                    </form>
                )}
            </div>

            <div className={styles.statsRow}>
                <div className={styles.statBox}>
                    <span className={styles.statVal}>{user.streak || 0}</span>
                    <span className={styles.statLabel}>Дней в ударе</span>
                </div>
                <div className={styles.statBox}>
                    <span className={styles.statVal}>{wordsWeek}</span>
                    <span className={styles.statLabel}>Слов за неделю</span>
                </div>
                <div className={styles.statBox}>
                    <span className={styles.statVal}>{wordsTotal}</span>
                    <span className={styles.statLabel}>Слов за все время</span>
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
