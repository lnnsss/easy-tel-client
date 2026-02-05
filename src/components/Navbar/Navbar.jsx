import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Link, useNavigate } from 'react-router-dom';
import { useStores } from '../../stores/StoreContext';
import styles from './Navbar.module.css';

const Navbar = observer(() => {
    const { authStore } = useStores();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = () => {
        authStore.logout();
        setIsMenuOpen(false);
        navigate('/login');
    };

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    const isAdmin = authStore.user?.role === 'admin';

    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                <Link to="/" className={styles.logo} onClick={closeMenu}>
                    Easy<span>Tel</span>
                </Link>

                <button className={styles.burger} onClick={toggleMenu} aria-label="Menu">
                    <span className={styles.line}></span>
                    <span className={styles.line}></span>
                    <span className={styles.line}></span>
                </button>

                <div className={`${styles.links} ${isMenuOpen ? styles.linksActive : ''}`}>
                    {/* Функционал Сканнера и Словаря только для авторизованных пользователей, НЕ админов */}
                    {authStore.isAuth && !isAdmin && (
                        <>
                            <Link to="/scanner" className={styles.link} onClick={closeMenu}>Сканер</Link>
                            <Link to="/dictionary" className={styles.link} onClick={closeMenu}>Словарь</Link>
                        </>
                    )}

                    {authStore.isAuth ? (
                        <>
                            <Link to="/profile" className={styles.profileWrapper} onClick={closeMenu}>
                                <div className={styles.profileLink}>
                                    <div className={styles.userInfo}>
                                        <span className={styles.userName}>{authStore.user?.firstName}</span>
                                        <span className={styles.userRank}>
                                            {isAdmin ? 'Администратор' : authStore.user?.rank}
                                        </span>
                                    </div>
                                </div>
                            </Link>

                            {isAdmin && (
                                <Link to="/admin" className={styles.adminBadge} onClick={closeMenu}>Админ-панель</Link>
                            )}

                            <button onClick={handleLogout} className={styles.btnLogout}>Выйти</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className={styles.link} onClick={closeMenu}>Вход</Link>
                            <Link to="/register" className={styles.btnRegister} onClick={closeMenu}>Регистрация</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
});

export default Navbar;