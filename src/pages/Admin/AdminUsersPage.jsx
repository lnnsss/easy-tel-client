import React, { useCallback, useEffect, useState } from 'react';
import AdminService from '../../services/AdminService';
import { useStores } from '../../stores/StoreContext';
import styles from './AdminUsersPage.module.css';

const formatDate = (dateValue) => {
    if (!dateValue) return '—';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('ru-RU');
};

const requestStatusLabel = (status) => {
    if (status === 'pending') return 'На рассмотрении';
    if (status === 'approved') return 'Одобрена';
    if (status === 'rejected') return 'Отклонена';
    return '—';
};

const roleLabel = (role) => {
    if (role === 'admin') return 'Админ';
    if (role === 'author') return 'Автор';
    return 'Пользователь';
};

const EDUCATION_LEVEL_LABEL = {
    secondary: 'Среднее образование',
    college: 'СПО / колледж',
    bachelor: 'Бакалавр',
    master_specialist: 'Магистр / специалист',
    phd: 'Аспирантура / докторская степень',
    other: 'Другое'
};

const TATAR_LEVEL_LABEL = {
    a0: 'A0 (нулевой)',
    a1: 'A1',
    a2: 'A2',
    b1: 'B1',
    b2: 'B2',
    c1: 'C1',
    c2: 'C2',
    native: 'Носитель'
};

const TEACHING_LEVEL_LABEL = {
    epg_phase_1: 'EPG Фаза 1 — начинающий преподаватель',
    epg_phase_2: 'EPG Фаза 2 — базовая практика преподавания',
    epg_phase_3: 'EPG Фаза 3 — самостоятельный преподаватель',
    epg_phase_4: 'EPG Фаза 4 — уверенный практик',
    epg_phase_5: 'EPG Фаза 5 — продвинутый наставник',
    epg_phase_6: 'EPG Фаза 6 — эксперт / лидер'
};

