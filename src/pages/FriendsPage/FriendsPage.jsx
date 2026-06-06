import React, { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStores } from '../../stores/StoreContext';
import AppAvatar from '../../components/AppAvatar/AppAvatar';
import styles from './FriendsPage.module.css';

// Отрисовывает экран или компонент FriendsPage и связывает его с данными приложения.
const FriendsPage = observer(() => {
    const { t } = useTranslation();
    const { socialStore, chatStore, uiStore } = useStores();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [searchPage, setSearchPage] = useState(1);
    const [friendsPage, setFriendsPage] = useState(1);
    const [incomingPage, setIncomingPage] = useState(1);
    const [outgoingPage, setOutgoingPage] = useState(1);
    const [companionPage, setCompanionPage] = useState(1);
    const [isCompanionModalOpen, setIsCompanionModalOpen] = useState(false);
    const [requestsModalType, setRequestsModalType] = useState('');
    const [companionPurpose, setCompanionPurpose] = useState('speech_practice');
    const [companionOther, setCompanionOther] = useState('');
    const [companionNotice, setCompanionNotice] = useState('');

    useEffect(() => {
        socialStore.loadFriends(friendsPage, 10);
    }, [socialStore, friendsPage]);

    useEffect(() => {
        socialStore.loadIncomingRequests(incomingPage, 10);
    }, [socialStore, incomingPage]);

    useEffect(() => {
        socialStore.loadOutgoingRequests(outgoingPage, 10);
    }, [socialStore, outgoingPage]);

    useEffect(() => {
        if (isCompanionModalOpen) {
            socialStore.loadCompanionRequests(companionPage, 10);
        }
    }, [socialStore, companionPage, isCompanionModalOpen]);

    useEffect(() => {
        const timer = setTimeout(() => {
            socialStore.searchUsers(query, searchPage, 10);
        }, 350);
        return () => clearTimeout(timer);
    }, [query, searchPage, socialStore]);

    const getAvatarSrc = (avatarUrl) => {
        if (!avatarUrl) return '';
        if (avatarUrl.startsWith('http')) return avatarUrl;
        const apiBase = import.meta.env.VITE_API_URL || '';
        const serverBase = apiBase.replace(/\/api\/?$/, '');
        return `${serverBase}${avatarUrl}`;
    };

    const normalizedSearch = useMemo(
        () => (socialStore.searchResults || []).filter(Boolean),
        [socialStore.searchResults]
    );

    const showActionConfirm = (title, message, onConfirm) => {
        uiStore.showModal({
            title,
            message,
            variant: 'info',
            primaryLabel: t('modals.yes'),
            secondaryLabel: t('modals.no'),
            onPrimary: async () => {
                try {
                    await onConfirm();
                    uiStore.closeModal();
                } catch (e) {
                    uiStore.showModal({
                        title: t('modals.error'),
                        message: e?.response?.data?.message || t('modals.action_failed'),
                        variant: 'error',
                        secondaryLabel: t('common.close')
                    });
                }
            },
            onSecondary: () => uiStore.closeModal()
        });
    };

    // Обрабатывает событие интерфейса пользователя.
    const onSendFriendRequest = (userId) => {
        showActionConfirm(
            t('pages.friends.modals.send_request_title'),
            t('pages.friends.modals.send_request_message'),
            () => socialStore.sendFriendRequest(userId)
        );
    };

    // Обрабатывает событие интерфейса пользователя.
    const onAcceptRequest = (requestId) => {
        showActionConfirm(
            t('pages.friends.modals.accept_request_title'),
            t('pages.friends.modals.accept_request_message'),
            () => socialStore.acceptRequest(requestId)
        );
    };

    // Обрабатывает событие интерфейса пользователя.
    const onRemoveFriend = (friendUserId) => {
        showActionConfirm(
            t('pages.friends.modals.remove_friend_title'),
            t('pages.friends.modals.remove_friend_message'),
            () => socialStore.removeFriend(friendUserId)
        );
    };

    // Обрабатывает событие интерфейса пользователя.
    const onCancelRequest = (requestId) => {
        showActionConfirm(
            t('pages.friends.modals.cancel_request_title'),
            t('pages.friends.modals.cancel_request_message'),
            () => socialStore.cancelRequest(requestId)
        );
    };

    // Обрабатывает событие интерфейса пользователя.
    const onStartChat = async (friendId) => {
        const conversation = await chatStore.openOrCreateChat(friendId);
        if (conversation?._id) {
            navigate(`/chats?conversationId=${encodeURIComponent(String(conversation._id))}`);
        }
    };

    // Обрабатывает событие интерфейса пользователя.
    const onPublishCompanionRequest = async (e) => {
        e.preventDefault();
        await socialStore.publishCompanionRequest(companionPurpose, companionOther);
        setCompanionPage(1);
        setCompanionNotice(t('pages.friends.modals.companion_published_notice'));
        uiStore.showModal({
            title: t('modals.done'),
            message: t('pages.friends.modals.companion_published_message'),
            variant: 'success',
            secondaryLabel: t('common.close')
        });
    };

    // Обрабатывает событие интерфейса пользователя.
    const onWithdrawCompanionRequest = async () => {
        await socialStore.withdrawCompanionRequest();
        setCompanionNotice(t('pages.friends.modals.companion_withdrawn_notice'));
    };

    // Формирует повторяемый фрагмент интерфейса.
    const renderPagination = (pagination, onPageChange) => {
        if (!pagination || pagination.totalPages <= 1) return null;
        return (
            <div className={styles.pagination}>
                <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => onPageChange(pagination.page - 1)}
                >
                    ←
                </button>
                <span>{pagination.page} / {pagination.totalPages}</span>
                <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => onPageChange(pagination.page + 1)}
                >
                    →
                </button>
            </div>
        );
    };

    return (
        <>
        <div className={`${styles.container} app-page-shell`}>
            <div className="app-page-top">
                <h1 className={`${styles.title} app-page-title`}>{t('pages.friends.title')}</h1>
            </div>

            <section className={styles.card}>
                <h2>{t('pages.friends.title')}</h2>
                <div className={styles.list}>
                    {(socialStore.friends || []).map((friend) => (
                        <div key={friend._id} className={styles.userRow}>
                            <Link to={`/u/${encodeURIComponent(friend.username)}`} className={styles.userLeft}>
                                <AppAvatar
                                    src={getAvatarSrc(friend.avatarUrl)}
                                    fullName={`${friend.firstName || ''} ${friend.lastName || ''}`.trim()}
                                    className={styles.avatar}
                                    style={!friend.avatarUrl && friend.avatarAccentColor ? { backgroundColor: friend.avatarAccentColor } : undefined}
                                />
                                <div className={styles.userMeta}>
                                    <strong>{friend.firstName} {friend.lastName}</strong>
                                    <span>{t('pages.friends.points', { count: friend.totalPoints || 0 })}</span>
                                </div>
                            </Link>
                            <div className={styles.rowActions}>
                                <button type="button" onClick={() => onStartChat(friend._id)}>{t('pages.friends.chat')}</button>
                                <button type="button" className={styles.ghost} onClick={() => onRemoveFriend(friend._id)}>{t('pages.friends.delete')}</button>
                            </div>
                        </div>
                    ))}
                    {!socialStore.isLoadingFriends && !(socialStore.friends || []).length && (
                        <p className={styles.empty}>{t('pages.friends.empty_friends')}</p>
                    )}
                </div>
                {renderPagination(socialStore.friendsPagination, setFriendsPage)}
            </section>

            <section className={styles.gridTwo}>
                <button type="button" className={`${styles.card} ${styles.requestTypeBtn}`} onClick={() => setRequestsModalType('incoming')}>
                    <span className={styles.requestTypeTextCol}>
                        <h2>{t('pages.friends.incoming')}</h2>
                        <p className={styles.requestTypeHint}>{t('pages.friends.incoming_hint')}</p>
                    </span>
                    <strong className={styles.requestTypeCount}>{socialStore.incomingPagination?.total || 0}</strong>
                </button>

                <button type="button" className={`${styles.card} ${styles.requestTypeBtn}`} onClick={() => setRequestsModalType('outgoing')}>
                    <span className={styles.requestTypeTextCol}>
                        <h2>{t('pages.friends.outgoing')}</h2>
                        <p className={styles.requestTypeHint}>{t('pages.friends.outgoing_hint')}</p>
                    </span>
                    <strong className={styles.requestTypeCount}>{socialStore.outgoingPagination?.total || 0}</strong>
                </button>
            </section>

            <div className={styles.findCompanionWrap}>
                <button
                    type="button"
                    className={styles.findCompanionBtn}
                    onClick={() => setIsCompanionModalOpen(true)}
                >
                    {t('pages.friends.find_companion')}
                </button>
            </div>

            <section className={styles.card}>
                <h2>{t('pages.friends.search_title')}</h2>
                <input
                    className={styles.searchInput}
                    placeholder={t('pages.friends.search_placeholder')}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setSearchPage(1);
                    }}
                />
                <div className={styles.list}>
                    {normalizedSearch.map((user) => (
                        <div key={user._id} className={styles.userRow}>
                            <Link to={`/u/${encodeURIComponent(user.username)}`} className={styles.userLeft}>
                                <AppAvatar
                                    src={getAvatarSrc(user.avatarUrl)}
                                    fullName={`${user.firstName || ''} ${user.lastName || ''}`.trim()}
                                    className={styles.avatar}
                                    style={!user.avatarUrl && user.avatarAccentColor ? { backgroundColor: user.avatarAccentColor } : undefined}
                                />
                                <div className={styles.userMeta}>
                                    <strong>{user.firstName} {user.lastName}</strong>
                                    <span>@{user.username}</span>
                                </div>
                            </Link>
                            <div className={styles.rowActions}>
                                {user.relationStatus === 'friend' && <span className={styles.badge}>{t('pages.friends.badge_friends')}</span>}
                                {user.relationStatus === 'pending_outgoing' && (
                                    <button type="button" onClick={() => onCancelRequest(user.requestId)}>{t('pages.friends.cancel')}</button>
                                )}
                                {user.relationStatus === 'pending_incoming' && (
                                    <>
                                        <button type="button" onClick={() => onAcceptRequest(user.requestId)}>{t('pages.friends.accept')}</button>
                                        <button type="button" className={styles.ghost} onClick={() => socialStore.declineRequest(user.requestId)}>{t('pages.friends.decline')}</button>
                                    </>
                                )}
                                {user.relationStatus === 'none' && (
                                    <button type="button" onClick={() => onSendFriendRequest(user._id)}>{t('pages.friends.add')}</button>
                                )}
                            </div>
                        </div>
                    ))}
                    {!socialStore.isLoadingSearch && !normalizedSearch.length && (
                        <p className={styles.empty}>{t('pages.friends.not_found')}</p>
                    )}
                </div>
                {renderPagination(socialStore.searchPagination, setSearchPage)}
            </section>
        </div>
        {isCompanionModalOpen && (
            <div className={styles.modalOverlay} onClick={() => setIsCompanionModalOpen(false)}>
                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <h3>{t('pages.friends.companion_title')}</h3>
                    {companionNotice && <div className={styles.notice}>{companionNotice}</div>}
                    <form className={styles.modalForm} onSubmit={onPublishCompanionRequest}>
                        <div className={styles.publishRow}>
                            <label className={styles.publishField}>
                                <span className={styles.fieldLabel}>{t('pages.friends.companion_reason')}</span>
                                <select
                                    value={companionPurpose}
                                    onChange={(e) => setCompanionPurpose(e.target.value)}
                                >
                                    <option value="speech_practice">{t('pages.friends.companion_speech')}</option>
                                    <option value="competition">{t('pages.friends.companion_competition')}</option>
                                    <option value="course_together">{t('pages.friends.companion_course')}</option>
                                    <option value="motivation">{t('pages.friends.companion_motivation')}</option>
                                    <option value="other">{t('pages.friends.companion_other')}</option>
                                </select>
                            </label>
                            <button type="submit" className={styles.primaryAction}>{t('pages.friends.publish_request')}</button>
                        </div>
                        {companionPurpose === 'other' && (
                            <label>
                                <span className={styles.fieldLabel}>{t('pages.friends.custom_reason')}</span>
                                <input
                                    value={companionOther}
                                    onChange={(e) => setCompanionOther(e.target.value)}
                                    placeholder={t('pages.friends.custom_reason_placeholder')}
                                />
                            </label>
                        )}
                    </form>

                    {socialStore.myCompanionRequest?.isActive && (
                        <>
                            <h4 className={styles.sectionTitle}>{t('pages.friends.my_requests')}</h4>
                            <div className={styles.myRequestCard}>
                                <div className={styles.myRequestContent}>
                                    <p>{socialStore.myCompanionRequest.purposeLabel}</p>
                                </div>
                                <button type="button" className={styles.ghostAction} onClick={onWithdrawCompanionRequest}>
                                    {t('pages.friends.withdraw_request')}
                                </button>
                            </div>
                        </>
                    )}

                    <div className={styles.modalList}>
                        <h4 className={styles.sectionTitle}>{t('pages.friends.other_requests')}</h4>
                        {(socialStore.companionRequests || []).map((item) => (
                            <div key={item._id} className={styles.userRow}>
                                <Link to={`/u/${encodeURIComponent(item.user.username)}`} className={styles.userLeft}>
                                    <AppAvatar
                                        src={getAvatarSrc(item.user.avatarUrl)}
                                        fullName={`${item.user.firstName || ''} ${item.user.lastName || ''}`.trim()}
                                        className={styles.avatar}
                                        style={!item.user.avatarUrl && item.user.avatarAccentColor ? { backgroundColor: item.user.avatarAccentColor } : undefined}
                                    />
                                    <div className={styles.userMeta}>
                                        <strong>{item.user.firstName} {item.user.lastName}</strong>
                                        <span>{item.purposeLabel}</span>
                                    </div>
                                </Link>
                                <div className={styles.rowActions}>
                                    {item.relationStatus === 'friend' && <span className={styles.badge}>{t('pages.friends.badge_friends')}</span>}
                                    {item.relationStatus === 'pending_outgoing' && (
                                        <button type="button" onClick={() => onCancelRequest(item.requestId)}>{t('pages.friends.cancel')}</button>
                                    )}
                                    {item.relationStatus === 'pending_incoming' && (
                                        <>
                                            <button type="button" onClick={() => onAcceptRequest(item.requestId)}>{t('pages.friends.accept')}</button>
                                            <button type="button" className={styles.ghost} onClick={() => socialStore.declineRequest(item.requestId)}>{t('pages.friends.decline')}</button>
                                        </>
                                    )}
                                    {item.relationStatus === 'none' && (
                                        <button type="button" onClick={() => onSendFriendRequest(item.user._id)}>{t('pages.friends.add')}</button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {!socialStore.isLoadingCompanion && !(socialStore.companionRequests || []).length && (
                            <p className={styles.empty}>{t('pages.friends.empty_companion')}</p>
                        )}
                        {renderPagination(socialStore.companionPagination, setCompanionPage)}
                    </div>
                </div>
            </div>
        )}
        {requestsModalType === 'incoming' && (
            <div className={styles.modalOverlay} onClick={() => setRequestsModalType('')}>
                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <h3>{t('pages.friends.incoming')}</h3>
                    <div className={styles.list}>
                        {(socialStore.incomingRequests || []).map((item) => (
                            <div key={item._id} className={styles.userRow}>
                                <div className={styles.userLeft}>
                                    <AppAvatar
                                        src={getAvatarSrc(item.from.avatarUrl)}
                                        fullName={`${item.from.firstName || ''} ${item.from.lastName || ''}`.trim()}
                                        className={styles.avatar}
                                        style={!item.from.avatarUrl && item.from.avatarAccentColor ? { backgroundColor: item.from.avatarAccentColor } : undefined}
                                    />
                                    <div className={styles.userMeta}>
                                        <strong>{item.from.firstName} {item.from.lastName}</strong>
                                        <span>@{item.from.username}</span>
                                    </div>
                                </div>
                                <div className={styles.rowActions}>
                                    <button type="button" onClick={() => onAcceptRequest(item._id)}>{t('pages.friends.accept')}</button>
                                    <button type="button" className={styles.ghost} onClick={() => socialStore.declineRequest(item._id)}>{t('pages.friends.decline')}</button>
                                </div>
                            </div>
                        ))}
                        {!socialStore.isLoadingRequests && !(socialStore.incomingRequests || []).length && (
                            <p className={styles.empty}>{t('pages.friends.empty_incoming')}</p>
                        )}
                    </div>
                    {renderPagination(socialStore.incomingPagination, setIncomingPage)}
                </div>
            </div>
        )}
        {requestsModalType === 'outgoing' && (
            <div className={styles.modalOverlay} onClick={() => setRequestsModalType('')}>
                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <h3>{t('pages.friends.outgoing')}</h3>
                    <div className={styles.list}>
                        {(socialStore.outgoingRequests || []).map((item) => (
                            <div key={item._id} className={styles.userRow}>
                                <Link to={`/u/${encodeURIComponent(item.to.username)}`} className={styles.userLeft}>
                                    <AppAvatar
                                        src={getAvatarSrc(item.to.avatarUrl)}
                                        fullName={`${item.to.firstName || ''} ${item.to.lastName || ''}`.trim()}
                                        className={styles.avatar}
                                        style={!item.to.avatarUrl && item.to.avatarAccentColor ? { backgroundColor: item.to.avatarAccentColor } : undefined}
                                    />
                                    <div className={styles.userMeta}>
                                        <strong>{item.to.firstName} {item.to.lastName}</strong>
                                        <span>@{item.to.username}</span>
                                    </div>
                                </Link>
                                <div className={styles.rowActions}>
                                    <button type="button" className={styles.ghost} onClick={() => onCancelRequest(item._id)}>{t('pages.friends.cancel')}</button>
                                </div>
                            </div>
                        ))}
                        {!socialStore.isLoadingRequests && !(socialStore.outgoingRequests || []).length && (
                            <p className={styles.empty}>{t('pages.friends.empty_outgoing')}</p>
                        )}
                    </div>
                    {renderPagination(socialStore.outgoingPagination, setOutgoingPage)}
                </div>
            </div>
        )}
        </>
    );
});

export default FriendsPage;
