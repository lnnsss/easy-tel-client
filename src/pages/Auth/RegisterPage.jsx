import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate, Link } from 'react-router-dom';
import { useStores } from '../../stores/StoreContext';
import styles from './Auth.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^\p{L}+$/u;
const USERNAME_ALLOWED_REGEX = /^[A-Za-z0-9]+$/;
const USERNAME_HAS_LETTER_REGEX = /[A-Za-z]/;
const PASSWORD_ALLOWED_REGEX = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]+$/;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

const RegisterPage = observer(() => {
    const { authStore } = useStores();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        username: '',
        firstName: '',
        lastName: ''
    });
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const email = form.email.trim();
        const username = form.username.trim();
        const firstName = form.firstName.trim();
        const lastName = form.lastName.trim();

        if (form.password !== form.confirmPassword) {
            setError('Пароли не совпадают');
            return;
        }

        if (!NAME_REGEX.test(firstName) || !NAME_REGEX.test(lastName)) {
            setError('Имя и фамилия должны содержать только буквы');
            return;
        }

        if (firstName.length < 3 || lastName.length < 3) {
            setError('Имя и фамилия должны содержать минимум 3 символа');
            return;
        }

        if (!EMAIL_REGEX.test(email)) {
            setError('Некорректный email');
            return;
        }

        if (username.length < 3) {
            setError('Username должен содержать минимум 3 символа');
            return;
        }

        if (!USERNAME_ALLOWED_REGEX.test(username) || !USERNAME_HAS_LETTER_REGEX.test(username)) {
            setError('Username: только английские буквы и цифры, минимум одна буква');
            return;
        }

        if (form.password.length < 8) {
            setError('Пароль должен содержать минимум 8 символов');
            return;
        }

        if (!PASSWORD_ALLOWED_REGEX.test(form.password)) {
            setError('Пароль может содержать только английские буквы, цифры и спецсимволы');
            return;
        }

        if (!PASSWORD_COMPLEXITY_REGEX.test(form.password)) {
            setError('Пароль должен содержать заглавные/строчные буквы, цифру и спецсимвол');
            return;
        }

        const preparedForm = {
            ...form,
            email,
            username,
            firstName,
            lastName
        };
        const { confirmPassword, ...registerData } = preparedForm;
        const res = await authStore.register(registerData);
        if (res.success) navigate('/profile');
        else setError(res.message);
    };

    return (
        <div className={styles.container}>
            <form className={styles.card} onSubmit={onSubmit}>
                <h1>Регистрация в <span className={styles.brand}>EasyTel</span></h1>
                {error && <p className={styles.error}>{error}</p>}

                <div className={styles.grid}>
                    <input
                        placeholder="Имя"
                        value={form.firstName}
                        onChange={e => {
                            setForm({...form, firstName: e.target.value});
                            if (error) setError('');
                        }}
                        required
                    />
                    <input
                        placeholder="Фамилия"
                        value={form.lastName}
                        onChange={e => {
                            setForm({...form, lastName: e.target.value});
                            if (error) setError('');
                        }}
                        required
                    />
                </div>
                <input
                    placeholder="Username"
                    value={form.username}
                    onChange={e => {
                        setForm({...form, username: e.target.value});
                        if (error) setError('');
                    }}
                    required
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={e => {
                        setForm({...form, email: e.target.value});
                        if (error) setError('');
                    }}
                    required
                />

                <div className={styles.passwordField}>
                    <input
                        className={styles.passwordInput}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Пароль"
                        value={form.password}
                        onChange={e => {
                            setForm({...form, password: e.target.value});
                            if (error) setError('');
                        }}
                        required
                    />
                    <button
                        type="button"
                        className={styles.togglePasswordBtn}
                        onClick={() => setShowPassword(prev => !prev)}
                        aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                    >
                        <svg
                            className={styles.eyeIcon}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                            <circle cx="12" cy="12" r="3" />
                            {showPassword && <line x1="3" y1="21" x2="21" y2="3" />}
                        </svg>
                    </button>
                </div>

                <div className={styles.passwordField}>
                    <input
                        className={styles.passwordInput}
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Подтвердите пароль"
                        value={form.confirmPassword}
                        onChange={e => {
                            setForm({...form, confirmPassword: e.target.value});
                            if (error) setError('');
                        }}
                        required
                    />
                    <button
                        type="button"
                        className={styles.togglePasswordBtn}
                        onClick={() => setShowConfirmPassword(prev => !prev)}
                        aria-label={showConfirmPassword ? 'Скрыть пароль' : 'Показать пароль'}
                    >
                        <svg
                            className={styles.eyeIcon}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                            <circle cx="12" cy="12" r="3" />
                            {showConfirmPassword && <line x1="3" y1="21" x2="21" y2="3" />}
                        </svg>
                    </button>
                </div>

                <button type="submit" className={styles.mainBtn} disabled={authStore.isLoading}>
                    {authStore.isLoading ? 'Создаем аккаунт...' : 'Зарегистрироваться'}
                </button>
                <p className={styles.footerText}>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
            </form>
        </div>
    );
});

export default RegisterPage;
