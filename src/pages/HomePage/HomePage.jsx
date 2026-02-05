import React from 'react';
import { Link } from 'react-router-dom';
import styles from './HomePage.module.css';

const HomePage = () => {
    return (
        <div className={styles.container}>
            <section className={styles.hero}>
                <h1 className={styles.title}>Easy<span>Tel</span></h1>
                <p className={styles.description}>
                    EasyTel — это высокотехнологичная платформа для изучения татарского языка.
                    Мы объединили искусственный интеллект и компьютерное зрение, чтобы сделать процесс обучения интуитивным.
                </p>
                <Link to="/scanner" className={styles.mainBtn}>Запустить сканер</Link>
            </section>

            <section className={styles.features}>
                <div className={styles.featureCard}>
                    <h3>Интерактивность</h3>
                    <p>Мгновенная идентификация объектов окружающего мира через камеру вашего устройства.</p>
                </div>
                <div className={styles.featureCard}>
                    <h3>Словарь</h3>
                    <p>Автоматическое формирование персональной базы слов для эффективного закрепления лексики.</p>
                </div>
                <div className={styles.featureCard}>
                    <h3>Геймификация</h3>
                    <p>Система рангов и достижений, стимулирующая регулярность образовательного процесса.</p>
                </div>
            </section>
        </div>
    );
};

export default HomePage;