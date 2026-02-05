import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useStores } from '../stores/StoreContext';

// Импорт страниц
import HomePage from '../pages/HomePage/HomePage';
import RecognizePage from '../pages/RecognizePage/RecognizePage';
import LoginPage from '../pages/Auth/LoginPage';
import RegisterPage from '../pages/Auth/RegisterPage';
import ProfilePage from '../pages/Profile/ProfilePage';

const AdminDashboard = () => (
    <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Панель администратора</h1>
        <p>Управление словами и пользователями системы</p>
    </div>
);

const NotFoundPage = () => (
    <div style={{ padding: '100px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', color: '#27ae60' }}>404</h1>
        <h2>Страница не найдена</h2>
        <p>Запрашиваемый ресурс был перемещен или удален.</p>
        <a href="/" style={{ color: '#27ae60', textDecoration: 'underline' }}>Вернуться на главную</a>
    </div>
);

const AppRouter = observer(() => {
    const { authStore } = useStores();

    if (authStore.isLoading && !authStore.isAuth && localStorage.getItem('token')) {
        return null;
    }

    return (
        <Routes>
            {/* --- ПУБЛИЧНЫЕ РОУТЫ --- */}
            <Route path="/" element={<HomePage />} />
            <Route path="/scanner" element={<RecognizePage />} />

            {/* --- РОУТЫ ДЛЯ ГОСТЕЙ --- */}
            <Route
                path="/login"
                element={!authStore.isAuth ? <LoginPage /> : <Navigate to="/profile" />}
            />
            <Route
                path="/register"
                element={!authStore.isAuth ? <RegisterPage /> : <Navigate to="/profile" />}
            />

            {/* --- ПРИВАТНЫЕ РОУТЫ --- */}
            <Route
                path="/profile"
                element={authStore.isAuth ? <ProfilePage /> : <Navigate to="/login" />}
            />

            {/* --- АДМИН ПАНЕЛЬ --- */}
            <Route
                path="/admin/*"
                element={
                    authStore.isAuth && authStore.user?.role === 'admin'
                        ? <AdminDashboard />
                        : <Navigate to="/" />
                }
            />

            {/* --- 404 --- */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
});

export default AppRouter;