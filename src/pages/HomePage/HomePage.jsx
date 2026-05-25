import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import $api from '../../api/instance';
import { useStores } from '../../stores/StoreContext';
import AppAvatar from '../../components/AppAvatar/AppAvatar';
import styles from './HomePage.module.css';

const HomePage = observer(() => {
    const { t } = useTranslation();
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
    const aiChatRoute = !authStore.isAuth ? '/login' : '/ai-chat';

    return (
        <div className={styles.page}>
            <section className={styles.topShowcase}>
                <video
                    className={styles.topVideo}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-hidden="true"
                >
                    <source src="/bg_video.mp4" type="video/mp4" />
                </video>
                <div className={styles.topOverlay} />

                <div className={styles.topContentInner}>
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
                                    aria-label={t('home.banner.close_aria')}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    )}

                    <section className={styles.hero}>
                        <h1 className={styles.title}>Easy<span>Tel</span></h1>
                        <p className={styles.description}>{t('home.hero.description')}</p>

                        <div className={styles.ctaRow}>
                            <Link to={practiceRoute} className={`${styles.mainBtn} ${styles.mainBtnSecondary}`}>
                                {t('home.hero.scanner')}
                            </Link>
                            <Link to={theoryRoute} className={`${styles.mainBtn} ${styles.mainBtnSecondary}`}>
                                {t('home.hero.materials')}
                            </Link>
                            <Link to={aiChatRoute} className={`${styles.mainBtn} ${styles.mainBtnPrimary} ${styles.mainBtnAi}`}>
                                {t('home.hero.ai_chat')}
                            </Link>
                        </div>
                    </section>
                </div>
            </section>

            <div className={styles.container}>
            <section className={styles.features}>
                <div className={styles.featureCard}>
                    <h3>{t('home.features.one.title')}</h3>
                    <p>
                        {t('home.features.one.text')}
                    </p>
                </div>
                <div className={styles.featureCard}>
                    <h3>{t('home.features.two.title')}</h3>
                    <p>
                        {t('home.features.two.text')}
                    </p>
                </div>
                <div className={styles.featureCard}>
                    <h3>{t('home.features.three.title')}</h3>
                    <p>
                        {t('home.features.three.text')}
                    </p>
                </div>
            </section>

            <section className={styles.rankingWrapper}>
                <div className={styles.rankingHeadRow}>
                    <h2 className={styles.rankingHeader}>
                        {rankingMode === 'friends' ? t('home.ranking.friends') : t('home.ranking.global')}
                    </h2>
                    {authStore.isAuth && !isAdmin && (
                        <div className={styles.rankingTabs}>
                            <button
                                type="button"
                                className={rankingMode === 'global' ? styles.rankingTabActive : styles.rankingTab}
                                onClick={() => setRankingMode('global')}
                            >
                                {t('home.ranking.tab_global')}
                            </button>
                            <button
                                type="button"
                                className={rankingMode === 'friends' ? styles.rankingTabActive : styles.rankingTab}
                                onClick={() => setRankingMode('friends')}
                            >
                                {t('home.ranking.tab_friends')}
                            </button>
                        </div>
                    )}
                </div>

                <div key={rankingMode} className={styles.rankingList}>
                    {ranking.length > 0 ? (
                        ranking.map((user, index) => {
                            return (
                                <Link key={user._id} to={`/u/${encodeURIComponent(user.username)}`} className={styles.rankingItemLink}>
                                    <div
                                        className={`${styles.rankingItem} ${styles.rankingItemAnimated}`}
                                        style={{ animationDelay: `${Math.min(index, 14) * 0.045}s` }}
                                    >
                                        <div className={styles.rankingLeft}>
                                            <span className={styles.orderNum}>{index + 1}</span>
                                            <div className={styles.rankingIdentity}>
                                                <AppAvatar
                                                    src={getAvatarSrc(user.avatarUrl)}
                                                    fullName={`${user.firstName || ''} ${user.lastName || ''}`.trim()}
                                                    className={styles.rankingAvatar}
                                                    imgClassName={styles.rankingAvatarImg}
                                                    fallbackClassName={styles.rankingAvatarFallback}
                                                    style={!user.avatarUrl && user.avatarAccentColor ? { backgroundColor: user.avatarAccentColor } : undefined}
                                                />
                                                <span className={styles.fullName}>
                                                    {user.firstName} {user.lastName}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={styles.rankingRight}>
                                            <span className={styles.wordBadge}>
                                                {user.totalPoints ?? user.wordsCount} <span>{t('home.ranking.points')}</span>
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })
                    ) : (
                        !loading && <div className={styles.infoText}>{t('home.ranking.empty')}</div>
                    )}
                    {loading && <div className={styles.infoText}>{t('home.ranking.loading')}</div>}
                </div>
            </section>

            {showDismissModal && (
                <div className={styles.bannerModalOverlay} onClick={() => setShowDismissModal(false)}>
                    <div className={styles.bannerModal} onClick={(e) => e.stopPropagation()}>
                        <h3>{t('home.banner.dismiss_title')}</h3>
                        <label className={styles.bannerModalCheck}>
                            <input
                                type="checkbox"
                                checked={dontShowAgain}
                                onChange={(e) => setDontShowAgain(e.target.checked)}
                            />
                            {t('home.banner.dismiss_checkbox')}
                        </label>
                        <div className={styles.bannerModalActions}>
                            <button type="button" className={styles.bannerModalCancel} onClick={() => setShowDismissModal(false)}>
                                {t('home.banner.cancel')}
                            </button>
                            <button type="button" className={styles.bannerModalConfirm} onClick={confirmDismissBanner}>
                                {t('home.banner.hide')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
});

export default HomePage;
