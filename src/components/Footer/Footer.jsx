import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

const Footer = () => (
    <footer className={styles.footer}>
        <div className={styles.inner}>
            <Link to="/" className={styles.brand}>
                Easy<span>Tel</span>
            </Link>
            <p className={styles.copy}>2026 · Все права защищены</p>
        </div>
    </footer>
);

export default Footer;
