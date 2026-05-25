import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStores } from '../../stores/StoreContext';
import styles from './Auth.module.css';

const VerifyEmailPage = observer(() => {
    const { t } = useTranslation();
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
            setSuccess(res.message || t('auth.verify.success_default'));
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
        if (res.success) setInfo(res.message || t('auth.verify.resend_default'));
        else setError(res.message);
    };

    return (
        <div className={styles.container}>
            <form className={styles.card} onSubmit={onSubmit}>
                <h1>{t('auth.verify.title')}</h1>
                {error && <p className={styles.error}>{error}</p>}
                {success && <p className={styles.success}>{success}</p>}
                {info && <p className={styles.info}>{info}</p>}
                <input
                    placeholder={t('auth.verify.code')}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                />
                <div className={styles.buttonRow}>
                    <button className={styles.mainBtn} type="submit">{t('auth.verify.submit')}</button>
                    <button type="button" className={styles.linkBtn} onClick={onResend}>
                        {t('auth.verify.resend')}
                    </button>
                </div>
                <p className={styles.footerText}><Link to="/profile">{t('auth.verify.back_profile')}</Link></p>
            </form>
        </div>
    );
});

export default VerifyEmailPage;
