import React, { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useStores } from '../../stores/StoreContext';
import styles from './Navbar.module.css';

const Navbar = observer(() => {
    const { authStore, chatStore, uiStore } = useStores();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
    const [interfaceLang, setInterfaceLang] = useState('ru');
    const [theme, setTheme] = useState(() => (
        document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
    ));

    const toggleMenu = () => {
        setIsSettingsOpen(false);
        setIsMenuOpen(!isMenuOpen);
    };
    const closeMenu = () => {
        setIsMenuOpen(false);
        setIsSettingsOpen(false);
    };

    const isAdmin = authStore.user?.role === 'admin';
    const isAuthor = authStore.user?.role === 'author';
    const profileRoute = isAdmin ? '/admin' : '/profile';

    const profileInitials = useMemo(() => {
        const first = (authStore.user?.firstName || '').trim().charAt(0);
        const last = (authStore.user?.lastName || '').trim().charAt(0);
        return `${first}${last}`.toUpperCase() || 'U';
    }, [authStore.user?.firstName, authStore.user?.lastName]);

    const profileAvatarSrc = useMemo(() => {
        const avatarUrl = authStore.user?.avatarUrl || '';
        if (!avatarUrl) return '';
        if (avatarUrl.startsWith('http')) return avatarUrl;
        const apiBase = import.meta.env.VITE_API_URL || '';
        const serverBase = apiBase.replace(/\/api\/?$/, '');
        return `${serverBase}${avatarUrl}`;
    }, [authStore.user?.avatarUrl]);

    useEffect(() => {
        if (authStore.isAuth && !isAdmin) {
            chatStore.connectSocket();
            chatStore.loadChats();
        } else {
            chatStore.disconnectSocket();
        }
    }, [authStore.isAuth, isAdmin, chatStore]);

    useEffect(() => {
        setAvatarLoadFailed(false);
    }, [profileAvatarSrc]);

    useEffect(() => {
        if (!authStore.isAuth) {
            setIsSettingsOpen(false);
            setIsMenuOpen(false);
        }
    }, [authStore.isAuth]);

    useEffect(() => {
        if (isSettingsOpen) {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            setTheme(currentTheme === 'dark' ? 'dark' : 'light');
        }
    }, [isSettingsOpen]);

    const onToggleTheme = () => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(nextTheme);
        localStorage.setItem('theme', nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
    };

    const onLogoutConfirm = () => {
        setIsSettingsOpen(false);
        uiStore.showModal({
            title: 'Выйти из аккаунта?',
            message: 'Вы уверены, что хотите выйти?',
            variant: 'info',
            primaryLabel: 'Выйти',
            secondaryLabel: 'Отмена',
            onPrimary: () => {
                authStore.logout();
                uiStore.closeModal();
                navigate('/login');
            },
            onSecondary: () => uiStore.closeModal()
        });
    };

    const settingsOverlay = authStore.isAuth && isSettingsOpen ? (
        <div className={styles.settingsOverlay} onClick={() => setIsSettingsOpen(false)}>
            <div
                className={styles.settingsModal}
                role="dialog"
                aria-modal="true"
                aria-label="Настройки"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.settingsHead}>
                    <h3 className={styles.settingsTitle}>Настройки</h3>
                    <button
                        type="button"
                        className={styles.settingsCloseBtn}
                        onClick={() => setIsSettingsOpen(false)}
                        aria-label="Закрыть"
                    >
                        ×
                    </button>
                </div>

                <div className={styles.settingsList}>
                    <button type="button" className={styles.settingsItem} onClick={onToggleTheme}>
                        <span>Тема</span>
                        <span className={styles.settingsValue}>{theme === 'dark' ? 'Тёмная' : 'Светлая'}</span>
                    </button>

                    <div className={styles.settingsControlRow}>
                        <span className={styles.settingsControlLabel}>Язык</span>
                        <div className={styles.segmentedControl} role="group" aria-label="Язык интерфейса">
                            {[
                                { value: 'ru', label: 'ру' },
                                { value: 'tat', label: 'тат' }
                            ].map((langOption) => (
                                <button
                                    key={langOption.value}
                                    type="button"
                                    className={`${styles.segmentedBtn} ${interfaceLang === langOption.value ? styles.segmentedBtnActive : ''}`}
                                    onClick={() => setInterfaceLang(langOption.value)}
                                >
                                    {langOption.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button type="button" className={`${styles.settingsItem} ${styles.settingsLogout}`} onClick={onLogoutConfirm}>
                        <span>Выйти</span>
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <>
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
                        {(!authStore.isAuth || !isAdmin) && (
                            <Link to="/translate" className={styles.link} onClick={closeMenu}>Переводчик</Link>
                        )}

                        {authStore.isAuth && !isAdmin && (
                            <>
                                <Link to="/scanner" className={styles.link} onClick={closeMenu}>Сканер</Link>
                                <Link to="/dictionary" className={styles.link} onClick={closeMenu}>Словарь</Link>
                                <Link to="/courses" className={styles.link} onClick={closeMenu}>Материал</Link>
                                {isAuthor && <Link to="/author/learning" className={styles.link} onClick={closeMenu}>Авторство</Link>}
                                <Link to="/friends" className={styles.link} onClick={closeMenu}>Друзья</Link>
                                <Link to="/chats" className={`${styles.link} ${styles.chatLink}`} onClick={closeMenu}>
                                    Чаты
                                    {chatStore.unreadTotal > 0 && <span className={styles.chatBadge}>{chatStore.unreadTotal}</span>}
                                </Link>
                            </>
                        )}

                        {authStore.isAuth ? (
                            <>
                                {isAdmin && (
                                    <>
                                        <Link to="/words" className={styles.link} onClick={closeMenu}>Словарь</Link>
                                        <Link to="/admin/learning" className={styles.link} onClick={closeMenu}>Материал</Link>
                                        <Link to="/admin/users" className={styles.link} onClick={closeMenu}>Пользователи</Link>
                                    </>
                                )}

                                <div className={styles.navUserControls}>
                                    <Link
                                        to={profileRoute}
                                        className={styles.profileAvatarBtn}
                                        onClick={closeMenu}
                                        aria-label="Личный кабинет"
                                    >
                                        {profileAvatarSrc && !avatarLoadFailed ? (
                                            <img
                                                src={profileAvatarSrc}
                                                alt="Профиль"
                                                className={styles.profileAvatarImage}
                                                onError={() => setAvatarLoadFailed(true)}
                                            />
                                        ) : (
                                            <span className={styles.profileAvatarFallback}>{profileInitials}</span>
                                        )}
                                    </Link>

                                    <button
                                        type="button"
                                        className={styles.settingsBtn}
                                        aria-label="Настройки интерфейса"
                                        aria-expanded={isSettingsOpen}
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            setIsSettingsOpen((prev) => !prev);
                                        }}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                            <path
                                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.757.426 1.757 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.757-2.924 1.757-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.757-.426-1.757-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                            <path
                                                d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </button>
                                </div>

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

            {settingsOverlay && typeof document !== 'undefined'
                ? createPortal(settingsOverlay, document.body)
                : settingsOverlay}
        </>
    );
});

export default Navbar;
