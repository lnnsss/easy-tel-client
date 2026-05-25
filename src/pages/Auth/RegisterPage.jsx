import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStores } from '../../stores/StoreContext';
import styles from './Auth.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^\p{L}+$/u;
const USERNAME_ALLOWED_REGEX = /^[A-Za-z0-9]+$/;
const USERNAME_HAS_LETTER_REGEX = /[A-Za-z]/;
const PASSWORD_ALLOWED_REGEX = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]+$/;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

const RegisterPage = observer(() => {
    const { t } = useTranslation();
    const { authStore } = useStores();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
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
            setError(t('auth.register.errors.password_mismatch'));
            return;
        }

        if (!NAME_REGEX.test(firstName) || !NAME_REGEX.test(lastName)) {
            setError(t('auth.register.errors.name_letters_only'));
            return;
        }

        if (firstName.length < 3 || lastName.length < 3) {
            setError(t('auth.register.errors.name_min_len'));
            return;
        }

        if (!EMAIL_REGEX.test(email)) {
            setError(t('auth.register.errors.invalid_email'));
            return;
        }

        if (username.length < 3) {
            setError(t('auth.register.errors.username_min_len'));
            return;
        }

        if (!USERNAME_ALLOWED_REGEX.test(username) || !USERNAME_HAS_LETTER_REGEX.test(username)) {
            setError(t('auth.register.errors.username_rule'));
            return;
        }

        if (form.password.length < 8) {
            setError(t('auth.register.errors.password_min_len'));
            return;
        }

        if (!PASSWORD_ALLOWED_REGEX.test(form.password)) {
            setError(t('auth.register.errors.password_allowed'));
            return;
        }

        if (!PASSWORD_COMPLEXITY_REGEX.test(form.password)) {
            setError(t('auth.register.errors.password_complexity'));
            return;
        }

        const preparedForm = {
            ...form,
            email,
            username,
            firstName,
            lastName
        };
        const referralCode = String(searchParams.get('ref') || '').trim();
        if (referralCode) preparedForm.referralCode = referralCode;
        const { confirmPassword, ...registerData } = preparedForm;
        const res = await authStore.register(registerData);
        if (res.success) navigate('/profile');
        else setError(res.message);
    };

    return (
        <div className={styles.container}>
            <div className={styles.splitLayout}>
                <div className={styles.visualPane} aria-hidden="true" />
                <div className={styles.formPane}>
                    <form className={`${styles.card} ${styles.splitCard}`} onSubmit={onSubmit}>
                        <h1>{t('auth.register.title')} <Link to="/" className={styles.brand}>EasyTel</Link></h1>
                        {error && <p className={styles.error}>{error}</p>}

                        <div className={styles.grid}>
                            <input
                                placeholder={t('auth.register.first_name')}
                                value={form.firstName}
                                onChange={e => {
                                    setForm({...form, firstName: e.target.value});
                                    if (error) setError('');
                                }}
                                required
                            />
                            <input
                                placeholder={t('auth.register.last_name')}
                                value={form.lastName}
                                onChange={e => {
                                    setForm({...form, lastName: e.target.value});
                                    if (error) setError('');
                                }}
                                required
                            />
                        </div>
                        <input
                            placeholder={t('auth.register.username')}
                            value={form.username}
                            onChange={e => {
                                setForm({...form, username: e.target.value});
                                if (error) setError('');
                            }}
                            required
                        />
                        <input
                            type="email"
                            placeholder={t('auth.register.email')}
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
                                placeholder={t('auth.register.password')}
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
                                aria-label={showPassword ? t('auth.register.aria_hide_password') : t('auth.register.aria_show_password')}
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
                                placeholder={t('auth.register.confirm_password')}
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
                                aria-label={showConfirmPassword ? t('auth.register.aria_hide_password') : t('auth.register.aria_show_password')}
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
                            {authStore.isLoading ? t('auth.register.loading') : t('auth.register.submit')}
                        </button>
                        <p className={styles.footerText}>{t('auth.register.login_prefix')} <Link to="/login">{t('auth.register.login_link')}</Link></p>
                    </form>
                </div>
            </div>
        </div>
    );
});

export default RegisterPage;