const AdminUsersPage = () => {
    const { uiStore } = useStores();
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(false);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [isRequestsOpen, setIsRequestsOpen] = useState(false);
    const [requestsPage, setRequestsPage] = useState(1);
    const [requestsTotalPages, setRequestsTotalPages] = useState(1);
    const [error, setError] = useState('');
    const [authorRequests, setAuthorRequests] = useState([]);
    const [filters, setFilters] = useState({
        role: '',
        sortBy: 'createdAt',
        sortOrder: 'desc'
    });
    const [roleModal, setRoleModal] = useState({
        isOpen: false,
        user: null,
        role: 'user'
    });
    const [reviewModal, setReviewModal] = useState({
        isOpen: false,
        user: null,
        request: null,
        adminComment: ''
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 350);

        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        setPage(1);
    }, [filters]);

    const fetchAuthorRequests = useCallback(async () => {
        try {
            setRequestsLoading(true);
            const { data } = await AdminService.getAuthorRequests(requestsPage, '', '', 10);
            setAuthorRequests(data?.items || []);
            setRequestsTotalPages(data?.totalPages || 1);
        } catch {
            setAuthorRequests([]);
            setRequestsTotalPages(1);
        } finally {
            setRequestsLoading(false);
        }
    }, [requestsPage]);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const { data } = await AdminService.getUsers({
                page,
                search: debouncedSearch,
                limit: 10,
                ...filters
            });
            setUsers(data.users || []);
            setTotalPages(data.totalPages || 1);
            setTotalItems(data.totalItems || 0);
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка загрузки пользователей');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, filters]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        fetchAuthorRequests();
    }, [fetchAuthorRequests]);

    useEffect(() => {
        setRequestsPage(1);
    }, [isRequestsOpen]);

    const handleCopyText = async (value) => {
        const normalizedValue = String(value || '').trim();
        if (!normalizedValue) return;
        try {
            await navigator.clipboard.writeText(normalizedValue);
        } catch {
            // Ignore clipboard permission errors.
        }
    };

    const handleDeleteUser = (user) => {
        uiStore.showModal({
            title: 'Удалить пользователя?',
            message: `Будут удалены пользователь и его слова: ${user.firstName} ${user.lastName} (${user.email})`,
            variant: 'error',
            primaryLabel: 'Удалить',
            secondaryLabel: 'Отмена',
            onPrimary: async () => {
                try {
                    await AdminService.deleteUser(user._id);
                    uiStore.closeModal();
                    await fetchUsers();
                } catch (err) {
                    uiStore.showModal({
                        title: 'Ошибка',
                        message: err.response?.data?.message || 'Ошибка удаления пользователя',
                        variant: 'error',
                        secondaryLabel: 'Закрыть'
                    });
                }
            }
        });
    };

    const handleRoleUpdate = async (user, nextRole) => {
        await AdminService.updateUserRole(user._id, nextRole);
        await fetchUsers();
        await fetchAuthorRequests();
    };

    const handleReviewRequest = async (user, decision, adminComment = '') => {
        const requestId = reviewModal.request?._id || user.latestAuthorRequest?.requestId;
        if (!requestId) return;
        await AdminService.reviewAuthorRequest(requestId, decision, adminComment);
        await fetchUsers();
        await fetchAuthorRequests();
    };

    const openRoleModal = (user) => {
        setRoleModal({
            isOpen: true,
            user,
            role: user.role || 'user'
        });
    };

    const closeRoleModal = () => {
        setRoleModal({
            isOpen: false,
            user: null,
            role: 'user'
        });
    };

    const confirmRoleUpdate = () => {
        if (!roleModal.user) return;
        const targetUser = roleModal.user;
        const nextRole = roleModal.role;
        const oldRoleLabel = roleLabel(targetUser.role);
        const nextRoleLabel = roleLabel(nextRole);
        uiStore.showModal({
            title: 'Подтвердить смену роли?',
            message: `${targetUser.firstName} ${targetUser.lastName}: ${oldRoleLabel} → ${nextRoleLabel}`,
            variant: 'info',
            primaryLabel: 'Подтвердить',
            secondaryLabel: 'Отмена',
            onPrimary: async () => {
                uiStore.closeModal();
                try {
                    await handleRoleUpdate(targetUser, nextRole);
                    closeRoleModal();
                } catch (err) {
                    uiStore.showModal({
                        title: 'Ошибка',
                        message: err.response?.data?.message || 'Не удалось изменить роль',
                        variant: 'error',
                        secondaryLabel: 'Закрыть'
                    });
                }
            },
            onSecondary: () => uiStore.closeModal()
        });
    };

    const openReviewModal = (user, requestFromList = null) => {
        const request = requestFromList
            || authorRequests.find((item) => String(item._id) === String(user.latestAuthorRequest?.requestId))
            || null;
        setReviewModal({
            isOpen: true,
            user,
            request,
            adminComment: ''
        });
    };

    const closeReviewModal = () => {
        setReviewModal({
            isOpen: false,
            user: null,
            request: null,
            adminComment: ''
        });
    };

    const confirmReviewRequest = (decision) => {
        if (!reviewModal.user) return;
        const targetUser = reviewModal.user;
        const title = decision === 'approved' ? 'Подтвердить одобрение заявки?' : 'Подтвердить отклонение заявки?';
        const message = `Заявка пользователя ${targetUser.firstName} ${targetUser.lastName} будет ${decision === 'approved' ? 'одобрена' : 'отклонена'}.`;
        uiStore.showModal({
            title,
            message,
            variant: decision === 'approved' ? 'success' : 'error',
            primaryLabel: 'Подтвердить',
            secondaryLabel: 'Отмена',
            onPrimary: async () => {
                uiStore.closeModal();
                try {
                    await handleReviewRequest(targetUser, decision, reviewModal.adminComment);
                    closeReviewModal();
                } catch (err) {
                    uiStore.showModal({
                        title: 'Ошибка',
                        message: err.response?.data?.message || 'Не удалось рассмотреть заявку',
                        variant: 'error',
                        secondaryLabel: 'Закрыть'
                    });
                }
            },
            onSecondary: () => uiStore.closeModal()
        });
    };

    const renderPagination = () => {
        const buttons = [];
        for (let i = 1; i <= totalPages; i += 1) {
            if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
                buttons.push(
                    <button
                        key={i}
                        className={page === i ? styles.activePage : styles.pageBtn}
                        onClick={() => setPage(i)}
                    >
                        {i}
                    </button>
                );
            }
        }
        return buttons;
    };

    const renderRequestsPagination = () => {
        const buttons = [];
        for (let i = 1; i <= requestsTotalPages; i += 1) {
            if (i === 1 || i === requestsTotalPages || (i >= requestsPage - 2 && i <= requestsPage + 2)) {
                buttons.push(
                    <button
                        key={`r-${i}`}
                        className={requestsPage === i ? styles.activePage : styles.pageBtn}
                        onClick={() => setRequestsPage(i)}
                    >
                        {i}
                    </button>
                );
            }
        }
        return buttons;
    };

    return (
        <div className={`${styles.page} app-page-shell`}>
            <header className={`${styles.header} app-page-top`}>
                <div>
                    <h1 className="app-page-title">Админ: пользователи</h1>
                    <p className="app-page-subtitle">Управление пользователями. Всего: <strong>{totalItems}</strong></p>
                </div>
                <input
                    type="text"
                    className={styles.search}
                    placeholder="Поиск по email, имени, username..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </header>

            <section className={styles.filterPanel}>
                <select value={filters.role} onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}>
                    <option value="">Все</option>
                    <option value="admin">Администраторы</option>
                    <option value="author">Авторы</option>
                    <option value="user">Пользователи</option>
                </select>
                <select value={filters.sortBy} onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}>
                    <option value="createdAt">Сортировка: дата регистрации</option>
                    <option value="totalPoints">Сортировка: очки</option>
                    <option value="latestRequestAt">Сортировка: обновление заявки</option>
                </select>
                <select value={filters.sortOrder} onChange={(e) => setFilters((prev) => ({ ...prev, sortOrder: e.target.value }))}>
                    <option value="desc">По убыванию</option>
                    <option value="asc">По возрастанию</option>
                </select>
            </section>

            {error && <div className={styles.error}>{error}</div>}

            <section className={styles.card}>
                <button
                    type="button"
                    className={styles.requestsToggle}
                    onClick={() => setIsRequestsOpen((prev) => !prev)}
                >
                    <span>Заявки на авторство</span>
                    <span className={`${styles.toggleChevron} ${isRequestsOpen ? styles.toggleChevronOpen : ''}`}>▾</span>
                </button>
                {isRequestsOpen && (
                    <>
                        <div className={styles.requestsList}>
                            {authorRequests.map((request) => (
                                <article key={request._id} className={styles.requestCard}>
                                    <div className={styles.requestHeader}>
                                        <div className={styles.requestIdentity}>
                                            <strong>{request.userId?.firstName} {request.userId?.lastName}</strong>
                                            <button
                                                type="button"
                                                className={styles.usernameBtn}
                                                onClick={() => handleCopyText(String(request.userId?.username || '').replace(/^@+/, ''))}
                                            >
                                                @{request.userId?.username}
                                            </button>
                                        </div>
                                        <span className={styles.badge}>{requestStatusLabel(request.status)}</span>
                                    </div>
                                    <p className={styles.requestMeta}>Email: {request.userId?.email || '—'}</p>
                                    <p className={styles.requestMeta}>Дата: {formatDate(request.createdAt)}</p>
                                    {request.status === 'pending' && (
                                        <button
                                            type="button"
                                            className={styles.actionBtn}
                                            onClick={() => openReviewModal({
                                                _id: request.userId?._id,
                                                firstName: request.userId?.firstName,
                                                lastName: request.userId?.lastName,
                                                email: request.userId?.email,
                                                latestAuthorRequest: { requestId: request._id }
                                            }, request)}
                                        >
                                            Рассмотреть заявку
                                        </button>
                                    )}
                                </article>
                            ))}
                            {!requestsLoading && authorRequests.length === 0 && (
                                <div className={styles.empty}>Заявок пока нет</div>
                            )}
                        </div>
                        {requestsTotalPages > 1 && (
                            <div className={styles.pagination}>{renderRequestsPagination()}</div>
                        )}
                    </>
                )}
            </section>

            <section className={`${styles.card} ${styles.usersCard}`}>
                <div className={styles.tableHead}>
                    <span>Пользователь</span>
                    <span>Email</span>
                    <span>Роль</span>
                    <span>Очки</span>
                    <span>Дата</span>
                    <span className={styles.actionsHead}>Действия</span>
                </div>

                <div className={styles.tableBody}>
                    {users.map((user) => (
                        <div key={user._id} className={styles.row}>
                            <div>
                                <strong>{user.firstName} {user.lastName}</strong>
                                <button type="button" className={styles.usernameBtn} onClick={() => handleCopyText(String(user.username || '').replace(/^@+/, ''))}>
                                    @{user.username}
                                </button>
                            </div>
                            <div className={styles.email}>
                                <button type="button" className={styles.emailBtn} onClick={() => handleCopyText(user.email)}>
                                    {user.email}
                                </button>
                            </div>
                            <div className={styles.roleCell}>
                                <span className={styles.roleText}>{roleLabel(user.role)}</span>
                            </div>
                            <div className={styles.pointsCell}>{user.totalPoints || 0}</div>
                            <div className={styles.dateCell}>{formatDate(user.createdAt)}</div>
                            <div className={styles.rowActions}>
                                <button type="button" className={styles.actionBtn} onClick={() => openRoleModal(user)}>
                                    Сменить роль
                                </button>
                                {user.latestAuthorRequest?.status === 'pending' && (
                                    <button type="button" className={styles.actionBtn} onClick={() => openReviewModal(user)}>
                                        Рассмотреть заявку
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className={styles.deleteBtn}
                                    onClick={() => handleDeleteUser(user)}
                                >
                                    Удалить
                                </button>
                            </div>
                        </div>
                    ))}

                    {!loading && users.length === 0 && (
                        <div className={styles.empty}>Пользователи не найдены</div>
                    )}
                </div>

                {totalPages > 1 && <div className={styles.pagination}>{renderPagination()}</div>}
            </section>

            {roleModal.isOpen && roleModal.user && (
                <div className={styles.modalOverlay} onClick={closeRoleModal}>
                    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Сменить роль</h3>
                        <p className={styles.modalDescription}>
                            {roleModal.user.firstName} {roleModal.user.lastName} ({roleModal.user.email})
                        </p>
                        <label className={styles.modalField}>
                            Новая роль
                            <select
                                value={roleModal.role}
                                onChange={(e) => setRoleModal((prev) => ({ ...prev, role: e.target.value }))}
                            >
                                <option value="user">Пользователь</option>
                                <option value="author">Автор</option>
                                <option value="admin">Админ</option>
                            </select>
                        </label>
                        <div className={styles.modalActions}>
                            <button type="button" className={styles.actionBtn} onClick={confirmRoleUpdate}>
                                Сохранить
                            </button>
                            <button type="button" className={styles.secondaryBtn} onClick={closeRoleModal}>
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {reviewModal.isOpen && reviewModal.user && (
                <div className={styles.modalOverlay} onClick={closeReviewModal}>
                    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                        <button type="button" className={styles.modalClose} onClick={closeReviewModal} aria-label="Закрыть">
                            ×
                        </button>
                        <h3 className={styles.modalTitle}>Рассмотреть заявку автора</h3>
                        <p className={styles.modalDescription}>
                            {reviewModal.user.firstName} {reviewModal.user.lastName} ({reviewModal.user.email})
                        </p>
                        <p className={styles.modalHint}>Статус: {requestStatusLabel(reviewModal.request?.status || reviewModal.user.latestAuthorRequest?.status)}</p>
                        <div className={styles.requestDetails}>
                            <p><strong>Почта для связи:</strong> {reviewModal.request?.contactEmail || reviewModal.user.email || '—'}</p>
                            <p><strong>Образование:</strong> {EDUCATION_LEVEL_LABEL[reviewModal.request?.educationLevel] || reviewModal.request?.educationLevel || '—'}</p>
                            <p><strong>Уточнение по образованию:</strong> {reviewModal.request?.educationDetails || '—'}</p>
                            <p><strong>Уровень татарского:</strong> {TATAR_LEVEL_LABEL[reviewModal.request?.tatarLevel] || reviewModal.request?.tatarLevel || '—'}</p>
                            <p><strong>Уровень преподавания:</strong> {TEACHING_LEVEL_LABEL[reviewModal.request?.teachingLevel] || reviewModal.request?.teachingLevel || '—'}</p>
                            <p><strong>Мотивация:</strong> {reviewModal.request?.motivation || '—'}</p>
                        </div>
                        <label className={styles.modalField}>
                            Ответ админа (необязательно)
                            <textarea
                                className={styles.modalTextarea}
                                value={reviewModal.adminComment}
                                onChange={(e) => setReviewModal((prev) => ({ ...prev, adminComment: e.target.value }))}
                                placeholder="Введите комментарий для пользователя"
                            />
                        </label>
                        <div className={styles.modalActions}>
                            <button type="button" className={styles.actionBtn} onClick={() => confirmReviewRequest('approved')}>
                                Подтвердить
                            </button>
                            <button
                                type="button"
                                className={styles.actionBtn}
                                onClick={() => confirmReviewRequest('rejected')}
                            >
                                Отклонить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsersPage;
