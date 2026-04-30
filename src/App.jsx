import React, { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { useStores } from './stores/StoreContext';
import AppRouter from './router/AppRouter';
import Navbar from './components/Navbar/Navbar';
import AppModal from './components/AppModal/AppModal';

const App = observer(() => {
    const { authStore, uiStore } = useStores();
    const navigate = useNavigate();
    const shownNoticeRef = useRef('');

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

    // Если приложение проверяет токен в данный момент
    if (authStore.isLoading && !authStore.isAuth && localStorage.getItem('token')) {
        return <div style={{textAlign: 'center', marginTop: '50px'}}>Загрузка сессии...</div>;
    }

    return (
        <>
            <Navbar />
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
            <AppRouter />
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
        </>
    );
});

export default App;
