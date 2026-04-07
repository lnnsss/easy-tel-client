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

const AdminUsersPage = () => {
    const { uiStore } = useStores();
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 350);

        return () => clearTimeout(timer);
    }, [search]);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const { data } = await AdminService.getUsers(page, debouncedSearch, 10);
            setUsers(data.users || []);
            setTotalPages(data.totalPages || 1);
            setTotalItems(data.totalItems || 0);
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка загрузки пользователей');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

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

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1>Админ: пользователи</h1>
                    <p>
                        Управление профилями пользователей. Всего: <strong>{totalItems}</strong>
                    </p>
                </div>
                <input
                    type="text"
                    className={styles.search}
                    placeholder="Поиск по email, имени, username..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </header>

            {error && <div className={styles.error}>{error}</div>}

            <section className={styles.card}>
                <div className={styles.tableHead}>
                    <span>Пользователь</span>
                    <span>Email</span>
                    <span>Слов</span>
                    <span>Очки</span>
                    <span>Дата</span>
                    <span>Действия</span>
                </div>

                <div className={styles.tableBody}>
                    {users.map((user) => (
                        <div key={user._id} className={styles.row}>
                            <div>
                                <strong>{user.firstName} {user.lastName}</strong>
                                <small>@{user.username}</small>
                            </div>
                            <div className={styles.email}>{user.email}</div>
                            <div>{user.wordsCount || 0}</div>
                            <div>{user.totalPoints || 0}</div>
                            <div>{formatDate(user.createdAt)}</div>
                            <div>
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
        </div>
    );
};

export default AdminUsersPage;
