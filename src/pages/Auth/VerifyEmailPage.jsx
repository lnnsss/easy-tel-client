import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Link, useNavigate } from 'react-router-dom';
import { useStores } from '../../stores/StoreContext';
import styles from './Auth.module.css';

const VerifyEmailPage = observer(() => {
    const { authStore } = useStores();
    const navigate = useNavigate();
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [info, setInfo] = useState('');

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setInfo('');

        const res = await authStore.verifyEmail(code);
        if (res.success) {
            setSuccess(res.message || 'Почта подтверждена');
            navigate('/profile', { replace: true });
        } else {
            setError(res.message);
        }
    };

    const onResend = async () => {
        setError('');
        setSuccess('');
        setInfo('');
        const res = await authStore.resendVerificationCode();
        if (res.success) setInfo(res.message || 'Новый код отправлен');
        else setError(res.message);
    };

    return (
        <div className={styles.container}>
            <form className={styles.card} onSubmit={onSubmit}>
                <h1>Подтверждение почты</h1>
                {error && <p className={styles.error}>{error}</p>}
                {success && <p className={styles.success}>{success}</p>}
                {info && <p className={styles.info}>{info}</p>}
                <input
                    placeholder="6-значный код"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                />
                <div className={styles.buttonRow}>
                    <button className={styles.mainBtn} type="submit">Подтвердить</button>
                    <button type="button" className={styles.linkBtn} onClick={onResend}>
                        Отправить код повторно
                    </button>
                </div>
                <p className={styles.footerText}><Link to="/profile">Вернуться в профиль</Link></p>
            </form>
        </div>
    );
});

export default VerifyEmailPage;
