import React, { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Link, useNavigate } from 'react-router-dom';
import { useStores } from '../../stores/StoreContext';
import styles from './FriendsPage.module.css';

const FriendsPage = observer(() => {
    const { socialStore, chatStore, uiStore } = useStores();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [searchPage, setSearchPage] = useState(1);
    const [friendsPage, setFriendsPage] = useState(1);
    const [incomingPage, setIncomingPage] = useState(1);
    const [outgoingPage, setOutgoingPage] = useState(1);
    const [rankingPage, setRankingPage] = useState(1);
    const [companionPage, setCompanionPage] = useState(1);
    const [isCompanionModalOpen, setIsCompanionModalOpen] = useState(false);
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
        socialStore.loadFriendRanking(rankingPage, 10);
    }, [socialStore, rankingPage]);

    useEffect(() => {
        if (isCompanionModalOpen) {
            socialStore.loadCompanionRequests(companionPage, 10);
        }
    }, [socialStore, companionPage, isCompanionModalOpen]);

    useEffect(() => {
        socialStore.searchUsers(query, searchPage, 20);
    }, [query, searchPage, socialStore]);

    const getAvatarSrc = (avatarUrl) => {
        if (!avatarUrl) return '';
        if (avatarUrl.startsWith('http')) return avatarUrl;
        const apiBase = import.meta.env.VITE_API_URL || '';
        const serverBase = apiBase.replace(/\/api\/?$/, '');
        return `${serverBase}${avatarUrl}`;
    };

    const getInitials = (firstName, lastName) => {
        const first = (firstName || '').trim().charAt(0);
        const last = (lastName || '').trim().charAt(0);
        return `${first}${last}`.toUpperCase() || 'U';
    };

    const normalizedSearch = useMemo(
        () => (socialStore.searchResults || []).filter(Boolean),
        [socialStore.searchResults]
    );

    const onStartChat = async (friendId) => {
        const conversation = await chatStore.openOrCreateChat(friendId);
        if (conversation?._id) {
            navigate(`/chats?conversationId=${encodeURIComponent(String(conversation._id))}`);
        }
    };

    const onPublishCompanionRequest = async (e) => {
        e.preventDefault();
        await socialStore.publishCompanionRequest(companionPurpose, companionOther);
        setCompanionPage(1);
        setCompanionNotice('Заявка опубликована. Другие пользователи уже могут вас видеть.');
        uiStore.showModal({
            title: 'Готово',
            message: 'Заявка на поиск собеседника опубликована',
            variant: 'success',
            secondaryLabel: 'Закрыть'
        });
    };

    const onWithdrawCompanionRequest = async () => {
        await socialStore.withdrawCompanionRequest();
        setCompanionNotice('Вы отозвали заявку на поиск собеседника.');
    };

    const renderPagination = (pagination, onPageChange) => {
        if (!pagination || pagination.totalPages <= 1) return null;
        return (
            <div className={styles.pagination}>
                <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => onPageChange(pagination.page - 1)}
                >
                    Назад
                </button>
                <span>{pagination.page} / {pagination.totalPages}</span>
                <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => onPageChange(pagination.page + 1)}
                >
                    Вперед
                </button>
            </div>
        );
    };

    return (
        <>
        <div className={styles.container}>
            <h1 className={styles.title}>Друзья</h1>

            <div className={styles.findCompanionWrap}>
                <button
                    type="button"
                    className={styles.findCompanionBtn}
                    onClick={() => setIsCompanionModalOpen(true)}
                >
                    Найти собеседника для совместного обучения
                </button>
            </div>

            <section className={styles.card}>
                <h2>Поиск пользователей</h2>
                <input
                    className={styles.searchInput}
                    placeholder="Искать по username, имени или фамилии"
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
                                <div className={styles.avatar}>
                                    {user.avatarUrl ? (
                                        <img src={getAvatarSrc(user.avatarUrl)} alt={user.username} />
                                    ) : (
                                        <span>{getInitials(user.firstName, user.lastName)}</span>
                                    )}
                                </div>
                                <div className={styles.userMeta}>
                                    <strong>{user.firstName} {user.lastName}</strong>
                                    <span>@{user.username}</span>
                                </div>
                            </Link>
                            <div className={styles.rowActions}>
                                {user.relationStatus === 'friend' && <span className={styles.badge}>Уже друг</span>}
                                {user.relationStatus === 'pending_outgoing' && (
                                    <button type="button" onClick={() => socialStore.cancelRequest(user.requestId)}>Отменить</button>
                                )}
                                {user.relationStatus === 'pending_incoming' && (
                                    <>
                                        <button type="button" onClick={() => socialStore.acceptRequest(user.requestId)}>Принять</button>
                                        <button type="button" className={styles.ghost} onClick={() => socialStore.declineRequest(user.requestId)}>Отклонить</button>
                                    </>
                                )}
                                {user.relationStatus === 'none' && (
                                    <button type="button" onClick={() => socialStore.sendFriendRequest(user._id)}>Добавить</button>
                                )}
                            </div>
                        </div>
                    ))}
                    {!socialStore.isLoadingSearch && !normalizedSearch.length && (
                        <p className={styles.empty}>Ничего не найдено</p>
                    )}
                </div>
                {renderPagination(socialStore.searchPagination, setSearchPage)}
            </section>

            <section className={styles.gridTwo}>
                <div className={styles.card}>
                    <h2>Друзья</h2>
                    <div className={styles.list}>
                        {(socialStore.friends || []).map((friend) => (
                            <div key={friend._id} className={styles.userRow}>
                                <Link to={`/u/${encodeURIComponent(friend.username)}`} className={styles.userLeft}>
                                    <div className={styles.avatar}>
                                        {friend.avatarUrl ? (
                                            <img src={getAvatarSrc(friend.avatarUrl)} alt={friend.username} />
                                        ) : (
                                            <span>{getInitials(friend.firstName, friend.lastName)}</span>
                                        )}
                                    </div>
                                    <div className={styles.userMeta}>
                                        <strong>{friend.firstName} {friend.lastName}</strong>
                                        <span>{friend.totalPoints || 0} очков</span>
                                    </div>
                                </Link>
                                <div className={styles.rowActions}>
                                    <button type="button" onClick={() => onStartChat(friend._id)}>Чат</button>
                                    <button type="button" className={styles.ghost} onClick={() => socialStore.removeFriend(friend._id)}>Удалить</button>
                                </div>
                            </div>
                        ))}
                        {!socialStore.isLoadingFriends && !(socialStore.friends || []).length && (
                            <p className={styles.empty}>Пока нет друзей</p>
                        )}
                    </div>
                    {renderPagination(socialStore.friendsPagination, setFriendsPage)}
                </div>

                <div className={styles.card}>
                    <h2>Входящие заявки</h2>
                    <div className={styles.list}>
                        {(socialStore.incomingRequests || []).map((item) => (
                            <div key={item._id} className={styles.userRow}>
                                <div className={styles.userLeft}>
                                    <div className={styles.avatar}>
                                        {item.from.avatarUrl ? (
                                            <img src={getAvatarSrc(item.from.avatarUrl)} alt={item.from.username} />
                                        ) : (
                                            <span>{getInitials(item.from.firstName, item.from.lastName)}</span>
                                        )}
                                    </div>
                                    <div className={styles.userMeta}>
                                        <strong>{item.from.firstName} {item.from.lastName}</strong>
                                        <span>@{item.from.username}</span>
                                    </div>
                                </div>
                                <div className={styles.rowActions}>
                                    <button type="button" onClick={() => socialStore.acceptRequest(item._id)}>Принять</button>
                                    <button type="button" className={styles.ghost} onClick={() => socialStore.declineRequest(item._id)}>Отклонить</button>
                                </div>
                            </div>
                        ))}
                        {!socialStore.isLoadingRequests && !(socialStore.incomingRequests || []).length && (
                            <p className={styles.empty}>Нет входящих заявок</p>
                        )}
                    </div>
                    {renderPagination(socialStore.incomingPagination, setIncomingPage)}
                </div>
            </section>

            <section className={styles.gridTwo}>
                <div className={styles.card}>
                    <h2>Исходящие заявки</h2>
                    <div className={styles.list}>
                        {(socialStore.outgoingRequests || []).map((item) => (
                            <div key={item._id} className={styles.userRow}>
                                <div className={styles.userLeft}>
                                    <div className={styles.avatar}>
                                        {item.to.avatarUrl ? (
                                            <img src={getAvatarSrc(item.to.avatarUrl)} alt={item.to.username} />
                                        ) : (
                                            <span>{getInitials(item.to.firstName, item.to.lastName)}</span>
                                        )}
                                    </div>
                                    <div className={styles.userMeta}>
                                        <strong>{item.to.firstName} {item.to.lastName}</strong>
                                        <span>@{item.to.username}</span>
                                    </div>
                                </div>
                                <div className={styles.rowActions}>
                                    <button type="button" className={styles.ghost} onClick={() => socialStore.cancelRequest(item._id)}>Отменить</button>
                                </div>
                            </div>
                        ))}
                        {!socialStore.isLoadingRequests && !(socialStore.outgoingRequests || []).length && (
                            <p className={styles.empty}>Нет исходящих заявок</p>
                        )}
                    </div>
                    {renderPagination(socialStore.outgoingPagination, setOutgoingPage)}
                </div>

                <div className={styles.card}>
                    <h2>Рейтинг друзей</h2>
                    <div className={styles.list}>
                        {(socialStore.friendRanking || []).map((user, index) => (
                            <div key={user._id} className={styles.rankRow}>
                                <span>#{index + 1}</span>
                                <span>{user.firstName} {user.lastName}</span>
                                <strong>{user.totalPoints || 0}</strong>
                            </div>
                        ))}
                        {!socialStore.isLoadingRanking && !(socialStore.friendRanking || []).length && (
                            <p className={styles.empty}>Рейтинг друзей пока пуст</p>
                        )}
                    </div>
                    {renderPagination(socialStore.rankingPagination, setRankingPage)}
                </div>
            </section>
        </div>
        {isCompanionModalOpen && (
            <div className={styles.modalOverlay} onClick={() => setIsCompanionModalOpen(false)}>
                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <h3>Поиск собеседника</h3>
                    {companionNotice && <div className={styles.notice}>{companionNotice}</div>}
                    <form className={styles.modalForm} onSubmit={onPublishCompanionRequest}>
                        <label>
                            <span className={styles.fieldLabel}>Зачем ищете собеседника?</span>
                            <select
                                value={companionPurpose}
                                onChange={(e) => setCompanionPurpose(e.target.value)}
                            >
                                <option value="speech_practice">Для тренировки татарской речи</option>
                                <option value="competition">Для соревнования между собой</option>
                                <option value="course_together">Для совместного прохождения курса</option>
                                <option value="motivation">Для взаимной мотивации</option>
                                <option value="other">Другое</option>
                            </select>
                        </label>
                        {companionPurpose === 'other' && (
                            <label>
                                <span className={styles.fieldLabel}>Своя причина</span>
                                <input
                                    value={companionOther}
                                    onChange={(e) => setCompanionOther(e.target.value)}
                                    placeholder="Например: готовлюсь к собеседованию"
                                />
                            </label>
                        )}
                        <button type="submit" className={styles.primaryAction}>Опубликовать заявку</button>
                    </form>

                    {socialStore.myCompanionRequest?.isActive && (
                        <div className={styles.myRequestCard}>
                            <div className={styles.myRequestContent}>
                                <h4>Моя заявка</h4>
                                <p>{socialStore.myCompanionRequest.purposeLabel}</p>
                            </div>
                            <button type="button" className={styles.ghostAction} onClick={onWithdrawCompanionRequest}>
                                Отозвать заявку
                            </button>
                        </div>
                    )}

                    <div className={styles.modalList}>
                        <h4>Кто ищет собеседника</h4>
                        {(socialStore.companionRequests || []).map((item) => (
                            <div key={item._id} className={styles.userRow}>
                                <Link to={`/u/${encodeURIComponent(item.user.username)}`} className={styles.userLeft}>
                                    <div className={styles.avatar}>
                                        {item.user.avatarUrl ? (
                                            <img src={getAvatarSrc(item.user.avatarUrl)} alt={item.user.username} />
                                        ) : (
                                            <span>{getInitials(item.user.firstName, item.user.lastName)}</span>
                                        )}
                                    </div>
                                    <div className={styles.userMeta}>
                                        <strong>{item.user.firstName} {item.user.lastName}</strong>
                                        <span>{item.purposeLabel}</span>
                                    </div>
                                </Link>
                                <div className={styles.rowActions}>
                                    {item.relationStatus === 'friend' && <span className={styles.badge}>Уже друг</span>}
                                    {item.relationStatus === 'pending_outgoing' && (
                                        <button type="button" onClick={() => socialStore.cancelRequest(item.requestId)}>Отменить</button>
                                    )}
                                    {item.relationStatus === 'pending_incoming' && (
                                        <>
                                            <button type="button" onClick={() => socialStore.acceptRequest(item.requestId)}>Принять</button>
                                            <button type="button" className={styles.ghost} onClick={() => socialStore.declineRequest(item.requestId)}>Отклонить</button>
                                        </>
                                    )}
                                    {item.relationStatus === 'none' && (
                                        <button type="button" onClick={() => socialStore.sendFriendRequest(item.user._id)}>Добавить</button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {!socialStore.isLoadingCompanion && !(socialStore.companionRequests || []).length && (
                            <p className={styles.empty}>Пока никто не ищет собеседника</p>
                        )}
                        {renderPagination(socialStore.companionPagination, setCompanionPage)}
                    </div>
                </div>
            </div>
        )}
        </>
    );
});

export default FriendsPage;
