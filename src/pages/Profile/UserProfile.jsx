import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStores } from '../../stores/StoreContext';
import styles from './Profile.module.css';

const UserProfile = ({ user }) => {
    const { authStore, uiStore } = useStores();
    const navigate = useNavigate();
    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [copiedUsername, setCopiedUsername] = useState(false);
    const [activeStat, setActiveStat] = useState(null);
    const [theme, setTheme] = useState(() => (
        document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
    ));
    const [form, setForm] = useState({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || ''
    });

    const wordsTotal = user.dictionary?.length || 0;
    const totalPoints = Number.isFinite(user.totalPoints) ? user.totalPoints : wordsTotal;
    const analytics = user.analytics || null;
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

    const onLogout = () => {
        authStore.logout();
        navigate('/login');
    };

    const onCopyUsername = async () => {
        const normalizedUsername = String(user.username || '').trim().replace(/^@+/, '');
        const value = normalizedUsername;
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setCopiedUsername(true);
            setTimeout(() => setCopiedUsername(false), 1200);
        } catch {
            setCopiedUsername(false);
        }
    };

    const onToggleTheme = () => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(nextTheme);
        localStorage.setItem('theme', nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
    };

    const stats = [
        {
            key: 'streak',
            displayValue: String(user.streak || 0),
            label: 'Дней в ударе',
            description: 'Количество дней подряд, когда вы добавляли хотя бы одно новое слово. Если пропустить день, серия обнуляется.'
        },
        {
            key: 'wordsWeek',
            displayValue: String(wordsWeek),
            label: 'Слов за неделю',
            description: 'Сколько новых слов добавлено в словарь за последние 7 дней.'
        },
        {
            key: 'wordsTotal',
            displayValue: String(wordsTotal),
            label: 'Слов за все время',
            description: 'Общее количество уникальных слов, которые вы добавили в личный словарь.'
        },
        {
            key: 'totalPoints',
            displayValue: String(totalPoints),
            label: 'Всего очков',
            description: 'Сумма очков за активность: сканирование слов и обучение в курсах.'
        },
        {
            key: 'discipline',
            displayValue: `${analytics?.discipline?.score ?? 0}/100`,
            label: 'Дисциплина',
            description: 'Оценка регулярности занятий и стабильности учебной активности.'
        },
        {
            key: 'motivation',
            displayValue: `${analytics?.motivation?.score ?? 0}/100`,
            label: 'Мотивация',
            description: 'Оценка вовлеченности в учебу: насколько активно вы продолжаете прогресс.'
        }
    ];

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
                </div>

                <h1 className={styles.fullName}>{user.firstName} {user.lastName}</h1>
                <button type="button" className={styles.usernameBtn} onClick={onCopyUsername}>
                    @{user.username}
                    {copiedUsername && <span className={styles.copiedHint}>скопировано</span>}
                </button>
                <div className={styles.rank}>Ранг: {user.rank}</div>

                <div className={styles.controlsStack}>
                    <button type="button" className={styles.themeToggleBtn} onClick={onToggleTheme}>
                        {theme === 'dark' ? 'Светлая тема' : 'Темная тема'}
                    </button>

                    <div className={styles.profileActions}>
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
                        <button className={styles.logoutBtn} type="button" onClick={onLogout}>
                            Выйти
                        </button>
                    </div>
                </div>

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
                        <div className={styles.editMetaRow}>
                            <input
                                value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                placeholder="Username"
                                required
                            />
                            <label className={styles.avatarUploadBtn}>
                                Сменить фото
                                <input type="file" accept="image/*" hidden onChange={onAvatarChange} />
                            </label>
                        </div>
                        <button type="submit" className={styles.saveBtn}>Сохранить</button>
                    </form>
                )}
            </div>

            <div className={styles.statsRow}>
                {stats.map((stat) => (
                    <button
                        key={stat.key}
                        type="button"
                        className={`${styles.statBox} ${styles.statBoxBtn}`}
                        onClick={() => setActiveStat(stat)}
                    >
                        <span className={styles.statVal}>{stat.displayValue}</span>
                        <span className={styles.statLabel}>{stat.label}</span>
                    </button>
                ))}
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

            {activeStat && (
                <div className={styles.statModalOverlay} onClick={() => setActiveStat(null)}>
                    <div
                        className={styles.statModal}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="stat-modal-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            className={styles.statModalClose}
                            onClick={() => setActiveStat(null)}
                            aria-label="Закрыть"
                        >
                            ×
                        </button>
                        <div className={styles.statModalValue}>{activeStat.displayValue}</div>
                        <h3 id="stat-modal-title" className={styles.statModalTitle}>{activeStat.label}</h3>
                        <p className={styles.statModalDescription}>{activeStat.description}</p>
                    </div>
                </div>
            )}
        </>
    );
};

export default UserProfile;
