import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from './stores/StoreContext';
import AppRouter from './router/AppRouter';
import Navbar from './components/Navbar/Navbar';

const App = observer(() => {
    const { authStore } = useStores();

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
        </>
    );
});

export default App;