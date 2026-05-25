import {observer} from "mobx-react-lite";
import {useStores} from "../../stores/StoreContext.js";
import {useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import { useTranslation } from 'react-i18next';
import styles from "./Auth.module.css"

const LoginPage = observer(() => {
    const { t } = useTranslation();
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
            <div className={styles.splitLayout}>
                <div className={styles.visualPane} aria-hidden="true" />
                <div className={styles.formPane}>
                    <form className={`${styles.card} ${styles.splitCard}`} onSubmit={onLogin}>
                        <h1>{t('auth.login.title')} <Link to="/" className={styles.brand}>EasyTel</Link></h1>
                        {err && <p className={styles.error}>{err}</p>}
                        <input
                            placeholder={t('auth.login.identifier')}
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
                                placeholder={t('auth.login.password')}
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
                                aria-label={showPassword ? t('auth.login.aria_hide_password') : t('auth.login.aria_show_password')}
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
                            {authStore.isLoading ? t('auth.login.loading') : t('auth.login.submit')}
                        </button>
                        <button type="button" className={styles.googleBtn} onClick={onGoogleLogin}>
                            {t('auth.login.google')}
                        </button>
                        <p className={styles.footerText}>{t('auth.login.forgot_prefix')} <Link to="/forgot-password">{t('auth.login.forgot_link')}</Link></p>
                        <p className={styles.footerText}>{t('auth.login.register_prefix')} <Link to="/register">{t('auth.login.register_link')}</Link></p>
                    </form>
                </div>
            </div>
        </div>
    );
});

export default LoginPage;
