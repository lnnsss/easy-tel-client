import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStores } from '../../stores/StoreContext';
import styles from './Auth.module.css';

const PASSWORD_ALLOWED_REGEX = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]+$/;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

const ResetPasswordPage = observer(() => {
    const { t } = useTranslation();
    const { authStore } = useStores();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const validatePassword = (value) => {
        if (value.length < 8) return t('auth.reset.errors.password_min_len');
        if (!PASSWORD_ALLOWED_REGEX.test(value)) {
            return t('auth.reset.errors.password_allowed');
        }
        if (!PASSWORD_COMPLEXITY_REGEX.test(value)) {
            return t('auth.reset.errors.password_complexity');
        }
        return '';
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!token) {
            setError(t('auth.reset.errors.missing_token'));
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        if (password !== confirmPassword) {
            setError(t('auth.reset.errors.password_mismatch'));
            return;
        }

        const res = await authStore.resetPassword(token, password);
        if (res.success) {
            setSuccess(res.message);
            setTimeout(() => navigate('/login'), 1200);
        } else {
            setError(res.message);
        }
    };

    return (
        <div className={styles.container}>
            <form className={styles.card} onSubmit={onSubmit}>
                <h1>{t('auth.reset.title')}</h1>
                {error && <p className={styles.error}>{error}</p>}
                {success && <p className={styles.success}>{success}</p>}

                <input
                    type="password"
                    placeholder={t('auth.reset.new_password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder={t('auth.reset.confirm_new_password')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
                <button className={styles.mainBtn} type="submit">{t('auth.reset.submit')}</button>
                <p className={styles.footerText}><Link to="/login">{t('auth.reset.back_login')}</Link></p>
            </form>
        </div>
    );
});

export default ResetPasswordPage;
