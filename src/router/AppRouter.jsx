import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useStores } from '../stores/StoreContext';

import HomePage from '../pages/HomePage/HomePage';
import RecognizePage from '../pages/RecognizePage/RecognizePage';
import LoginPage from '../pages/Auth/LoginPage';
import RegisterPage from '../pages/Auth/RegisterPage';
import VerifyEmailPage from '../pages/Auth/VerifyEmailPage';
import ForgotPasswordPage from '../pages/Auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/Auth/ResetPasswordPage';
import GoogleAuthCallbackPage from '../pages/Auth/GoogleAuthCallbackPage';
import ProfilePage from '../pages/Profile/ProfilePage';
import PublicProfilePage from '../pages/Profile/PublicProfilePage';
import DictionaryPage from '../pages/DictionaryPage/DictionaryPage';
import FriendsPage from '../pages/FriendsPage/FriendsPage';
import ChatsPage from '../pages/ChatsPage/ChatsPage';
import TranslatePage from '../pages/TranslatePage/TranslatePage';
import AdminDashboard from '../pages/Admin/AdminDashboard';
import CoursesPage from '../pages/Courses/CoursesPage';
import CourseDetailPage from '../pages/Courses/CourseDetailPage';
import AdminLearningPage from '../pages/Admin/AdminLearningPage';
import AdminLearningCoursePage from '../pages/Admin/AdminLearningCoursePage';
import AdminTopicEditorPage from '../pages/Admin/AdminTopicEditorPage';
import AdminCourseEditorPage from '../pages/Admin/AdminCourseEditorPage';
import AdminUsersPage from '../pages/Admin/AdminUsersPage';
import NotFoundPage from '../pages/NotFoundPage/NotFoundPage';
import AuthorLearningPage from '../pages/Author/AuthorLearningPage';
import AuthorLearningCoursePage from '../pages/Author/AuthorLearningCoursePage';
import AuthorCourseEditorPage from '../pages/Author/AuthorCourseEditorPage';
import AuthorTopicEditorPage from '../pages/Author/AuthorTopicEditorPage';

const AppRouter = observer(() => {
    const { authStore } = useStores();

    if (authStore.isLoading && !authStore.isAuth && localStorage.getItem('token')) {
        return null;
    }

    const isAdmin = authStore.isAuth && authStore.user?.role === 'admin';
    const isAuthor = authStore.isAuth && authStore.user?.role === 'author';

    return (
        <Routes>
            <Route path="/" element={isAdmin ? <Navigate to="/admin" /> : <HomePage />} />
            <Route path="/translate" element={<TranslatePage />} />

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
                path="/forgot-password"
                element={!authStore.isAuth ? <ForgotPasswordPage /> : <Navigate to="/" />}
            />
            <Route
                path="/reset-password"
                element={!authStore.isAuth ? <ResetPasswordPage /> : <Navigate to="/" />}
            />
            <Route
                path="/google-auth-callback"
                element={<GoogleAuthCallbackPage />}
            />
            <Route
                path="/verify-email"
                element={authStore.isAuth ? <VerifyEmailPage /> : <Navigate to="/login" />}
            />

            <Route
                path="/profile"
                element={authStore.isAuth ? (isAdmin ? <Navigate to="/admin" /> : <ProfilePage />) : <Navigate to="/login" />}
            />

            <Route
                path="/u/:username"
                element={authStore.isAuth ? <PublicProfilePage /> : <Navigate to="/login" />}
            />

            <Route
                path="/dictionary"
                element={authStore.isAuth && !isAdmin ? <DictionaryPage /> : <Navigate to="/" />}
            />

            <Route
                path="/friends"
                element={authStore.isAuth && !isAdmin ? <FriendsPage /> : <Navigate to="/" />}
            />

            <Route
                path="/chats"
                element={authStore.isAuth && !isAdmin ? <ChatsPage /> : <Navigate to="/" />}
            />

            <Route
                path="/courses"
                element={authStore.isAuth && !isAdmin ? <CoursesPage /> : <Navigate to="/" />}
            />

            <Route
                path="/courses/:courseId"
                element={authStore.isAuth && !isAdmin ? <CourseDetailPage /> : <Navigate to="/" />}
            />

            <Route
                path="/admin/learning"
                element={isAdmin ? <AdminLearningPage /> : <Navigate to="/" />}
            />
            <Route
                path="/admin/learning/courses/new"
                element={isAdmin ? <AdminCourseEditorPage /> : <Navigate to="/" />}
            />

            <Route
                path="/admin/learning/courses/:courseId"
                element={isAdmin ? <AdminLearningCoursePage /> : <Navigate to="/" />}
            />
            <Route
                path="/admin/learning/courses/:courseId/topics/new"
                element={isAdmin ? <AdminTopicEditorPage /> : <Navigate to="/" />}
            />
            <Route
                path="/admin/learning/courses/:courseId/topics/:topicId/edit"
                element={isAdmin ? <AdminTopicEditorPage /> : <Navigate to="/" />}
            />

            <Route
                path="/author/learning"
                element={isAuthor ? <AuthorLearningPage /> : <Navigate to="/" />}
            />
            <Route
                path="/author/learning/courses/new"
                element={isAuthor ? <AuthorCourseEditorPage /> : <Navigate to="/" />}
            />

            <Route
                path="/author/learning/courses/:courseId"
                element={isAuthor ? <AuthorLearningCoursePage /> : <Navigate to="/" />}
            />
            <Route
                path="/author/learning/courses/:courseId/topics/new"
                element={isAuthor ? <AuthorTopicEditorPage /> : <Navigate to="/" />}
            />
            <Route
                path="/author/learning/courses/:courseId/topics/:topicId/edit"
                element={isAuthor ? <AuthorTopicEditorPage /> : <Navigate to="/" />}
            />

            <Route
                path="/admin/users"
                element={isAdmin ? <AdminUsersPage /> : <Navigate to="/" />}
            />

            <Route
                path="/words"
                element={isAdmin ? <AdminDashboard /> : <Navigate to="/" />}
            />

            <Route
                path="/admin"
                element={isAdmin ? <ProfilePage /> : <Navigate to="/" />}
            />

            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
});

export default AppRouter;
