import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import $api from '../../api/instance';
import { useStores } from '../../stores/StoreContext';
import profileStyles from './Profile.module.css';
import styles from './PublicProfilePage.module.css';
import CharacterPreviewCard from '../../components/CharacterPreviewCard/CharacterPreviewCard';
import { getAvatarFallbackStyle } from '../../utils/avatarAccentColor';

// Отрисовывает экран или компонент PublicProfilePage и связывает его с данными приложения.
const PublicProfilePage = () => {
    const { t } = useTranslation();
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
                    setError(e?.response?.data?.message || t('pages.public_profile.load_error'));
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
    const avatarFallbackStyle = useMemo(() => (
        getAvatarFallbackStyle(profile?.avatarAccentColor, `${profile?.username || ''}${initials}`)
    ), [profile?.avatarAccentColor, profile?.username, initials]);

    // Обрабатывает событие интерфейса пользователя.
    const onCopyUsername = async () => {
        const normalizedUsername = String(profile?.username || '').trim().replace(/^@+/, '');
        const value = normalizedUsername;
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            uiStore.showCopyToast(t('pages.profile.copy_toast'));
        } catch {
            // Игнорируем ошибки доступа к буферу обмена.
        }
    };

    const reloadProfile = async () => {
        const { data } = await $api.get(`/users/${encodeURIComponent(username || '')}/profile`);
        setProfile(data?.profile || null);
    };

    // Выполняет подтвержденное действие после проверки состояния.
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
                title: t('modals.error'),
                message: e?.response?.data?.message || t('modals.action_failed'),
                variant: 'error',
                secondaryLabel: t('common.close')
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
            primaryLabel: t('modals.yes'),
            secondaryLabel: t('modals.no'),
            onPrimary: async () => {
                uiStore.closeModal();
                await onConfirm();
            },
            onSecondary: () => uiStore.closeModal()
        });
    };

    // Обрабатывает событие интерфейса пользователя.
    const onFriendAction = async () => {
        if (!profile || isFriendActionLoading) return;
        if (isAdminViewer) {
            uiStore.showModal({
                title: t('pages.public_profile.unavailable'),
                message: t('pages.public_profile.admin_friend_block'),
                variant: 'info',
                secondaryLabel: t('common.close')
            });
            return;
        }

        if (profile.relationStatus === 'none') {
            showConfirmModal(t('pages.friends.modals.send_request_title'), t('pages.public_profile.send_request_message'), performFriendAction);
            return;
        }

        if (profile.relationStatus === 'pending_incoming') {
            showConfirmModal(t('pages.friends.modals.accept_request_title'), t('pages.friends.modals.accept_request_message'), performFriendAction);
            return;
        }

        if (profile.relationStatus === 'pending_outgoing') {
            showConfirmModal(t('pages.friends.modals.cancel_request_title'), t('pages.public_profile.cancel_request_message'), performFriendAction);
            return;
        }

        if (profile.relationStatus === 'friend') {
            showConfirmModal(t('pages.friends.modals.remove_friend_title'), t('pages.friends.modals.remove_friend_message'), performFriendAction);
            return;
        }

        await performFriendAction();
    };

    // Обрабатывает событие интерфейса пользователя.
    const onStartChat = async () => {
        if (!profile?._id || isChatActionLoading) return;
        if (isAdminViewer) {
            uiStore.showModal({
                title: t('pages.public_profile.unavailable'),
                message: t('pages.public_profile.admin_chat_block'),
                variant: 'info',
                secondaryLabel: t('common.close')
            });
            return;
        }

        if (profile.relationStatus !== 'friend') {
            uiStore.showModal({
                title: t('pages.public_profile.chat_unavailable'),
                message: t('pages.public_profile.chat_friend_only'),
                variant: 'info',
                secondaryLabel: t('common.close')
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
                title: t('modals.error'),
                message: e?.response?.data?.message || t('pages.public_profile.open_chat_failed'),
                variant: 'error',
                secondaryLabel: t('common.close')
            });
        } finally {
            setIsChatActionLoading(false);
        }
    };

    if (loading) return <div className={profileStyles.loader}>{t('pages.profile.loading')}</div>;

    if (notFound) {
        return (
            <div className={styles.stateWrap}>
                <h1>{t('pages.public_profile.not_found_title')}</h1>
                <p>{t('pages.public_profile.not_found_text')}</p>
                <div className={styles.stateActions}>
                    <Link to="/" className={styles.primaryBtn}>{t('pages.public_profile.home')}</Link>
                    <button type="button" className={styles.secondaryBtn} onClick={() => navigate(-1)}>{t('common.actions.back')}</button>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.stateWrap}>
                <h1>{t('modals.error')}</h1>
                <p>{error}</p>
                <div className={styles.stateActions}>
                    <Link to="/" className={styles.primaryBtn}>{t('pages.public_profile.home')}</Link>
                    <button type="button" className={styles.secondaryBtn} onClick={() => navigate(-1)}>{t('common.actions.back')}</button>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className={styles.stateWrap}>
                <h1>{t('pages.public_profile.not_found_title')}</h1>
                <p>{t('pages.public_profile.not_found_text')}</p>
                <div className={styles.stateActions}>
                    <Link to="/" className={styles.primaryBtn}>{t('pages.public_profile.home')}</Link>
                    <button type="button" className={styles.secondaryBtn} onClick={() => navigate(-1)}>{t('common.actions.back')}</button>
                </div>
            </div>
        );
    }

    const stats = [
        {
            key: 'streak',
            displayValue: String(profile.streak || 0),
            label: t('pages.profile.stats.streak'),
            description: t('pages.profile.stats.streak_desc')
        },
        {
            key: 'wordsWeek',
            displayValue: String(profile.wordsWeek || 0),
            label: t('pages.profile.stats.words_week'),
            description: t('pages.profile.stats.words_week_desc')
        },
        {
            key: 'wordsTotal',
            displayValue: String(profile.wordsTotal || 0),
            label: t('pages.profile.stats.words_total'),
            description: t('pages.profile.stats.words_total_desc')
        },
        {
            key: 'achievementsCount',
            displayValue: String(Array.isArray(profile.achievements) ? profile.achievements.length : 0),
            label: t('pages.profile.stats.achievements'),
            description: t('pages.profile.stats.achievements_desc')
        },
        {
            key: 'coins',
            displayValue: String(Number.isFinite(profile.coins) ? profile.coins : 0),
            label: t('pages.profile.stats.coins'),
            description: t('pages.profile.stats.coins_desc')
        }
    ];

    const totalPoints = Number(profile.totalPoints) || 0;
    const level = Math.floor(totalPoints / 10) + 1;
    const statByKey = Object.fromEntries(stats.map((s) => [s.key, s]));
    const statRows = [
        ['streak', 'wordsWeek', 'wordsTotal'],
        ['achievementsCount', 'coins']
    ];
    const profileAccentColor = profile.profileAccentColor || '';
    const isDarkTheme = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
    const headerTopBg = (() => {
        if (!profileAccentColor) return 'var(--color-bg-soft)';
        const hex = profileAccentColor.replace('#', '');
        if (hex.length !== 6) return profileAccentColor;
        const num = parseInt(hex, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        const delta = isDarkTheme ? 28 : -18;
        const clamp = (v) => Math.max(0, Math.min(255, v + delta));
        const toHex = (v) => clamp(v).toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    })();
    const headerTopTextColor = (() => {
        if (!profileAccentColor) return 'var(--color-text)';
        const hex = headerTopBg.replace('#', '');
        if (hex.length !== 6) return '#111111';
        const num = parseInt(hex, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.58 ? '#111111' : '#ffffff';
    })();

    return (
        <div className={profileStyles.container}>
            <div className={profileStyles.header}>
                <div className={profileStyles.headerSplit}>
                    <div
                        className={profileStyles.headerTop}
                        style={{ backgroundColor: headerTopBg, color: headerTopTextColor, '--profile-top-text': headerTopTextColor }}
                    >
                        <div className={profileStyles.avatarRow}>
                            <div
                                className={profileStyles.avatarCircle}
                                style={!avatarSrc ? avatarFallbackStyle : undefined}
                            >
                                {avatarSrc && !avatarLoadFailed ? (
                                    <img
                                        src={avatarSrc}
                                        alt={t('pages.profile.avatar_alt')}
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
                        <div className={profileStyles.rank}>{t('pages.profile.level', { level })}</div>
                    </div>

                    <div className={profileStyles.headerBottom}>
                        {!isAdminViewer && profile.relationStatus !== 'self' && (
                            <div className={styles.friendActionsRow}>
                                <button
                                    type="button"
                                    className={styles.chatActionBtn}
                                    onClick={onStartChat}
                                    disabled={isChatActionLoading}
                                >
                                    {isChatActionLoading ? '...' : t('pages.friends.chat')}
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.friendActionBtn} ${profile.relationStatus === 'friend' ? styles.friendActionDanger : ''}`}
                                    onClick={onFriendAction}
                                    disabled={isFriendActionLoading}
                                >
                                    {isFriendActionLoading && '...'}
                                    {!isFriendActionLoading && profile.relationStatus === 'none' && t('pages.public_profile.add_friend')}
                                    {!isFriendActionLoading && profile.relationStatus === 'pending_outgoing' && t('pages.public_profile.cancel_request')}
                                    {!isFriendActionLoading && profile.relationStatus === 'pending_incoming' && t('pages.public_profile.accept_request')}
                                    {!isFriendActionLoading && profile.relationStatus === 'friend' && t('pages.public_profile.remove_friend')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className={profileStyles.statsRows}>
                {statRows.map((row, rowIndex) => (
                    <div
                        key={`row-${rowIndex}`}
                        className={`${profileStyles.statsRow} ${row.length === 2 ? profileStyles.statsRowTwo : profileStyles.statsRowThree}`}
                    >
                        {row.map((key) => {
                            const stat = statByKey[key];
                            if (!stat) return null;
                            return (
                                <button
                                    key={stat.key}
                                    type="button"
                                    className={`${profileStyles.statBox} ${profileStyles.statBoxBtn}`}
                                    onClick={() => setActiveStat(stat)}
                                >
                                    <span className={profileStyles.statVal}>{stat.displayValue}</span>
                                    <span className={profileStyles.statLabel}>{stat.label}</span>
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>

            <CharacterPreviewCard customization={profile.characterCustomization} />

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
                            aria-label={t('common.close')}
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
