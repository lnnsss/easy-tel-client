import React from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useStores } from '../../stores/StoreContext';
import styles from './HomePage.module.css';

const HomePage = observer(() => {
    const { authStore } = useStores();

    return (
        <div className={styles.container}>
            <section className={styles.hero}>
                <h1 className={styles.title}>Easy<span>Tel</span></h1>
                <p className={styles.description}>
                    EasyTel — это высокотехнологичная платформа для изучения татарского языка.
                    Мы объединили искусственный интеллект и компьютерное зрение, чтобы сделать процесс обучения интуитивным.
                </p>

                {/* Если админ - ведем в админку, если юзер - в сканер, если гость - на вход */}
                <Link
                    to={
                        !authStore.isAuth
                            ? "/login"
                            : authStore.user?.role === 'admin'
                                ? "/admin"
                                : "/scanner"
                    }
                    className={styles.mainBtn}
                >
                    {authStore.user?.role === 'admin' ? 'Перейти к управлению' : 'Запустить сканер'}
                </Link>
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
});

export default HomePage;