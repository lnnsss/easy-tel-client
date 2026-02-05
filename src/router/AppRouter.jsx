import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useStores } from '../stores/StoreContext';

import HomePage from '../pages/HomePage/HomePage';
import RecognizePage from '../pages/RecognizePage/RecognizePage';
import LoginPage from '../pages/Auth/LoginPage';
import RegisterPage from '../pages/Auth/RegisterPage';
import ProfilePage from '../pages/Profile/ProfilePage';
import DictionaryPage from '../pages/DictionaryPage/DictionaryPage';
import AdminDashboard from '../pages/Admin/AdminDashboard';

const AppRouter = observer(() => {
    const { authStore } = useStores();

    if (authStore.isLoading && !authStore.isAuth && localStorage.getItem('token')) {
        return null;
    }

    const isAdmin = authStore.isAuth && authStore.user?.role === 'admin';

    return (
        <Routes>
            <Route path="/" element={<HomePage />} />

            {/* Доступ к сканеру только для авторизованных НЕ админов */}
            <Route
                path="/scanner"
                element={authStore.isAuth && !isAdmin ? <RecognizePage /> : <Navigate to={isAdmin ? "/admin" : "/login"} />}
            />

            <Route
                path="/login"
                element={!authStore.isAuth ? <LoginPage /> : <Navigate to="/" />}
            />
            <Route
                path="/register"
                element={!authStore.isAuth ? <RegisterPage /> : <Navigate to="/" />}
            />

            <Route
                path="/profile"
                element={authStore.isAuth ? <ProfilePage /> : <Navigate to="/login" />}
            />

            <Route
                path="/dictionary"
                element={authStore.isAuth && !isAdmin ? <DictionaryPage /> : <Navigate to="/" />}
            />

            {/* ПАНЕЛЬ АДМИНИСТРАТОРА */}
            <Route
                path="/admin/*"
                element={isAdmin ? <AdminDashboard /> : <Navigate to="/" />}
            />

            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
});

export default AppRouter;