import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import $api from '../../api/instance';
import { useStores } from '../../stores/StoreContext';
import styles from './HomePage.module.css';

const HomePage = observer(() => {
    const { authStore } = useStores();
    const isAdmin = authStore.user?.role === 'admin';
    const [ranking, setRanking] = useState([]);
    const [rankingMode, setRankingMode] = useState('global');
    const [loading, setLoading] = useState(true);
    const [pinnedCourse, setPinnedCourse] = useState(null);
    const [bannerHidden, setBannerHidden] = useState(false);
    const [showDismissModal, setShowDismissModal] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const getAvatarSrc = (avatarUrl) => {
        if (!avatarUrl) return '';
        if (avatarUrl.startsWith('http')) return avatarUrl;
        const apiBase = import.meta.env.VITE_API_URL || '';
        const serverBase = apiBase.replace(/\/api\/?$/, '');
        return `${serverBase}${avatarUrl}`;
    };

    const getInitials = (firstName, lastName) => {
        const first = (firstName || '').trim().charAt(0);
        const last = (lastName || '').trim().charAt(0);
        return `${first}${last}`.toUpperCase() || 'U';
    };

    useEffect(() => {
        const fetchRanking = async () => {
            try {
                const isFriendsMode = rankingMode === 'friends' && authStore.isAuth && !isAdmin;
                const response = await $api.get(isFriendsMode ? '/ranking/friends' : '/ranking');
                const items = Array.isArray(response.data)
                    ? response.data
                    : (response.data?.items || []);
                if (Array.isArray(items)) {
                    setRanking(items);
                }
            } catch (e) {
                console.error("Ошибка загрузки рейтинга:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchRanking();
    }, [rankingMode, authStore.isAuth, isAdmin]);

    useEffect(() => {
        const fetchPinnedCourse = async () => {
            if (!authStore.isAuth || isAdmin) {
                setPinnedCourse(null);
                return;
            }

            try {
                const { data } = await $api.get('/courses/pinned');
                const course = data?.course || null;
                setPinnedCourse(course);

                if (!course) {
                    setBannerHidden(false);
                    return;
                }

                const userId = authStore.user?._id || 'guest';
                const storageKey = `easytel:pinned:hidden:${userId}:${course._id}`;
                const isHiddenForever = localStorage.getItem(storageKey) === '1';
                const mode = course.pinnedHomeMode || 'persistent';

                if (mode === 'persistent') {
                    setBannerHidden(false);
                    return;
                }

                setBannerHidden(isHiddenForever);
            } catch {
                setPinnedCourse(null);
            }
        };

        fetchPinnedCourse();
    }, [authStore.isAuth, authStore.user?._id, isAdmin]);

    const hidePinnedBannerForever = () => {
        if (!pinnedCourse) return;
        const userId = authStore.user?._id || 'guest';
        const storageKey = `easytel:pinned:hidden:${userId}:${pinnedCourse._id}`;
        localStorage.setItem(storageKey, '1');
        setBannerHidden(true);
    };

    const onClosePinnedBanner = () => {
        if (!pinnedCourse) return;

        const mode = pinnedCourse.pinnedHomeMode || 'persistent';
        if (mode === 'persistent') return;

        if (mode === 'dismiss_once') {
            hidePinnedBannerForever();
            return;
        }

        setDontShowAgain(false);
        setShowDismissModal(true);
    };

    const confirmDismissBanner = () => {
        if (dontShowAgain) {
            hidePinnedBannerForever();
        } else {
            setBannerHidden(true);
        }
        setShowDismissModal(false);
    };

    const practiceRoute = !authStore.isAuth ? '/login' : '/scanner';
    const theoryRoute = !authStore.isAuth ? '/login' : '/courses';

    return (
        <div className={styles.container}>
            {authStore.isAuth && !isAdmin && pinnedCourse && !bannerHidden && (
                <div className={styles.pinnedBanner}>
                    <Link to={`/courses/${pinnedCourse._id}`} className={styles.pinnedBannerLink}>
                        {pinnedCourse.pinnedHomeText}
                    </Link>
                    {(pinnedCourse.pinnedHomeMode === 'dismiss_once' || pinnedCourse.pinnedHomeMode === 'confirm_hide') && (
                        <button
                            type="button"
                            className={styles.pinnedBannerClose}
                            onClick={onClosePinnedBanner}
                            aria-label="Скрыть плашку"
                        >
                            ×
                        </button>
                    )}
                </div>
            )}

            <section className={styles.hero}>
                <h1 className={styles.title}>Easy<span>Tel</span></h1>
                <p className={styles.description}>
                    EasyTel — это платформа для изучения татарского языка, где мы объединили
                    искусственный интеллект, компьютерное зрение и структурированный учебный материал.
                </p>

                <div className={styles.ctaRow}>
                    <Link to={practiceRoute} className={`${styles.mainBtn} ${styles.mainBtnPrimary}`}>
                        Сканер
                    </Link>
                    <Link to={theoryRoute} className={`${styles.mainBtn} ${styles.mainBtnSecondary}`}>
                        Материал
                    </Link>
                </div>
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

            <section className={styles.rankingWrapper}>
                <div className={styles.rankingHeadRow}>
                    <h2 className={styles.rankingHeader}>
                        {rankingMode === 'friends' ? 'Рейтинг среди друзей' : 'Рейтинг знатоков'}
                    </h2>
                    {authStore.isAuth && !isAdmin && (
                        <div className={styles.rankingTabs}>
                            <button
                                type="button"
                                className={rankingMode === 'global' ? styles.rankingTabActive : styles.rankingTab}
                                onClick={() => setRankingMode('global')}
                            >
                                Общий
                            </button>
                            <button
                                type="button"
                                className={rankingMode === 'friends' ? styles.rankingTabActive : styles.rankingTab}
                                onClick={() => setRankingMode('friends')}
                            >
                                Друзья
                            </button>
                        </div>
                    )}
                </div>

                <div className={styles.rankingList}>
                    {ranking.length > 0 ? (
                        ranking.map((user, index) => {
                            return (
                                <Link key={user._id} to={`/u/${encodeURIComponent(user.username)}`} className={styles.rankingItemLink}>
                                    <div className={styles.rankingItem}>
                                    <div className={styles.rankingLeft}>
                                        <span className={styles.orderNum}>{index + 1}</span>
                                        <div className={styles.rankingIdentity}>
                                            <div className={styles.rankingAvatar}>
                                                {user.avatarUrl ? (
                                                    <img
                                                        src={getAvatarSrc(user.avatarUrl)}
                                                        alt={`${user.firstName} ${user.lastName}`}
                                                        className={styles.rankingAvatarImg}
                                                    />
                                                ) : (
                                                    <span className={styles.rankingAvatarFallback}>
                                                        {getInitials(user.firstName, user.lastName)}
                                                    </span>
                                                )}
                                            </div>
                                            <span className={styles.fullName}>
                                                {user.firstName} {user.lastName}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.rankingRight}>
                                        <span className={styles.wordBadge}>
                                            {user.totalPoints ?? user.wordsCount} <span>очков</span>
                                        </span>
                                    </div>
                                </div>
                                </Link>
                            );
                        })
                    ) : (
                        !loading && <div className={styles.infoText}>В рейтинге пока нет участников</div>
                    )}
                    {loading && <div className={styles.infoText}>Загрузка данных...</div>}
                </div>
            </section>

            {showDismissModal && (
                <div className={styles.bannerModalOverlay} onClick={() => setShowDismissModal(false)}>
                    <div className={styles.bannerModal} onClick={(e) => e.stopPropagation()}>
                        <h3>Скрыть плашку?</h3>
                        <label className={styles.bannerModalCheck}>
                            <input
                                type="checkbox"
                                checked={dontShowAgain}
                                onChange={(e) => setDontShowAgain(e.target.checked)}
                            />
                            Больше не показывать
                        </label>
                        <div className={styles.bannerModalActions}>
                            <button type="button" className={styles.bannerModalCancel} onClick={() => setShowDismissModal(false)}>
                                Отмена
                            </button>
                            <button type="button" className={styles.bannerModalConfirm} onClick={confirmDismissBanner}>
                                Скрыть
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default HomePage;
