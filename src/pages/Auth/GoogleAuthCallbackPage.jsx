import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStores } from '../../stores/StoreContext';
import styles from './Auth.module.css';

const GoogleAuthCallbackPage = observer(() => {
    const { t } = useTranslation();
    const { authStore } = useStores();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const run = async () => {
            const token = searchParams.get('token');
            if (!token) {
                navigate('/login');
                return;
            }

            const res = await authStore.loginWithToken(token);
            if (res.success) navigate('/profile');
            else navigate('/login');
        };

        run();
    }, [searchParams, authStore, navigate]);

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1>{t('auth.google_callback.title')}</h1>
            </div>
        </div>
    );
});

export default GoogleAuthCallbackPage;
