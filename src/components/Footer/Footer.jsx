import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './Footer.module.css';

const Footer = () => {
    const { t } = useTranslation();

    return (
        <footer className={styles.footer}>
            <div className={styles.inner}>
                <Link to="/" className={styles.brand}>
                    Easy<span>Tel</span>
                </Link>
                <p className={styles.copy}>2026 · {t('footer.rights_reserved')}</p>
            </div>
        </footer>
    );
};

export default Footer;
