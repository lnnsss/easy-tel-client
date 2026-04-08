import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import $api from '../../api/instance';
import profileStyles from './Profile.module.css';
import styles from './PublicProfilePage.module.css';

const PublicProfilePage = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState('');
    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
    const [copiedUsername, setCopiedUsername] = useState(false);
    const [activeStat, setActiveStat] = useState(null);
    const [isFriendActionLoading, setIsFriendActionLoading] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            setNotFound(false);
            setError('');

            try {
                const { data } = await $api.get(`/users/${encodeURIComponent(username || '')}/profile`);
                setProfile(data?.profile || null);
            } catch (e) {
                if (e?.response?.status === 404) {
                    setNotFound(true);
                } else {
                    setError(e?.response?.data?.message || 'Не удалось загрузить профиль');
                }
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [username]);

    const avatarSrc = useMemo(() => {
        if (!profile?.avatarUrl) return '';
        if (profile.avatarUrl.startsWith('http')) return profile.avatarUrl;
        const apiBase = import.meta.env.VITE_API_URL || '';
        const serverBase = apiBase.replace(/\/api\/?$/, '');
        return `${serverBase}${profile.avatarUrl}`;
    }, [profile?.avatarUrl]);

    const initials = useMemo(() => {
        const first = (profile?.firstName || '').trim().charAt(0);
        const last = (profile?.lastName || '').trim().charAt(0);
        return `${first}${last}`.toUpperCase() || 'U';
    }, [profile?.firstName, profile?.lastName]);

    const onCopyUsername = async () => {
        const normalizedUsername = String(profile?.username || '').trim().replace(/^@+/, '');
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

    const reloadProfile = async () => {
        const { data } = await $api.get(`/users/${encodeURIComponent(username || '')}/profile`);
        setProfile(data?.profile || null);
    };

    const onFriendAction = async () => {
        if (!profile || isFriendActionLoading) return;

        setIsFriendActionLoading(true);
        try {
            if (profile.relationStatus === 'none') {
                await $api.post('/friends/requests', { toUserId: profile._id });
            } else if (profile.relationStatus === 'pending_outgoing' && profile.requestId) {
                await $api.post(`/friends/requests/${profile.requestId}/cancel`);
            } else if (profile.relationStatus === 'pending_incoming' && profile.requestId) {
                await $api.post(`/friends/requests/${profile.requestId}/accept`);
            } else if (profile.relationStatus === 'friend') {
                await $api.delete(`/friends/${profile._id}`);
            }

            await reloadProfile();
        } finally {
            setIsFriendActionLoading(false);
        }
    };

    if (loading) return <div className={profileStyles.loader}>Загрузка...</div>;

    if (notFound) {
        return (
            <div className={styles.stateWrap}>
                <h1>Пользователь не найден</h1>
                <p>Возможно, профиль был удален или username изменился.</p>
                <div className={styles.stateActions}>
                    <Link to="/" className={styles.primaryBtn}>На главную</Link>
                    <button type="button" className={styles.secondaryBtn} onClick={() => navigate(-1)}>Назад</button>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.stateWrap}>
                <h1>Ошибка</h1>
                <p>{error}</p>
                <div className={styles.stateActions}>
                    <Link to="/" className={styles.primaryBtn}>На главную</Link>
                    <button type="button" className={styles.secondaryBtn} onClick={() => navigate(-1)}>Назад</button>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className={styles.stateWrap}>
                <h1>Пользователь не найден</h1>
                <p>Возможно, профиль был удален или username изменился.</p>
                <div className={styles.stateActions}>
                    <Link to="/" className={styles.primaryBtn}>На главную</Link>
                    <button type="button" className={styles.secondaryBtn} onClick={() => navigate(-1)}>Назад</button>
                </div>
            </div>
        );
    }

    const stats = [
        {
            key: 'streak',
            displayValue: String(profile.streak || 0),
            label: 'Дней в ударе',
            description: 'Количество дней подряд, когда пользователь добавлял хотя бы одно новое слово. Если пропустить день, серия обнуляется.'
        },
        {
            key: 'wordsWeek',
            displayValue: String(profile.wordsWeek || 0),
            label: 'Слов за неделю',
            description: 'Сколько новых слов добавлено в словарь за последние 7 дней.'
        },
        {
            key: 'wordsTotal',
            displayValue: String(profile.wordsTotal || 0),
            label: 'Слов за все время',
            description: 'Общее количество уникальных слов, добавленных в словарь.'
        },
        {
            key: 'totalPoints',
            displayValue: String(profile.totalPoints || 0),
            label: 'Всего очков',
            description: 'Сумма очков, которые пользователь получил за учебную активность.'
        }
    ];

    return (
        <div className={profileStyles.container}>
            <div className={profileStyles.header}>
                <div className={profileStyles.avatarRow}>
                    <div className={profileStyles.avatarCircle}>
                        {avatarSrc && !avatarLoadFailed ? (
                            <img
                                src={avatarSrc}
                                alt="Аватар"
                                className={profileStyles.avatarImage}
                                onError={() => setAvatarLoadFailed(true)}
                            />
                        ) : (
                            <span className={profileStyles.avatarInitials}>{initials}</span>
                        )}
                    </div>
                </div>

                <h1 className={profileStyles.fullName}>{profile.firstName} {profile.lastName}</h1>
                <button type="button" className={profileStyles.usernameBtn} onClick={onCopyUsername}>
                    @{profile.username}
                    {copiedUsername && <span className={profileStyles.copiedHint}>скопировано</span>}
                </button>
                <div className={profileStyles.rank}>Ранг: {profile.rank}</div>
                {profile.relationStatus !== 'self' && (
                    <button
                        type="button"
                        className={`${styles.friendActionBtn} ${profile.relationStatus === 'friend' ? styles.friendActionDanger : ''}`}
                        onClick={onFriendAction}
                        disabled={isFriendActionLoading}
                    >
                        {isFriendActionLoading && '...'}
                        {!isFriendActionLoading && profile.relationStatus === 'none' && 'Добавить в друзья'}
                        {!isFriendActionLoading && profile.relationStatus === 'pending_outgoing' && 'Отменить заявку'}
                        {!isFriendActionLoading && profile.relationStatus === 'pending_incoming' && 'Принять заявку'}
                        {!isFriendActionLoading && profile.relationStatus === 'friend' && 'Удалить из друзей'}
                    </button>
                )}
            </div>

            <div className={profileStyles.statsRow}>
                {stats.map((stat) => (
                    <button
                        key={stat.key}
                        type="button"
                        className={`${profileStyles.statBox} ${profileStyles.statBoxBtn}`}
                        onClick={() => setActiveStat(stat)}
                    >
                        <span className={profileStyles.statVal}>{stat.displayValue}</span>
                        <span className={profileStyles.statLabel}>{stat.label}</span>
                    </button>
                ))}
            </div>

            <div className={profileStyles.achievementsCard}>
                <h3>Достижения</h3>
                <div className={profileStyles.achList}>
                    {Array.isArray(profile.achievements) && profile.achievements.length > 0 ? (
                        profile.achievements.map((ach, i) => (
                            <div key={`${ach}-${i}`} className={profileStyles.achItem}>
                                <div className={profileStyles.bullet}></div>
                                <span>{ach}</span>
                            </div>
                        ))
                    ) : (
                        <p className={styles.empty}>Список достижений пуст</p>
                    )}
                </div>
            </div>

            {activeStat && (
                <div className={profileStyles.statModalOverlay} onClick={() => setActiveStat(null)}>
                    <div
                        className={profileStyles.statModal}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="public-stat-modal-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            className={profileStyles.statModalClose}
                            onClick={() => setActiveStat(null)}
                            aria-label="Закрыть"
                        >
                            ×
                        </button>
                        <div className={profileStyles.statModalValue}>{activeStat.displayValue}</div>
                        <h3 id="public-stat-modal-title" className={profileStyles.statModalTitle}>{activeStat.label}</h3>
                        <p className={profileStyles.statModalDescription}>{activeStat.description}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicProfilePage;
