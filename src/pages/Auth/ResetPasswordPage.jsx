import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useStores } from '../../stores/StoreContext';
import styles from './Auth.module.css';

const PASSWORD_ALLOWED_REGEX = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]+$/;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

const ResetPasswordPage = observer(() => {
    const { authStore } = useStores();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const validatePassword = (value) => {
        if (value.length < 8) return 'Пароль должен содержать минимум 8 символов';
        if (!PASSWORD_ALLOWED_REGEX.test(value)) {
            return 'Пароль может содержать только английские буквы, цифры и спецсимволы';
        }
        if (!PASSWORD_COMPLEXITY_REGEX.test(value)) {
            return 'Пароль должен содержать заглавные/строчные буквы, цифру и спецсимвол';
        }
        return '';
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!token) {
            setError('Отсутствует токен сброса пароля');
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        if (password !== confirmPassword) {
            setError('Пароли не совпадают');
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
                <h1>Новый пароль</h1>
                {error && <p className={styles.error}>{error}</p>}
                {success && <p className={styles.success}>{success}</p>}

                <input
                    type="password"
                    placeholder="Новый пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Подтвердите новый пароль"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
                <button className={styles.mainBtn} type="submit">Сбросить пароль</button>
                <p className={styles.footerText}><Link to="/login">Вернуться ко входу</Link></p>
            </form>
        </div>
    );
});

export default ResetPasswordPage;

