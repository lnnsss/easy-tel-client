import React, { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import { useStores } from './stores/StoreContext';
import AppRouter from './router/AppRouter';
import Navbar from './components/Navbar/Navbar';
import AppModal from './components/AppModal/AppModal';
import Footer from './components/Footer/Footer';
import AchievementToast from './components/AchievementToast/AchievementToast';

const App = observer(() => {
    const { authStore, uiStore } = useStores();
    const navigate = useNavigate();
    const location = useLocation();
    const shownNoticeRef = useRef('');
    const hideNavbar = location.pathname === '/login' || location.pathname === '/register';
    const [activeAchievement, setActiveAchievement] = React.useState(null);
    const [isAchievementClosing, setIsAchievementClosing] = React.useState(false);
    const [copyToastClosing, setCopyToastClosing] = React.useState(false);
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
        '/words',
        '/admin'
    ];
    const isKnownRoute = knownRoutePatterns.some((pattern) => Boolean(matchPath({ path: pattern, end: true }, location.pathname)));
    const hideFooter = hideNavbar || !isKnownRoute;

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
            title: isApproved ? 'Роль автора одобрена' : 'Решение по заявке автора',
            message: isApproved
                ? 'Поздравляем! Вам выдана роль автора курсов.'
                : (notice.adminComment
                    ? `Заявка отклонена.\nКомментарий администратора: ${notice.adminComment}`
                    : 'Заявка отклонена. Вы можете подать новую заявку в любое время.'),
            variant: isApproved ? 'success' : 'info',
            secondaryLabel: 'Закрыть',
            onSecondary: async () => {
                uiStore.closeModal();
                await authStore.markAuthorRequestSeen(notice._id);
            }
        });
    }, [authStore.user?.authorRequestNotice?._id]);


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
            title: `Новое достижение: ${next.title}`
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
        return <div style={{textAlign: 'center', marginTop: '50px'}}>Загрузка сессии...</div>;
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
                    Восстанавливаем соединение с сервером...
                </div>
            )}
            <main className="app-main">
                <AppRouter />
            </main>
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
                variant={uiStore.modal.variant}
                primaryLabel={uiStore.modal.primaryLabel || 'В словарь'}
                secondaryLabel={uiStore.modal.secondaryLabel || 'Закрыть'}
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
