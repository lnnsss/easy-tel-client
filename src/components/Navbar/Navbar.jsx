import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { observer } from 'mobx-react-lite';
import { Link, useNavigate } from 'react-router-dom';
import { useStores } from '../../stores/StoreContext';
import styles from './Navbar.module.css';
import CourseService from '../../services/CourseService';

const Navbar = observer(() => {
    const { authStore, chatStore, uiStore } = useStores();
    const navigate = useNavigate();
    const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
    const [isDesktopSettingsOpen, setIsDesktopSettingsOpen] = useState(false);
    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
    const [interfaceLang, setInterfaceLang] = useState('ru');
    const [theme, setTheme] = useState(() => (
        document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
    ));
    const [dailyRewardsState, setDailyRewardsState] = useState(null);
    const [isRewardsLoading, setIsRewardsLoading] = useState(false);
    const [isRewardsModalOpen, setIsRewardsModalOpen] = useState(false);

    const closeMenu = () => {
        setIsMobileDropdownOpen(false);
        setIsDesktopSettingsOpen(false);
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
            setIsMobileDropdownOpen(false);
            setIsDesktopSettingsOpen(false);
        }
    }, [authStore.isAuth]);

    useEffect(() => {
        if (isMobileDropdownOpen) {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            setTheme(currentTheme === 'dark' ? 'dark' : 'light');
        }
    }, [isMobileDropdownOpen]);

    const onToggleTheme = async () => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(nextTheme);
        localStorage.setItem('theme', nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
        if (nextTheme === 'dark') {
            try {
                const { default: $api } = await import('../../api/instance');
                await $api.post('/achievements/event', { eventType: 'theme_dark_used' });
            } catch (e) {
                console.error(e);
            }
        }
    };

    const onLogoutConfirm = () => {
        closeMenu();
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

    const onCopyReferralLink = async () => {
        const refCode = String(authStore.user?.referralCode || '').trim();
        if (!refCode) {
            uiStore.showModal({
                title: 'Реферальная ссылка недоступна',
                message: 'Попробуйте обновить страницу и открыть настройки снова.',
                variant: 'info',
                secondaryLabel: 'Закрыть'
            });
            return;
        }
        const origin = window.location.origin;
        const link = `${origin}/register?ref=${encodeURIComponent(refCode)}`;
        try {
            await navigator.clipboard.writeText(link);
            uiStore.showCopyToast('Скопировано в буфер обмена');
        } catch {
            uiStore.showModal({
                title: 'Не удалось скопировать',
                message: 'Скопируйте ссылку вручную: ' + link,
                variant: 'info',
                secondaryLabel: 'Закрыть'
            });
        }
    };

    const loadDailyRewardsState = async () => {
        if (!authStore.isAuth || isAdmin) return;
        try {
            setIsRewardsLoading(true);
            const { data } = await CourseService.getDailyRewards();
            setDailyRewardsState(data || null);
        } catch (e) {
            console.error('loadDailyRewardsState error', e);
        } finally {
            setIsRewardsLoading(false);
        }
    };

    const onOpenDailyRewards = async () => {
        let data = dailyRewardsState;
        if (!data) {
            try {
                setIsRewardsLoading(true);
                const response = await CourseService.getDailyRewards();
                data = response.data || null;
                setDailyRewardsState(data);
            } catch (e) {
                console.error('onOpenDailyRewards error', e);
            } finally {
                setIsRewardsLoading(false);
            }
        }
        if (!data || data.progress?.isCompleted) return;
        setIsRewardsModalOpen(true);
    };

    useEffect(() => {
        if (!authStore.isAuth || isAdmin) {
            setDailyRewardsState(null);
            setIsRewardsModalOpen(false);
            return;
        }
        loadDailyRewardsState();
    }, [authStore.isAuth, authStore.user?._id, isAdmin]);

    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                <div className={styles.leftZone}>
                    <Link to="/" className={styles.logo} onClick={closeMenu}>
                        Easy<span>Tel</span>
                    </Link>
                </div>

                <div className={styles.centerNav}>
                    {!isAdmin && (
                        <>
                            {authStore.isAuth && (
                                <Link to="/ai-chat" className={`${styles.link} ${styles.aiChatLink}`} onClick={closeMenu}>AI чат-бот</Link>
                            )}
                            {authStore.isAuth && (
                                <>
                                    <Link to="/translate" className={styles.link} onClick={closeMenu}>Переводчик</Link>
                                    <Link to="/scanner" className={styles.link} onClick={closeMenu}>Сканер</Link>
                                </>
                            )}
                        </>
                    )}

                    {authStore.isAuth && !isAdmin && (
                        <>
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

                    {isAdmin && (
                        <>
                            <Link to="/words" className={styles.link} onClick={closeMenu}>Словарь</Link>
                            <Link to="/admin/learning" className={styles.link} onClick={closeMenu}>Материал</Link>
                            <Link to="/admin/users" className={styles.link} onClick={closeMenu}>Пользователи</Link>
                            <Link to="/admin/misc" className={styles.link} onClick={closeMenu}>Остальное</Link>
                        </>
                    )}
                </div>

                <div className={styles.rightZone}>
                    {authStore.isAuth ? (
                        <div className={styles.navUserControls}>
                            <Link
                                to={profileRoute}
                                className={styles.profileAvatarBtn}
                                style={!profileAvatarSrc && authStore.user?.avatarAccentColor ? { backgroundColor: authStore.user.avatarAccentColor } : undefined}
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
                                aria-label="Настройки и меню"
                                aria-expanded={isMobileDropdownOpen || isDesktopSettingsOpen}
                                onClick={() => {
                                    if (window.innerWidth <= 1040) {
                                        setIsMobileDropdownOpen((prev) => !prev);
                                        return;
                                    }
                                    setIsDesktopSettingsOpen((prev) => !prev);
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
                    ) : (
                        <>
                            <div className={styles.authBtns}>
                                <Link to="/login" className={styles.link} onClick={closeMenu}>Вход</Link>
                                <Link to="/register" className={styles.btnRegister} onClick={closeMenu}>Регистрация</Link>
                            </div>
                            <Link to="/login" className={styles.mobileLoginBtn} onClick={closeMenu}>Вход</Link>
                        </>
                    )}
                </div>

                {authStore.isAuth && (
                    <>
                        {isDesktopSettingsOpen && window.innerWidth > 1040 && createPortal(
                            <div className={styles.settingsOverlay} onClick={closeMenu}>
                                <div className={styles.settingsModal} onClick={(e) => e.stopPropagation()}>
                                    <div className={styles.settingsHead}>
                                        <h3 className={styles.settingsTitle}>Настройки</h3>
                                        <button type="button" className={styles.settingsCloseBtn} onClick={closeMenu} aria-label="Закрыть">×</button>
                                    </div>

                                    <div className={styles.settingsList}>
                                        {!isAdmin && (
                                            !dailyRewardsState?.progress?.isCompleted && (
                                                <button
                                                    type="button"
                                                    className={styles.referralBtn}
                                                    onClick={onOpenDailyRewards}
                                                    disabled={isRewardsLoading}
                                                >
                                                    <span>Награды 7 дней</span>
                                                    <span className={styles.referralHelpWrap}>
                                                        <span className={styles.referralHelp}>?</span>
                                                        <span className={styles.referralTooltip}>
                                                            Ежедневные награды за первые 7 дней входа на платформу
                                                        </span>
                                                    </span>
                                                </button>
                                            )
                                        )}

                                        {!isAdmin && (
                                            <button type="button" className={styles.referralBtn} onClick={onCopyReferralLink}>
                                                <span>Рефералка</span>
                                                <span className={styles.referralHelpWrap}>
                                                    <span className={styles.referralHelp}>?</span>
                                                    <span className={styles.referralTooltip}>
                                                        Вы получите 10 монет, если кто-то зарегистрируется по вашей ссылке
                                                    </span>
                                                </span>
                                            </button>
                                        )}

                                        {!isAdmin && (
                                            <button
                                                type="button"
                                                className={styles.settingsItem}
                                                onClick={() => {
                                                    closeMenu();
                                                    navigate('/achievements');
                                                }}
                                            >
                                                <span>Достижения</span>
                                            </button>
                                        )}

                                        {!isAdmin && (
                                            <button
                                                type="button"
                                                className={styles.settingsItem}
                                                onClick={() => {
                                                    closeMenu();
                                                    navigate('/character');
                                                }}
                                            >
                                                <span>Персонаж</span>
                                            </button>
                                        )}

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

                                        <button type="button" className={`${styles.settingsItem} ${styles.settingsLogout}`} onClick={onLogoutConfirm}>Выйти</button>
                                    </div>
                                </div>
                            </div>,
                            document.body
                        )}

                        <div className={`${styles.mobileOverlay} ${isMobileDropdownOpen ? styles.mobileOverlayActive : ''}`} onClick={closeMenu} />
                        <div className={`${styles.mobileDropdown} ${isMobileDropdownOpen ? styles.mobileDropdownActive : ''}`}>
                            <div className={styles.mobileSettingsSection}>
                                {!isAdmin && (
                                    !dailyRewardsState?.progress?.isCompleted && (
                                        <button type="button" className={`${styles.mobileMenuItem} ${styles.referralBtnMobile}`} onClick={onOpenDailyRewards} disabled={isRewardsLoading}>
                                            <span>Награды 7 дней</span>
                                            <span className={styles.referralHelpWrap}>
                                                <span className={styles.referralHelp}>?</span>
                                                <span className={styles.referralTooltip}>
                                                    Ежедневные награды за первые 7 дней входа на платформу
                                                </span>
                                            </span>
                                        </button>
                                    )
                                )}

                                {!isAdmin && (
                                    <button type="button" className={`${styles.mobileMenuItem} ${styles.referralBtnMobile}`} onClick={onCopyReferralLink}>
                                        <span>Рефералка</span>
                                        <span className={styles.referralHelpWrap}>
                                            <span className={styles.referralHelp}>?</span>
                                            <span className={styles.referralTooltip}>
                                                Вы получите 10 монет, если кто-то зарегистрируется по вашей ссылке
                                            </span>
                                        </span>
                                    </button>
                                )}

                                {!isAdmin && (
                                    <button
                                        type="button"
                                        className={styles.mobileMenuItem}
                                        onClick={() => {
                                            closeMenu();
                                            navigate('/achievements');
                                        }}
                                    >
                                        Достижения
                                    </button>
                                )}

                                {!isAdmin && (
                                    <button
                                        type="button"
                                        className={styles.mobileMenuItem}
                                        onClick={() => {
                                            closeMenu();
                                            navigate('/character');
                                        }}
                                    >
                                        Персонаж
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className={`${styles.mobileMenuItem} ${styles.mobileThemeRow}`}
                                    onClick={async () => {
                                        await onToggleTheme();
                                    }}
                                >
                                    <span>Тема</span>
                                    <span className={styles.settingsValue}>{theme === 'dark' ? 'Тёмная' : 'Светлая'}</span>
                                </button>

                                <div className={styles.mobileLanguageRow}>
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

                            </div>

                            <div className={styles.mobileDivider} />

                            <div className={styles.mobileNavSection}>
                                {!isAdmin && (
                                    <>
                                        {authStore.isAuth && (
                                            <Link to="/ai-chat" className={`${styles.mobileNavLink} ${styles.mobileAiChatLink}`} onClick={closeMenu}>AI чат-бот</Link>
                                        )}
                                        {authStore.isAuth && (
                                            <>
                                                <Link to="/translate" className={styles.mobileNavLink} onClick={closeMenu}>Переводчик</Link>
                                                <Link to="/scanner" className={styles.mobileNavLink} onClick={closeMenu}>Сканер</Link>
                                            </>
                                        )}
                                    </>
                                )}

                                {authStore.isAuth && !isAdmin && (
                                    <>
                                        <Link to="/dictionary" className={styles.mobileNavLink} onClick={closeMenu}>Словарь</Link>
                                        <Link to="/courses" className={styles.mobileNavLink} onClick={closeMenu}>Материал</Link>
                                        {isAuthor && <Link to="/author/learning" className={styles.mobileNavLink} onClick={closeMenu}>Авторство</Link>}
                                        <Link to="/friends" className={styles.mobileNavLink} onClick={closeMenu}>Друзья</Link>
                                        <Link to="/chats" className={`${styles.mobileNavLink} ${styles.mobileChatLink}`} onClick={closeMenu}>
                                            Чаты
                                            {chatStore.unreadTotal > 0 && <span className={styles.chatBadge}>{chatStore.unreadTotal}</span>}
                                        </Link>
                                    </>
                                )}

                                {isAdmin && (
                                    <>
                                        <Link to="/words" className={styles.mobileNavLink} onClick={closeMenu}>Словарь</Link>
                                        <Link to="/admin/learning" className={styles.mobileNavLink} onClick={closeMenu}>Материал</Link>
                                        <Link to="/admin/users" className={styles.mobileNavLink} onClick={closeMenu}>Пользователи</Link>
                                        <Link to="/admin/misc" className={styles.mobileNavLink} onClick={closeMenu}>Остальное</Link>
                                    </>
                                )}
                            </div>

                            <div className={styles.mobileDivider} />

                            <button type="button" className={`${styles.mobileMenuItem} ${styles.settingsLogout}`} onClick={onLogoutConfirm}>
                                Выйти
                            </button>
                        </div>
                    </>
                )}

                {isRewardsModalOpen && createPortal(
                    <div className={styles.rewardsModalOverlay} onClick={() => setIsRewardsModalOpen(false)}>
                        <div className={styles.rewardsModalCard} onClick={(e) => e.stopPropagation()}>
                            <h3 className={styles.rewardsModalTitle}>Награды 7 дней</h3>
                            <div className={styles.rewardsGrid}>
                                {(dailyRewardsState?.rewards || []).map((item) => {
                                    const parts = [];
                                    if ((Number(item.coins) || 0) > 0) parts.push(`${item.coins} монет`);
                                    if ((Number(item.studyPoints) || 0) > 0) parts.push(`${item.studyPoints} опыта`);
                                    if (!parts.length) parts.push('Нет награды');
                                    const isClaimed = item.status === 'claimed';
                                    return (
                                        <div
                                            key={item.dayNumber}
                                            className={`${styles.rewardsDayCard} ${isClaimed ? styles.rewardsDayClaimed : ''}`}
                                        >
                                            <div className={styles.rewardsDayTitle}>День {item.dayNumber}</div>
                                            <div className={`${styles.rewardsDayReward} ${isClaimed ? styles.rewardsDayRewardClaimed : ''}`}>
                                                {parts.join(' · ')}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <button type="button" className={styles.rewardsModalCloseBtn} onClick={() => setIsRewardsModalOpen(false)}>
                                Закрыть
                            </button>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </nav>
    );
});

export default Navbar;
