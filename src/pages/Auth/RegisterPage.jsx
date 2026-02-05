import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate, Link } from 'react-router-dom';
import { useStores } from '../../stores/StoreContext';
import styles from './Auth.module.css';

const RegisterPage = observer(() => {
    const { authStore } = useStores();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '', username: '', firstName: '', lastName: '' });
    const [error, setError] = useState('');

    const onSubmit = async (e) => {
        e.preventDefault();
        const res = await authStore.register(form);
        if (res.success) navigate('/profile');
        else setError(res.message);
    };

    return (
        <div className={styles.container}>
            <form className={styles.card} onSubmit={onSubmit}>
                <h1>Регистрация в <span className={styles.brand}>EasyTel</span></h1>
                {error && <p className={styles.error}>{error}</p>}

                <div className={styles.grid}>
                    <input placeholder="Имя" onChange={e => setForm({...form, firstName: e.target.value})} required />
                    <input placeholder="Фамилия" onChange={e => setForm({...form, lastName: e.target.value})} required />
                </div>
                <input placeholder="Username" onChange={e => setForm({...form, username: e.target.value})} required />
                <input type="email" placeholder="Email" onChange={e => setForm({...form, email: e.target.value})} required />
                <input type="password" placeholder="Пароль" onChange={e => setForm({...form, password: e.target.value})} required />

                <button type="submit" className={styles.mainBtn} disabled={authStore.isLoading}>
                    {authStore.isLoading ? 'Создаем аккаунт...' : 'Зарегистрироваться'}
                </button>
                <p className={styles.footerText}>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
            </form>
        </div>
    );
});

export default RegisterPage;