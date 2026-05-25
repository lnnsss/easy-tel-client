import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { observer } from 'mobx-react-lite';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStores } from '../../stores/StoreContext';
import styles from './Navbar.module.css';
import CourseService from '../../services/CourseService';
import { INTERFACE_LANG_KEY } from '../../i18n';

const Navbar = observer(() => {
    const { t, i18n } = useTranslation();
    const { authStore, chatStore, uiStore } = useStores();
    const navigate = useNavigate();
    const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
    const [isDesktopSettingsOpen, setIsDesktopSettingsOpen] = useState(false);
    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
    const [interfaceLang, setInterfaceLang] = useState(() => (
        i18n.language?.startsWith('tt') ? 'tt' : 'ru'
    ));
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

    useEffect(() => {
        const next = i18n.language?.startsWith('tt') ? 'tt' : 'ru';
        setInterfaceLang(next);
    }, [i18n.language]);

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
            title: t('navbar.settings.logout_confirm_title'),
            message: t('navbar.settings.logout_confirm_message'),
            variant: 'info',
            primaryLabel: t('navbar.settings.logout_confirm_yes'),
            secondaryLabel: t('navbar.settings.logout_confirm_no'),
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
                title: t('navbar.settings.ref_unavailable_title'),
                message: t('navbar.settings.ref_unavailable_message'),
                variant: 'info',
                secondaryLabel: t('navbar.settings.close')
            });
            return;
        }
        const origin = window.location.origin;
        const link = `${origin}/register?ref=${encodeURIComponent(refCode)}`;
        try {
            await navigator.clipboard.writeText(link);
            uiStore.showCopyToast(t('navbar.settings.copy_toast'));
        } catch {
            uiStore.showModal({
                title: t('navbar.settings.copy_failed_title'),
                message: `${t('navbar.settings.copy_failed_message')} ${link}`,
                variant: 'info',
                secondaryLabel: t('navbar.settings.close')
            });
        }
    };

    const onChangeInterfaceLang = async (lang) => {
        const next = lang === 'tt' ? 'tt' : 'ru';
        setInterfaceLang(next);
        localStorage.setItem(INTERFACE_LANG_KEY, next);
        await i18n.changeLanguage(next);
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
                                <Link to="/ai-chat" className={`${styles.link} ${styles.aiChatLink}`} onClick={closeMenu}>{t('navbar.menu.ai_chat')}</Link>
                            )}
                            {authStore.isAuth && (
                                <>
                                    <Link to="/translate" className={styles.link} onClick={closeMenu}>{t('navbar.menu.translator')}</Link>
                                    <Link to="/scanner" className={styles.link} onClick={closeMenu}>{t('navbar.menu.scanner')}</Link>
                                </>
                            )}
                        </>
                    )}

                    {authStore.isAuth && !isAdmin && (
                        <>
                            <Link to="/dictionary" className={styles.link} onClick={closeMenu}>{t('navbar.menu.dictionary')}</Link>
                            <Link to="/courses" className={styles.link} onClick={closeMenu}>{t('navbar.menu.materials')}</Link>
                            {isAuthor && <Link to="/author/learning" className={styles.link} onClick={closeMenu}>{t('navbar.menu.authoring')}</Link>}
                            <Link to="/friends" className={styles.link} onClick={closeMenu}>{t('navbar.menu.friends')}</Link>
                            <Link to="/chats" className={`${styles.link} ${styles.chatLink}`} onClick={closeMenu}>
                                {t('navbar.menu.chats')}
                                {chatStore.unreadTotal > 0 && <span className={styles.chatBadge}>{chatStore.unreadTotal}</span>}
                            </Link>
                        </>
                    )}

                    {isAdmin && (
                        <>
                            <Link to="/words" className={styles.link} onClick={closeMenu}>{t('navbar.menu.dictionary')}</Link>
                            <Link to="/admin/learning" className={styles.link} onClick={closeMenu}>{t('navbar.menu.materials')}</Link>
                            <Link to="/admin/users" className={styles.link} onClick={closeMenu}>{t('navbar.menu.users')}</Link>
                            <Link to="/admin/misc" className={styles.link} onClick={closeMenu}>{t('navbar.menu.misc')}</Link>
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
                                aria-label={t('navbar.settings.aria_profile')}
                            >
                                {profileAvatarSrc && !avatarLoadFailed ? (
                                    <img
                                        src={profileAvatarSrc}
                                        alt={t('navbar.settings.aria_profile')}
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
                                aria-label={t('navbar.settings.aria_settings')}
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
                                <Link to="/login" className={styles.link} onClick={closeMenu}>{t('navbar.auth.login')}</Link>
                                <Link to="/register" className={styles.btnRegister} onClick={closeMenu}>{t('navbar.auth.register')}</Link>
                            </div>
                            <Link to="/login" className={styles.mobileLoginBtn} onClick={closeMenu}>{t('navbar.auth.login')}</Link>
                        </>
                    )}
                </div>

                {authStore.isAuth && (
                    <>
                        {isDesktopSettingsOpen && window.innerWidth > 1040 && createPortal(
                            <div className={styles.settingsOverlay} onClick={closeMenu}>
                                <div className={styles.settingsModal} onClick={(e) => e.stopPropagation()}>
                                    <div className={styles.settingsHead}>
                                        <h3 className={styles.settingsTitle}>{t('navbar.settings.title')}</h3>
                                        <button type="button" className={styles.settingsCloseBtn} onClick={closeMenu} aria-label={t('navbar.settings.aria_close')}>×</button>
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
                                                    <span>{t('navbar.settings.rewards7')}</span>
                                                    <span className={styles.referralHelpWrap}>
                                                        <span className={styles.referralHelp}>?</span>
                                                        <span className={styles.referralTooltip}>
                                                            {t('navbar.settings.rewards_tooltip')}
                                                        </span>
                                                    </span>
                                                </button>
                                            )
                                        )}

                                        {!isAdmin && (
                                            <button type="button" className={styles.referralBtn} onClick={onCopyReferralLink}>
                                                <span>{t('navbar.settings.referral')}</span>
                                                <span className={styles.referralHelpWrap}>
                                                    <span className={styles.referralHelp}>?</span>
                                                    <span className={styles.referralTooltip}>
                                                        {t('navbar.settings.ref_tooltip')}
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
                                                <span>{t('navbar.settings.achievements')}</span>
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
                                                <span>{t('navbar.settings.character')}</span>
                                            </button>
                                        )}

                                        <button type="button" className={styles.settingsItem} onClick={onToggleTheme}>
                                            <span>{t('navbar.settings.theme')}</span>
                                            <span className={styles.settingsValue}>{theme === 'dark' ? t('navbar.settings.theme_dark') : t('navbar.settings.theme_light')}</span>
                                        </button>

                                        <div className={styles.settingsControlRow}>
                                            <span className={styles.settingsControlLabel}>{t('navbar.settings.language')}</span>
                                            <div className={styles.segmentedControl} role="group" aria-label={t('navbar.settings.aria_language')}>
                                                {[
                                                    { value: 'ru', label: 'ру' },
                                                    { value: 'tt', label: 'тат' }
                                                ].map((langOption) => (
                                                    <button
                                                        key={langOption.value}
                                                        type="button"
                                                        className={`${styles.segmentedBtn} ${interfaceLang === langOption.value ? styles.segmentedBtnActive : ''}`}
                                                        onClick={() => onChangeInterfaceLang(langOption.value)}
                                                    >
                                                        {langOption.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <button type="button" className={`${styles.settingsItem} ${styles.settingsLogout}`} onClick={onLogoutConfirm}>{t('navbar.settings.logout')}</button>
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
                                            <span>{t('navbar.settings.rewards7')}</span>
                                            <span className={styles.referralHelpWrap}>
                                                <span className={styles.referralHelp}>?</span>
                                                <span className={styles.referralTooltip}>
                                                    {t('navbar.settings.rewards_tooltip')}
                                                </span>
                                            </span>
                                        </button>
                                    )
                                )}

                                {!isAdmin && (
                                    <button type="button" className={`${styles.mobileMenuItem} ${styles.referralBtnMobile}`} onClick={onCopyReferralLink}>
                                        <span>{t('navbar.settings.referral')}</span>
                                        <span className={styles.referralHelpWrap}>
                                            <span className={styles.referralHelp}>?</span>
                                            <span className={styles.referralTooltip}>
                                                {t('navbar.settings.ref_tooltip')}
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
                                        {t('navbar.settings.achievements')}
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
                                        {t('navbar.settings.character')}
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className={`${styles.mobileMenuItem} ${styles.mobileThemeRow}`}
                                    onClick={async () => {
                                        await onToggleTheme();
                                    }}
                                >
                                    <span>{t('navbar.settings.theme')}</span>
                                    <span className={styles.settingsValue}>{theme === 'dark' ? t('navbar.settings.theme_dark') : t('navbar.settings.theme_light')}</span>
                                </button>

                                <div className={styles.mobileLanguageRow}>
                                    <span className={styles.settingsControlLabel}>{t('navbar.settings.language')}</span>
                                    <div className={styles.segmentedControl} role="group" aria-label={t('navbar.settings.aria_language')}>
                                        {[
                                            { value: 'ru', label: 'ру' },
                                            { value: 'tt', label: 'тат' }
                                        ].map((langOption) => (
                                            <button
                                                key={langOption.value}
                                                type="button"
                                                className={`${styles.segmentedBtn} ${interfaceLang === langOption.value ? styles.segmentedBtnActive : ''}`}
                                                onClick={() => onChangeInterfaceLang(langOption.value)}
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
                                            <Link to="/ai-chat" className={`${styles.mobileNavLink} ${styles.mobileAiChatLink}`} onClick={closeMenu}>{t('navbar.menu.ai_chat')}</Link>
                                        )}
                                        {authStore.isAuth && (
                                            <>
                                                <Link to="/translate" className={styles.mobileNavLink} onClick={closeMenu}>{t('navbar.menu.translator')}</Link>
                                                <Link to="/scanner" className={styles.mobileNavLink} onClick={closeMenu}>{t('navbar.menu.scanner')}</Link>
                                            </>
                                        )}
                                    </>
                                )}

                                {authStore.isAuth && !isAdmin && (
                                    <>
                                        <Link to="/dictionary" className={styles.mobileNavLink} onClick={closeMenu}>{t('navbar.menu.dictionary')}</Link>
                                        <Link to="/courses" className={styles.mobileNavLink} onClick={closeMenu}>{t('navbar.menu.materials')}</Link>
                                        {isAuthor && <Link to="/author/learning" className={styles.mobileNavLink} onClick={closeMenu}>{t('navbar.menu.authoring')}</Link>}
                                        <Link to="/friends" className={styles.mobileNavLink} onClick={closeMenu}>{t('navbar.menu.friends')}</Link>
                                        <Link to="/chats" className={`${styles.mobileNavLink} ${styles.mobileChatLink}`} onClick={closeMenu}>
                                            {t('navbar.menu.chats')}
                                            {chatStore.unreadTotal > 0 && <span className={styles.chatBadge}>{chatStore.unreadTotal}</span>}
                                        </Link>
                                    </>
                                )}

                                {isAdmin && (
                                    <>
                                        <Link to="/words" className={styles.mobileNavLink} onClick={closeMenu}>{t('navbar.menu.dictionary')}</Link>
                                        <Link to="/admin/learning" className={styles.mobileNavLink} onClick={closeMenu}>{t('navbar.menu.materials')}</Link>
                                        <Link to="/admin/users" className={styles.mobileNavLink} onClick={closeMenu}>{t('navbar.menu.users')}</Link>
                                        <Link to="/admin/misc" className={styles.mobileNavLink} onClick={closeMenu}>{t('navbar.menu.misc')}</Link>
                                    </>
                                )}
                            </div>

                            <div className={styles.mobileDivider} />

                            <button type="button" className={`${styles.mobileMenuItem} ${styles.settingsLogout}`} onClick={onLogoutConfirm}>
                                {t('navbar.settings.logout')}
                            </button>
                        </div>
                    </>
                )}

                {isRewardsModalOpen && createPortal(
                    <div className={styles.rewardsModalOverlay} onClick={() => setIsRewardsModalOpen(false)}>
                        <div className={styles.rewardsModalCard} onClick={(e) => e.stopPropagation()}>
                            <h3 className={styles.rewardsModalTitle}>{t('navbar.rewards_modal.title')}</h3>
                            <div className={styles.rewardsGrid}>
                                {(dailyRewardsState?.rewards || []).map((item) => {
                                    const parts = [];
                                    if ((Number(item.coins) || 0) > 0) parts.push(`${item.coins} ${t('navbar.rewards_modal.coins')}`);
                                    if ((Number(item.studyPoints) || 0) > 0) parts.push(`${item.studyPoints} ${t('navbar.rewards_modal.xp')}`);
                                    if (!parts.length) parts.push(t('navbar.rewards_modal.no_reward'));
                                    const isClaimed = item.status === 'claimed';
                                    return (
                                        <div
                                            key={item.dayNumber}
                                            className={`${styles.rewardsDayCard} ${isClaimed ? styles.rewardsDayClaimed : ''}`}
                                        >
                                            <div className={styles.rewardsDayTitle}>{t('navbar.rewards_modal.day')} {item.dayNumber}</div>
                                            <div className={`${styles.rewardsDayReward} ${isClaimed ? styles.rewardsDayRewardClaimed : ''}`}>
                                                {parts.join(' · ')}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <button type="button" className={styles.rewardsModalCloseBtn} onClick={() => setIsRewardsModalOpen(false)}>
                                {t('navbar.rewards_modal.close')}
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
