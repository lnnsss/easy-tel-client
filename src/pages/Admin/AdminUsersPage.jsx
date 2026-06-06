import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminService from '../../services/AdminService';
import { useStores } from '../../stores/StoreContext';
import styles from './AdminUsersPage.module.css';

// Форматирует данные для отображения пользователю.
const formatDate = (dateValue, locale = 'ru-RU') => {
    if (!dateValue) return '—';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(locale);
};

// Отрисовывает экран или компонент AdminUsersPage и связывает его с данными приложения.
const AdminUsersPage = () => {
    const { t, i18n } = useTranslation();
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
    const currentLocale = i18n.language?.startsWith('tt') ? 'tt-RU' : 'ru-RU';
    const requestStatusLabel = (status) => (
        status ? t(`pages.admin.users.request_statuses.${status}`, { defaultValue: '—' }) : '—'
    );
    const roleLabel = (role) => t(`pages.admin.users.roles.${role || 'user'}`);
    const educationLabel = (value) => (
        value ? t(`pages.courses.education_options.${value}`, { defaultValue: value }) : '—'
    );
    const tatarLevelLabel = (value) => (
        value ? t(`pages.courses.tatar_level_options.${value}`, { defaultValue: value.toUpperCase?.() || value }) : '—'
    );
    const teachingLevelLabel = (value) => (
        value ? t(`pages.courses.teaching_options.${value}`, { defaultValue: value }) : '—'
    );

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
            setError(err.response?.data?.message || t('pages.admin.users.load_error'));
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

    // Обрабатывает пользовательское или системное событие.
    const handleCopyText = async (value) => {
        const normalizedValue = String(value || '').trim();
        if (!normalizedValue) return;
        try {
            await navigator.clipboard.writeText(normalizedValue);
            uiStore.showCopyToast(t('pages.admin.users.copy_toast'));
        } catch {
            // Игнорируем ошибки доступа к буферу обмена.
        }
    };

    // Обрабатывает пользовательское или системное событие.
    const handleDeleteUser = (user) => {
        uiStore.showModal({
            title: t('pages.admin.users.delete_title'),
            message: t('pages.admin.users.delete_message', {
                name: `${user.firstName} ${user.lastName}`,
                email: user.email
            }),
            variant: 'error',
            primaryLabel: t('common.actions.delete'),
            secondaryLabel: t('modals.cancel'),
            onPrimary: async () => {
                try {
                    await AdminService.deleteUser(user._id);
                    uiStore.closeModal();
                    await fetchUsers();
                } catch (err) {
                    uiStore.showModal({
                        title: t('modals.error'),
                        message: err.response?.data?.message || t('pages.admin.users.delete_error'),
                        variant: 'error',
                        secondaryLabel: t('common.close')
                    });
                }
            }
        });
    };

    // Обрабатывает пользовательское или системное событие.
    const handleRoleUpdate = async (user, nextRole) => {
        await AdminService.updateUserRole(user._id, nextRole);
        await fetchUsers();
        await fetchAuthorRequests();
    };

    // Обрабатывает пользовательское или системное событие.
    const handleReviewRequest = async (user, decision, adminComment = '') => {
        const requestId = reviewModal.request?._id || user.latestAuthorRequest?.requestId;
        if (!requestId) return;
        await AdminService.reviewAuthorRequest(requestId, decision, adminComment);
        await fetchUsers();
        await fetchAuthorRequests();
    };

    // Открывает локальное состояние интерфейса или модального окна.
    const openRoleModal = (user) => {
        setRoleModal({
            isOpen: true,
            user,
            role: user.role || 'user'
        });
    };

    // Закрывает локальное состояние интерфейса или модального окна.
    const closeRoleModal = () => {
        setRoleModal({
            isOpen: false,
            user: null,
            role: 'user'
        });
    };

    // Показывает подтверждение перед необратимым действием.
    const confirmRoleUpdate = () => {
        if (!roleModal.user) return;
        const targetUser = roleModal.user;
        const nextRole = roleModal.role;
        const oldRoleLabel = roleLabel(targetUser.role);
        const nextRoleLabel = roleLabel(nextRole);
        uiStore.showModal({
            title: t('pages.admin.users.confirm_role_title'),
            message: `${targetUser.firstName} ${targetUser.lastName}: ${oldRoleLabel} → ${nextRoleLabel}`,
            variant: 'info',
            primaryLabel: t('modals.yes'),
            secondaryLabel: t('modals.cancel'),
            onPrimary: async () => {
                uiStore.closeModal();
                try {
                    await handleRoleUpdate(targetUser, nextRole);
                    closeRoleModal();
                } catch (err) {
                    uiStore.showModal({
                        title: t('modals.error'),
                        message: err.response?.data?.message || t('pages.admin.users.role_update_error'),
                        variant: 'error',
                        secondaryLabel: t('common.close')
                    });
                }
            },
            onSecondary: () => uiStore.closeModal()
        });
    };

    // Открывает локальное состояние интерфейса или модального окна.
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

    // Закрывает локальное состояние интерфейса или модального окна.
    const closeReviewModal = () => {
        setReviewModal({
            isOpen: false,
            user: null,
            request: null,
            adminComment: ''
        });
    };

    // Показывает подтверждение перед необратимым действием.
    const confirmReviewRequest = (decision) => {
        if (!reviewModal.user) return;
        const targetUser = reviewModal.user;
        const title = decision === 'approved' ? t('pages.admin.users.confirm_approve_title') : t('pages.admin.users.confirm_reject_title');
        const message = t('pages.admin.users.confirm_review_message', {
            name: `${targetUser.firstName} ${targetUser.lastName}`,
            decision: decision === 'approved' ? t('pages.admin.users.decision_approved') : t('pages.admin.users.decision_rejected')
        });
        uiStore.showModal({
            title,
            message,
            variant: decision === 'approved' ? 'success' : 'error',
            primaryLabel: t('modals.yes'),
            secondaryLabel: t('modals.cancel'),
            onPrimary: async () => {
                uiStore.closeModal();
                try {
                    await handleReviewRequest(targetUser, decision, reviewModal.adminComment);
                    closeReviewModal();
                } catch (err) {
                    uiStore.showModal({
                        title: t('modals.error'),
                        message: err.response?.data?.message || t('pages.admin.users.review_error'),
                        variant: 'error',
                        secondaryLabel: t('common.close')
                    });
                }
            },
            onSecondary: () => uiStore.closeModal()
        });
    };

    // Формирует повторяемый фрагмент интерфейса.
    const renderPagination = () => {
        const elements = [];
        const pushPage = (i) => {
            elements.push(
                <button
                    key={i}
                    type="button"
                    className={page === i ? styles.activePage : styles.pageBtn}
                    onClick={() => setPage(i)}
                >
                    {i}
                </button>
            );
        };

        elements.push(
            <button
                key="prev"
                type="button"
                className={styles.pageBtn}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1}
            >
                ←
            </button>
        );

        for (let i = 1; i <= totalPages; i += 1) {
            if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
                pushPage(i);
            } else if (i === page - 3 || i === page + 3) {
                elements.push(<span key={`dots-${i}`} className={styles.pageDots}>…</span>);
            }
        }

        elements.push(
            <button
                key="next"
                type="button"
                className={styles.pageBtn}
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page >= totalPages}
            >
                →
            </button>
        );

        return elements;
    };

    // Формирует повторяемый фрагмент интерфейса.
    const renderRequestsPagination = () => {
        const elements = [];
        const pushPage = (i) => {
            elements.push(
                <button
                    key={`r-${i}`}
                    type="button"
                    className={requestsPage === i ? styles.activePage : styles.pageBtn}
                    onClick={() => setRequestsPage(i)}
                >
                    {i}
                </button>
            );
        };

        elements.push(
            <button
                key="r-prev"
                type="button"
                className={styles.pageBtn}
                onClick={() => setRequestsPage((prev) => Math.max(prev - 1, 1))}
                disabled={requestsPage <= 1}
            >
                ←
            </button>
        );

        for (let i = 1; i <= requestsTotalPages; i += 1) {
            if (i === 1 || i === requestsTotalPages || (i >= requestsPage - 2 && i <= requestsPage + 2)) {
                pushPage(i);
            } else if (i === requestsPage - 3 || i === requestsPage + 3) {
                elements.push(<span key={`r-dots-${i}`} className={styles.pageDots}>…</span>);
            }
        }

        elements.push(
            <button
                key="r-next"
                type="button"
                className={styles.pageBtn}
                onClick={() => setRequestsPage((prev) => Math.min(prev + 1, requestsTotalPages))}
                disabled={requestsPage >= requestsTotalPages}
            >
                →
            </button>
        );

        return elements;
    };

    return (
        <div className={`${styles.page} app-page-shell`}>
            <header className={`${styles.header} app-page-top`}>
                <div>
                    <h1 className="app-page-title">{t('pages.admin.users_title')}</h1>
                    <p className="app-page-subtitle">{t('pages.admin.users_subtitle')} <strong>{totalItems}</strong></p>
                </div>
                <input
                    type="text"
                    className={styles.search}
                    placeholder={t('pages.admin.users.search_placeholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </header>

            <section className={styles.filterPanel}>
                <select value={filters.role} onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}>
                    <option value="">{t('pages.admin.users.all')}</option>
                    <option value="admin">{t('pages.admin.users.admins')}</option>
                    <option value="author">{t('pages.admin.users.authors')}</option>
                    <option value="user">{t('pages.admin.users.users')}</option>
                </select>
                <select value={filters.sortBy} onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}>
                    <option value="createdAt">{t('pages.admin.users.sort_created')}</option>
                    <option value="totalPoints">{t('pages.admin.users.sort_points')}</option>
                    <option value="latestRequestAt">{t('pages.admin.users.sort_request')}</option>
                </select>
                <select value={filters.sortOrder} onChange={(e) => setFilters((prev) => ({ ...prev, sortOrder: e.target.value }))}>
                    <option value="desc">{t('pages.admin.users.desc')}</option>
                    <option value="asc">{t('pages.admin.users.asc')}</option>
                </select>
            </section>

            {error && <div className={styles.error}>{error}</div>}

            <section className={styles.card}>
                <button
                    type="button"
                    className={styles.requestsToggle}
                    onClick={() => setIsRequestsOpen((prev) => !prev)}
                >
                    <span>{t('pages.admin.users.author_requests')}</span>
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
                                    <p className={styles.requestMeta}>
                                        Email:
                                        {' '}
                                        <button type="button" className={styles.emailBtn} onClick={() => handleCopyText(request.userId?.email || '')}>
                                            {request.userId?.email || '—'}
                                        </button>
                                    </p>
                                    <p className={styles.requestMeta}>{t('pages.admin.users.date', { date: formatDate(request.createdAt, currentLocale) })}</p>
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
                                            {t('pages.admin.users.review_request')}
                                        </button>
                                    )}
                                </article>
                            ))}
                            {!requestsLoading && authorRequests.length === 0 && (
                                <div className={styles.empty}>{t('pages.admin.users.empty_requests')}</div>
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
                    <span>{t('pages.admin.users.user')}</span>
                    <span>Email</span>
                    <span>{t('pages.admin.users.role')}</span>
                    <span>{t('pages.admin.users.points')}</span>
                    <span>{t('pages.admin.users.date_header')}</span>
                    <span className={styles.actionsHead}>{t('pages.admin.users.actions')}</span>
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
                            <div className={styles.dateCell}>{formatDate(user.createdAt, currentLocale)}</div>
                            <div className={styles.rowActions}>
                                <button type="button" className={styles.actionBtn} onClick={() => openRoleModal(user)}>
                                    {t('pages.admin.users.change_role')}
                                </button>
                                {user.latestAuthorRequest?.status === 'pending' && (
                                    <button type="button" className={styles.actionBtn} onClick={() => openReviewModal(user)}>
                                        {t('pages.admin.users.review_request')}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className={styles.deleteBtn}
                                    onClick={() => handleDeleteUser(user)}
                                >
                                    {t('common.actions.delete')}
                                </button>
                            </div>
                        </div>
                    ))}

                    {!loading && users.length === 0 && (
                        <div className={styles.empty}>{t('pages.admin.users.empty_users')}</div>
                    )}
                </div>

                {totalPages > 1 && <div className={styles.pagination}>{renderPagination()}</div>}
            </section>

            {roleModal.isOpen && roleModal.user && (
                <div className={styles.modalOverlay} onClick={closeRoleModal}>
                    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>{t('pages.admin.users.change_role')}</h3>
                        <p className={styles.modalDescription}>
                            {roleModal.user.firstName} {roleModal.user.lastName} ({roleModal.user.email})
                        </p>
                        <label className={styles.modalField}>
                            {t('pages.admin.users.new_role')}
                            <select
                                value={roleModal.role}
                                onChange={(e) => setRoleModal((prev) => ({ ...prev, role: e.target.value }))}
                            >
                                <option value="user">{t('pages.admin.users.roles.user')}</option>
                                <option value="author">{t('pages.admin.users.roles.author')}</option>
                                <option value="admin">{t('pages.admin.users.roles.admin')}</option>
                            </select>
                        </label>
                        <div className={styles.modalActions}>
                            <button type="button" className={styles.actionBtn} onClick={confirmRoleUpdate}>
                                {t('common.actions.save')}
                            </button>
                            <button type="button" className={styles.secondaryBtn} onClick={closeRoleModal}>
                                {t('modals.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {reviewModal.isOpen && reviewModal.user && (
                <div className={styles.modalOverlay} onClick={closeReviewModal}>
                    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                        <button type="button" className={styles.modalClose} onClick={closeReviewModal} aria-label={t('common.close')}>
                            ×
                        </button>
                        <h3 className={styles.modalTitle}>{t('pages.admin.users.review_author_title')}</h3>
                        <p className={styles.modalDescription}>
                            {reviewModal.user.firstName} {reviewModal.user.lastName} ({reviewModal.user.email})
                        </p>
                        <p className={styles.modalHint}>{t('pages.admin.users.status')} {requestStatusLabel(reviewModal.request?.status || reviewModal.user.latestAuthorRequest?.status)}</p>
                        <div className={styles.requestDetails}>
                            <p><strong>{t('pages.admin.users.contact_email')}</strong> {reviewModal.request?.contactEmail || reviewModal.user.email || '—'}</p>
                            <p><strong>{t('pages.admin.users.education')}</strong> {educationLabel(reviewModal.request?.educationLevel)}</p>
                            <p><strong>{t('pages.admin.users.education_details')}</strong> {reviewModal.request?.educationDetails || '—'}</p>
                            <p><strong>{t('pages.admin.users.tatar_level')}</strong> {tatarLevelLabel(reviewModal.request?.tatarLevel)}</p>
                            <p><strong>{t('pages.admin.users.teaching_level')}</strong> {teachingLevelLabel(reviewModal.request?.teachingLevel)}</p>
                            <p><strong>{t('pages.admin.users.motivation')}</strong> {reviewModal.request?.motivation || '—'}</p>
                        </div>
                        <label className={styles.modalField}>
                            {t('pages.admin.users.admin_answer')}
                            <textarea
                                className={styles.modalTextarea}
                                value={reviewModal.adminComment}
                                onChange={(e) => setReviewModal((prev) => ({ ...prev, adminComment: e.target.value }))}
                                placeholder={t('pages.admin.users.admin_answer_placeholder')}
                            />
                        </label>
                        <div className={styles.modalActions}>
                            <button type="button" className={styles.actionBtn} onClick={() => confirmReviewRequest('approved')}>
                                {t('modals.yes')}
                            </button>
                            <button
                                type="button"
                                className={styles.actionBtn}
                                onClick={() => confirmReviewRequest('rejected')}
                            >
                                {t('common.actions.decline')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsersPage;
