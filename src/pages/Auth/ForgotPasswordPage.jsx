import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStores } from '../../stores/StoreContext';
import styles from './Auth.module.css';

const ForgotPasswordPage = observer(() => {
    const { t } = useTranslation();
    const { authStore } = useStores();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const res = await authStore.forgotPassword(email.trim());
        if (res.success) setSuccess(res.message);
        else setError(res.message);
    };

    return (
        <div className={styles.container}>
            <form className={styles.card} onSubmit={onSubmit}>
                <h1>{t('auth.forgot.title')}</h1>
                {error && <p className={styles.error}>{error}</p>}
                {success && <p className={styles.success}>{success}</p>}

                <input
                    type="email"
                    placeholder={t('auth.forgot.email')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <button className={styles.mainBtn} type="submit">{t('auth.forgot.submit')}</button>
                <p className={styles.footerText}><Link to="/login">{t('auth.forgot.back_login')}</Link></p>
            </form>
        </div>
    );
});

export default ForgotPasswordPage;
