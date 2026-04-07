import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStores } from '../../stores/StoreContext';
import styles from './Profile.module.css';

const AdminProfile = ({ user }) => {
    const { authStore } = useStores();
    const navigate = useNavigate();
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        setTheme(currentTheme === 'dark' ? 'dark' : 'light');
    }, []);

    const toggleTheme = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('theme', nextTheme);
        setTheme(nextTheme);
    };

    const onLogout = () => {
        authStore.logout();
        navigate('/login');
    };

    return (
        <div className={styles.adminContainer}>
            <div className={styles.header}>
                <h1 className={styles.fullName}>{user.firstName} {user.lastName}</h1>
                <div className={styles.adminBadge}>Администратор</div>
            </div>

            <div className={styles.adminInfoCard}>
                <h3>Управление системой</h3>
                <p className={styles.adminText}>
                    Вы вошли как администратор. Вам доступны функции редактирования базы слов и управления контентом.
                </p>
                <div className={styles.profileActions}>
                    <button type="button" className={styles.themeToggleBtn} onClick={toggleTheme}>
                        Сменить тему: {theme === 'dark' ? 'Тёмная' : 'Светлая'}
                    </button>
                    <button type="button" className={styles.logoutBtn} onClick={onLogout}>
                        Выйти
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminProfile;
