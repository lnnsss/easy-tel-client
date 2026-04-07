import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Link, useNavigate } from 'react-router-dom';
import { useStores } from '../../stores/StoreContext';
import styles from './Navbar.module.css';

const Navbar = observer(() => {
    const { authStore } = useStores();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);
    const handleLogout = () => {
        authStore.logout();
        setIsMenuOpen(false);
        navigate('/login');
    };

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
                    {authStore.isAuth && !isAdmin && (
                        <>
                            <Link to="/scanner" className={styles.link} onClick={closeMenu}>Сканер</Link>
                            <Link to="/dictionary" className={styles.link} onClick={closeMenu}>Словарь</Link>
                            <Link to="/courses" className={styles.link} onClick={closeMenu}>Курсы</Link>
                        </>
                    )}

                    {authStore.isAuth ? (
                        <>
                            <Link to={isAdmin ? "/admin" : "/profile"} className={styles.profileWrapper} onClick={closeMenu}>
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
                                <>
                                    <Link to="/words" className={styles.adminNavBtn} onClick={closeMenu}>Слова</Link>
                                    <Link to="/admin/learning" className={styles.adminNavBtn} onClick={closeMenu}>Обучение</Link>
                                    <Link to="/admin/users" className={styles.adminNavBtn} onClick={closeMenu}>Пользователи</Link>
                                    <button onClick={handleLogout} className={`${styles.adminNavBtn} ${styles.adminNavBtnDanger}`}>Выйти</button>
                                </>
                            )}

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
