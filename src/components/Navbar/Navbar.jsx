import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import { useStores } from '../../stores/StoreContext';
import styles from './Navbar.module.css';

const Navbar = observer(() => {
    const { authStore, chatStore } = useStores();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    const isAdmin = authStore.user?.role === 'admin';

    useEffect(() => {
        if (authStore.isAuth && !isAdmin) {
            chatStore.connectSocket();
            chatStore.loadChats();
        } else {
            chatStore.disconnectSocket();
        }
    }, [authStore.isAuth, isAdmin, chatStore]);

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
                            <Link to="/courses" className={styles.link} onClick={closeMenu}>Материал</Link>
                            <Link to="/friends" className={styles.link} onClick={closeMenu}>Друзья</Link>
                            <Link to="/chats" className={`${styles.link} ${styles.chatLink}`} onClick={closeMenu}>
                                Чаты
                                {chatStore.unreadTotal > 0 && <span className={styles.chatBadge}>{chatStore.unreadTotal}</span>}
                            </Link>
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
                                    <Link to="/words" className={styles.adminNavBtn} onClick={closeMenu}>Словарь</Link>
                                    <Link to="/admin/learning" className={styles.adminNavBtn} onClick={closeMenu}>Материал</Link>
                                    <Link to="/admin/users" className={styles.adminNavBtn} onClick={closeMenu}>Пользователи</Link>
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
