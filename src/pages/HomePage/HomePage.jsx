import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import axios from 'axios';
import { useStores } from '../../stores/StoreContext';
import styles from './HomePage.module.css';

const HomePage = observer(() => {
    const { authStore } = useStores();
    const [ranking, setRanking] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRanking = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/ranking');
                if (response.data && Array.isArray(response.data)) {
                    setRanking(response.data);
                }
            } catch (e) {
                console.error("Ошибка загрузки рейтинга:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchRanking();
    }, []);

    return (
        <div className={styles.container}>
            {/* РЕЙТИНГ */}
            <section className={styles.rankingWrapper}>
                <h2 className={styles.rankingHeader}>Рейтинг знатоков</h2>

                <div className={styles.rankingList}>
                    {ranking.length > 0 ? (
                        ranking.map((user, index) => (
                            <div key={user._id} className={styles.rankingItem}>
                                <div className={styles.rankingLeft}>
                                    <span className={styles.orderNum}>{index + 1}</span>
                                    <span className={styles.fullName}>
                                        {user.firstName} {user.lastName}
                                    </span>
                                </div>
                                <div className={styles.rankingRight}>
                                    <span className={styles.wordBadge}>
                                        {user.wordsCount} <span>слов</span>
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        !loading && <div className={styles.infoText}>В рейтинге пока нет участников</div>
                    )}
                    {loading && <div className={styles.infoText}>Загрузка данных...</div>}
                </div>
            </section>

            <section className={styles.hero}>
                <h1 className={styles.title}>Easy<span>Tel</span></h1>
                <p className={styles.description}>
                    EasyTel — это высокотехнологичная платформа для изучения татарского языка.
                    Мы объединили искусственный интеллект и компьютерное зрение.
                </p>

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
                    <p>Мгновенная идентификация объектов окружающего мира через камеру.</p>
                </div>
                <div className={styles.featureCard}>
                    <h3>Словарь</h3>
                    <p>Автоматическое формирование персональной базы слов.</p>
                </div>
                <div className={styles.featureCard}>
                    <h3>Геймификация</h3>
                    <p>Система рангов и достижений для прогресса.</p>
                </div>
            </section>
        </div>
    );
});

export default HomePage;