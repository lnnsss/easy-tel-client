import {observer} from "mobx-react-lite";
import {useStores} from "../../stores/StoreContext.js";
import {useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import styles from "./Auth.module.css"

const LoginPage = observer(() => {
    const { authStore } = useStores();
    const navigate = useNavigate();
    const [id, setId] = useState('');
    const [pass, setPass] = useState('');
    const [err, setErr] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const onGoogleLogin = () => {
        window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
    };

    const onLogin = async (e) => {
        e.preventDefault();
        setErr('');
        const res = await authStore.login(id, pass);
        if (res.success) navigate('/profile');
        else setErr(res.message);
    };

    return (
        <div className={styles.container}>
            <form className={styles.card} onSubmit={onLogin}>
                <h1>Вход в <span className={styles.brand}>EasyTel</span></h1>
                {err && <p className={styles.error}>{err}</p>}
                <input
                    placeholder="Email или Username"
                    value={id}
                    onChange={e => {
                        setId(e.target.value);
                        if (err) setErr('');
                    }}
                    required
                />
                <div className={styles.passwordField}>
                    <input
                        className={styles.passwordInput}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Пароль"
                        value={pass}
                        onChange={e => {
                            setPass(e.target.value);
                            if (err) setErr('');
                        }}
                        required
                    />
                    <button
                        type="button"
                        className={styles.togglePasswordBtn}
                        onClick={() => setShowPassword((prev) => !prev)}
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
                <button className={styles.mainBtn} disabled={authStore.isLoading}>
                    {authStore.isLoading ? 'Входим...' : 'Войти'}
                </button>
                <button type="button" className={styles.googleBtn} onClick={onGoogleLogin}>
                    Войти через Google
                </button>
                <p className={styles.footerText}>Забыли пароль? <Link to="/forgot-password">Сбросить</Link></p>
                <p className={styles.footerText}>Впервые здесь? <Link to="/register">Создать аккаунт</Link></p>
            </form>
        </div>
    );
});

export default LoginPage;
