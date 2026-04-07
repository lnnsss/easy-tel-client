import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { useStores } from './stores/StoreContext';
import AppRouter from './router/AppRouter';
import Navbar from './components/Navbar/Navbar';
import AppModal from './components/AppModal/AppModal';

const App = observer(() => {
    const { authStore, uiStore } = useStores();
    const navigate = useNavigate();

    useEffect(() => {
        // Проверяем токен при загрузке вкладки
        authStore.checkAuth();
    }, []);

    // Если приложение проверяет токен в данный момент
    if (authStore.isLoading && !authStore.isAuth && localStorage.getItem('token')) {
        return <div style={{textAlign: 'center', marginTop: '50px'}}>Загрузка сессии...</div>;
    }

    return (
        <>
            <Navbar />
            <AppRouter />
            <AppModal
                isOpen={uiStore.modal.isOpen}
                title={uiStore.modal.title}
                message={uiStore.modal.message}
                variant={uiStore.modal.variant}
                primaryLabel={uiStore.modal.primaryLabel || 'В словарь'}
                secondaryLabel={uiStore.modal.secondaryLabel || 'Закрыть'}
                onPrimary={uiStore.modal.primaryRoute ? () => {
                    navigate(uiStore.modal.primaryRoute);
                    uiStore.closeModal();
                } : null}
                onClose={() => uiStore.closeModal()}
            />
        </>
    );
});

export default App;
