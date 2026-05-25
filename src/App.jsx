import React, { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStores } from './stores/StoreContext';
import AppRouter from './router/AppRouter';
import Navbar from './components/Navbar/Navbar';
import AppModal from './components/AppModal/AppModal';
import Footer from './components/Footer/Footer';
import AchievementToast from './components/AchievementToast/AchievementToast';
import CourseService from './services/CourseService';

const App = observer(() => {
    const { t } = useTranslation();
    const { authStore, uiStore } = useStores();
    const navigate = useNavigate();
    const location = useLocation();
    const shownNoticeRef = useRef('');
    const hideNavbar = location.pathname === '/login' || location.pathname === '/register';
    const [activeAchievement, setActiveAchievement] = React.useState(null);
    const [isAchievementClosing, setIsAchievementClosing] = React.useState(false);
    const [copyToastClosing, setCopyToastClosing] = React.useState(false);
    const dailyRewardPromptedRef = useRef('');
    const knownRoutePatterns = [
        '/',
        '/translate',
        '/scanner',
        '/login',
        '/register',
        '/forgot-password',
        '/reset-password',
        '/google-auth-callback',
        '/verify-email',
        '/profile',
        '/u/:username',
        '/dictionary',
        '/dictionary/assessment',
        '/character',
        '/achievements',
        '/friends',
        '/chats',
        '/ai-chat',
        '/courses',
        '/courses/:courseId',
        '/admin/learning',
        '/admin/learning/courses/new',
        '/admin/learning/courses/:courseId',
        '/admin/learning/courses/:courseId/topics/new',
        '/admin/learning/courses/:courseId/topics/:topicId/edit',
        '/author/learning',
        '/author/learning/courses/new',
        '/author/learning/courses/:courseId',
        '/author/learning/courses/:courseId/topics/new',
        '/author/learning/courses/:courseId/topics/:topicId/edit',
        '/admin/users',
        '/admin/misc',
        '/words',
        '/admin'
    ];
    const isKnownRoute = knownRoutePatterns.some((pattern) => Boolean(matchPath({ path: pattern, end: true }, location.pathname)));
    const hideFooter = hideNavbar || !isKnownRoute;
    const shouldShowFloatingAiButton = authStore.isAuth
        && authStore.user?.role !== 'admin'
        && !hideNavbar
        && location.pathname !== '/ai-chat';

    useEffect(() => {
        // Проверяем токен при загрузке вкладки
        authStore.checkAuth();
    }, []);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const initialTheme = savedTheme === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', initialTheme);
    }, []);

    useEffect(() => {
        const notice = authStore.user?.authorRequestNotice;
        if (!notice?._id) return;
        if (shownNoticeRef.current === String(notice._id)) return;
        shownNoticeRef.current = String(notice._id);

        const isApproved = notice.status === 'approved';
        uiStore.showModal({
            title: isApproved ? t('app.modals.author_approved_title') : t('app.modals.author_decision_title'),
            message: isApproved
                ? t('app.modals.author_approved_message')
                : (notice.adminComment
                    ? `${t('app.modals.author_rejected_with_comment')}\n${t('app.modals.admin_comment')}: ${notice.adminComment}`
                    : t('app.modals.author_rejected_message')),
            variant: isApproved ? 'success' : 'info',
            secondaryLabel: t('common.close'),
            onSecondary: async () => {
                uiStore.closeModal();
                await authStore.markAuthorRequestSeen(notice._id);
            }
        });
    }, [authStore.user?.authorRequestNotice?._id]);

    useEffect(() => {
        const loadDailyRewardModal = async () => {
            if (!authStore.isAuth) return;
            if (authStore.user?.role === 'admin') return;
            if (uiStore.modal.isOpen) return;

            const userId = String(authStore.user?._id || '');
            if (!userId || dailyRewardPromptedRef.current === userId) return;

            try {
                const { data } = await CourseService.getDailyRewards();
                if (!data?.shouldShowLoginModalToday || data?.progress?.isCompleted) {
                    dailyRewardPromptedRef.current = userId;
                    return;
                }

                await CourseService.markDailyRewardModalSeen();

                const day = data.progress?.currentDay;
                const reward = data.currentReward || { coins: 0, studyPoints: 0 };
                dailyRewardPromptedRef.current = userId;
                const rewardParts = [];
                if ((Number(reward.coins) || 0) > 0) rewardParts.push(`${reward.coins} ${t('navbar.rewards_modal.coins')}`);
                if ((Number(reward.studyPoints) || 0) > 0) rewardParts.push(`${reward.studyPoints} ${t('navbar.rewards_modal.xp')}`);
                if (!rewardParts.length) rewardParts.push(t('app.modals.no_bonus'));
                const message = day <= 1
                    ? `${t('app.modals.first_day_reward')} ${rewardParts.join(', ')}.`
                    : `${t('app.modals.streak_reward_prefix', { day })} ${rewardParts.join(', ')}.`;

                uiStore.showModal({
                    title: t('app.modals.login_reward_title'),
                    message,
                    disableClose: true,
                    variant: 'success',
                    primaryLabel: t('app.modals.claim'),
                    secondaryLabel: '',
                    onPrimary: async () => {
                        try {
                            const claimRes = await CourseService.claimDailyReward();
                            authStore.applyRewardBalances(claimRes.data?.balances || {});
                            uiStore.closeModal();
                        } catch (e) {
                            uiStore.showModal({
                                title: t('app.modals.claim_failed_title'),
                                message: e.response?.data?.message || t('app.modals.try_again'),
                                variant: 'error',
                                secondaryLabel: t('common.close')
                            });
                        }
                    },
                    onSecondary: () => uiStore.closeModal()
                });
            } catch (e) {
                dailyRewardPromptedRef.current = userId;
                console.error('daily rewards modal error', e);
            }
        };

        loadDailyRewardModal();
    }, [authStore.isAuth, authStore.user?._id, authStore.user?.role, uiStore, uiStore.modal.isOpen]);


    useEffect(() => {
        const handler = (event) => {
            const unlocked = Array.isArray(event?.detail) ? event.detail : [];
            if (unlocked.length) {
                uiStore.enqueueAchievements(unlocked);
            }
        };
        window.addEventListener('achievements:unlocked', handler);
        return () => window.removeEventListener('achievements:unlocked', handler);
    }, [uiStore]);

    useEffect(() => {
        if (activeAchievement) return;
        if (!uiStore.achievementQueue.length) return;
        const next = uiStore.shiftAchievement();
        if (!next) return;
        setIsAchievementClosing(false);
        setActiveAchievement({
            ...next,
            title: `${t('app.achievement.new_prefix')} ${next.title}`
        });
    }, [activeAchievement, uiStore, uiStore.achievementQueue.length]);

    useEffect(() => {
        if (!activeAchievement) return;
        const closeTimer = setTimeout(() => setIsAchievementClosing(true), 4300);
        const clearTimer = setTimeout(() => {
            setActiveAchievement(null);
            setIsAchievementClosing(false);
        }, 5000);
        return () => {
            clearTimeout(closeTimer);
            clearTimeout(clearTimer);
        };
    }, [activeAchievement]);

    useEffect(() => {
        if (!uiStore.copyToast.isOpen) return;
        setCopyToastClosing(false);
        const closeTimer = setTimeout(() => setCopyToastClosing(true), 1400);
        const clearTimer = setTimeout(() => {
            uiStore.hideCopyToast();
            setCopyToastClosing(false);
        }, 2000);
        return () => {
            clearTimeout(closeTimer);
            clearTimeout(clearTimer);
        };
    }, [uiStore, uiStore.copyToast.isOpen, uiStore.copyToast.message]);

    // Если приложение проверяет токен в данный момент
    if (authStore.isLoading && !authStore.isAuth && localStorage.getItem('token')) {
        return <div style={{textAlign: 'center', marginTop: '50px'}}>{t('app.loading_session')}</div>;
    }

    return (
        <div className="app-shell">
            {!hideNavbar && <Navbar />}
            {authStore.authRecovering && localStorage.getItem('token') && (
                <div
                    style={{
                        textAlign: 'center',
                        padding: '8px 12px',
                        fontSize: '0.9rem',
                        color: '#7a5a00',
                        background: '#fff7d6',
                        borderBottom: '1px solid #f0e1a6'
                    }}
                >
                    {t('app.reconnecting')}
                </div>
            )}
            <main className="app-main">
                <AppRouter />
            </main>
            {shouldShowFloatingAiButton && (
                <button
                    type="button"
                    className="floating-ai-button"
                    onClick={() => navigate('/ai-chat')}
                    aria-label={t('pages.ai_chat.title')}
                >
                    AI
                </button>
            )}
            {!hideFooter && <Footer />}
            {activeAchievement && <AchievementToast item={activeAchievement} isClosing={isAchievementClosing} />}
            {uiStore.copyToast.isOpen && (
                <AchievementToast
                    item={{ title: uiStore.copyToast.message }}
                    isClosing={copyToastClosing}
                />
            )}
            <AppModal
                isOpen={uiStore.modal.isOpen}
                title={uiStore.modal.title}
                message={uiStore.modal.message}
                content={uiStore.modal.content}
                variant={uiStore.modal.variant}
                disableClose={uiStore.modal.disableClose}
                primaryLabel={uiStore.modal.primaryLabel || t('common.to_dictionary')}
                secondaryLabel={uiStore.modal.secondaryLabel || t('common.close')}
                onPrimary={uiStore.modal.onPrimary || (uiStore.modal.primaryRoute ? () => {
                    navigate(uiStore.modal.primaryRoute);
                    uiStore.closeModal();
                } : null)}
                onSecondary={uiStore.modal.onSecondary || null}
                onClose={() => uiStore.closeModal()}
            />
        </div>
    );
});

export default App;
