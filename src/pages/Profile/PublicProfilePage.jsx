import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import $api from '../../api/instance';
import { useStores } from '../../stores/StoreContext';
import profileStyles from './Profile.module.css';
import styles from './PublicProfilePage.module.css';

const PublicProfilePage = () => {
    const { chatStore, uiStore, authStore } = useStores();
    const { username } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState('');
    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
    const [activeStat, setActiveStat] = useState(null);
    const [isFriendActionLoading, setIsFriendActionLoading] = useState(false);
    const [isChatActionLoading, setIsChatActionLoading] = useState(false);
    const isAdminViewer = authStore.user?.role === 'admin';

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
        } catch {
            // Ignore clipboard permission errors.
        }
    };

    const reloadProfile = async () => {
        const { data } = await $api.get(`/users/${encodeURIComponent(username || '')}/profile`);
        setProfile(data?.profile || null);
    };

    const performFriendAction = async () => {
        if (!profile || isFriendActionLoading) return;
        if (isAdminViewer) return;

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
        } catch (e) {
            uiStore.showModal({
                title: 'Ошибка',
                message: e?.response?.data?.message || 'Не удалось выполнить действие',
                variant: 'error',
                secondaryLabel: 'Закрыть'
            });
        } finally {
            setIsFriendActionLoading(false);
        }
    };

    const showConfirmModal = (title, message, onConfirm) => {
        uiStore.showModal({
            title,
            message,
            variant: 'info',
            primaryLabel: 'Да',
            secondaryLabel: 'Нет',
            onPrimary: async () => {
                uiStore.closeModal();
                await onConfirm();
            },
            onSecondary: () => uiStore.closeModal()
        });
    };

    const onFriendAction = async () => {
        if (!profile || isFriendActionLoading) return;
        if (isAdminViewer) {
            uiStore.showModal({
                title: 'Недоступно',
                message: 'Администратор не может добавлять в друзья.',
                variant: 'info',
                secondaryLabel: 'Закрыть'
            });
            return;
        }

        if (profile.relationStatus === 'none') {
            showConfirmModal('Отправить заявку?', 'Отправить запрос в друзья этому пользователю?', performFriendAction);
            return;
        }

        if (profile.relationStatus === 'pending_incoming') {
            showConfirmModal('Принять заявку?', 'Подтвердить дружбу с этим пользователем?', performFriendAction);
            return;
        }

        if (profile.relationStatus === 'pending_outgoing') {
            showConfirmModal('Отменить заявку?', 'Отменить отправленную заявку в друзья?', performFriendAction);
            return;
        }

        if (profile.relationStatus === 'friend') {
            showConfirmModal('Удалить из друзей?', 'Пользователь будет удален из списка друзей.', performFriendAction);
            return;
        }

        await performFriendAction();
    };

    const onStartChat = async () => {
        if (!profile?._id || isChatActionLoading) return;
        if (isAdminViewer) {
            uiStore.showModal({
                title: 'Недоступно',
                message: 'Администратор не может открывать личные чаты.',
                variant: 'info',
                secondaryLabel: 'Закрыть'
            });
            return;
        }

        if (profile.relationStatus !== 'friend') {
            uiStore.showModal({
                title: 'Чат недоступен',
                message: 'Чат можно открыть только после добавления в друзья.',
                variant: 'info',
                secondaryLabel: 'Закрыть'
            });
            return;
        }

        setIsChatActionLoading(true);
        try {
            let conversation = await chatStore.openOrCreateChat(profile._id);

            if (!conversation?._id) {
                const { data } = await $api.get('/chats', { params: { page: 1, limit: 50 } });
                conversation = (data?.items || []).find((item) => String(item?.otherUser?._id) === String(profile._id)) || null;
            }

            if (!conversation?._id) {
                throw new Error('chat_not_found');
            }

            navigate(`/chats?conversationId=${encodeURIComponent(String(conversation._id))}`);
        } catch (e) {
            uiStore.showModal({
                title: 'Ошибка',
                message: e?.response?.data?.message || 'Не удалось открыть чат',
                variant: 'error',
                secondaryLabel: 'Закрыть'
            });
        } finally {
            setIsChatActionLoading(false);
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
                </button>
                <div className={profileStyles.rank}>Ранг: {profile.rank}</div>
                {!isAdminViewer && profile.relationStatus !== 'self' && (
                    <div className={styles.friendActionsRow}>
                        <button
                            type="button"
                            className={styles.chatActionBtn}
                            onClick={onStartChat}
                            disabled={isChatActionLoading}
                        >
                            {isChatActionLoading ? '...' : 'Чат'}
                        </button>
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
                    </div>
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
