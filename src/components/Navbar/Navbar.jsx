import React from 'react';
import { observer } from 'mobx-react-lite';
import { Link, useNavigate } from 'react-router-dom';
import { useStores } from '../../stores/StoreContext';
import styles from './Navbar.module.css';

const Navbar = observer(() => {
    const { authStore } = useStores();
    const navigate = useNavigate();

    const handleLogout = () => {
        authStore.logout();
        navigate('/login');
    };

    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                <Link to="/" className={styles.logo}>
                    Easy<span>Tel</span>
                </Link>

                <div className={styles.links}>
                    <Link to="/scanner" className={styles.link}>Сканер</Link>

                    {authStore.isAuth ? (
                        <>
                            <Link to="/profile" className={styles.link}>Личный кабинет</Link>
                            {authStore.user?.role === 'admin' && (
                                <Link to="/admin" className={styles.adminBadge}>Админ</Link>
                            )}
                            <button onClick={handleLogout} className={styles.btnLogout}>Выйти</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className={styles.link}>Вход</Link>
                            <Link to="/register" className={styles.btnRegister}>Регистрация</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
});

export default Navbar;