import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import $api from '../../api/instance';
import profileStyles from './Profile.module.css';
import styles from './PublicProfilePage.module.css';

const PublicProfilePage = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState('');
    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
    const [copiedUsername, setCopiedUsername] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            setNotFound(false);
            setError('');

            try {
                const { data } = await $api.get(`/users/${encodeURIComponent(username || '')}/profile`);
                setProfile(data?.profile || null);
            } catch (e) {
                if (e?.response?.status === 404) {
                    setNotFound(true);
                } else {
                    setError(e?.response?.data?.message || 'Не удалось загрузить профиль');
                }
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [username]);

    const avatarSrc = useMemo(() => {
        if (!profile?.avatarUrl) return '';
        if (profile.avatarUrl.startsWith('http')) return profile.avatarUrl;
        const apiBase = import.meta.env.VITE_API_URL || '';
        const serverBase = apiBase.replace(/\/api\/?$/, '');
        return `${serverBase}${profile.avatarUrl}`;
    }, [profile?.avatarUrl]);

    const initials = useMemo(() => {
        const first = (profile?.firstName || '').trim().charAt(0);
        const last = (profile?.lastName || '').trim().charAt(0);
        return `${first}${last}`.toUpperCase() || 'U';
    }, [profile?.firstName, profile?.lastName]);

    const onCopyUsername = async () => {
        const normalizedUsername = String(profile?.username || '').trim().replace(/^@+/, '');
        const value = normalizedUsername;
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setCopiedUsername(true);
            setTimeout(() => setCopiedUsername(false), 1200);
        } catch (_) {
            setCopiedUsername(false);
        }
    };

    if (loading) return <div className={profileStyles.loader}>Загрузка...</div>;

    if (notFound) {
        return (
            <div className={styles.stateWrap}>
                <h1>Пользователь не найден</h1>
                <p>Возможно, профиль был удален или username изменился.</p>
                <div className={styles.stateActions}>
                    <Link to="/" className={styles.primaryBtn}>На главную</Link>
                    <button type="button" className={styles.secondaryBtn} onClick={() => navigate(-1)}>Назад</button>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.stateWrap}>
                <h1>Ошибка</h1>
                <p>{error}</p>
                <div className={styles.stateActions}>
                    <Link to="/" className={styles.primaryBtn}>На главную</Link>
                    <button type="button" className={styles.secondaryBtn} onClick={() => navigate(-1)}>Назад</button>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className={styles.stateWrap}>
                <h1>Пользователь не найден</h1>
                <p>Возможно, профиль был удален или username изменился.</p>
                <div className={styles.stateActions}>
                    <Link to="/" className={styles.primaryBtn}>На главную</Link>
                    <button type="button" className={styles.secondaryBtn} onClick={() => navigate(-1)}>Назад</button>
                </div>
            </div>
        );
    }

    return (
        <div className={profileStyles.container}>
            <div className={profileStyles.header}>
                <div className={profileStyles.avatarRow}>
                    <div className={profileStyles.avatarCircle}>
                        {avatarSrc && !avatarLoadFailed ? (
                            <img
                                src={avatarSrc}
                                alt="Аватар"
                                className={profileStyles.avatarImage}
                                onError={() => setAvatarLoadFailed(true)}
                            />
                        ) : (
                            <span className={profileStyles.avatarInitials}>{initials}</span>
                        )}
                    </div>
                </div>

                <h1 className={profileStyles.fullName}>{profile.firstName} {profile.lastName}</h1>
                <button type="button" className={profileStyles.usernameBtn} onClick={onCopyUsername}>
                    @{profile.username}
                    {copiedUsername && <span className={profileStyles.copiedHint}>скопировано</span>}
                </button>
                <div className={profileStyles.rank}>Ранг: {profile.rank}</div>
            </div>

            <div className={profileStyles.statsRow}>
                <div className={profileStyles.statBox}>
                    <span className={profileStyles.statVal}>{profile.streak || 0}</span>
                    <span className={profileStyles.statLabel}>Дней в ударе</span>
                </div>
                <div className={profileStyles.statBox}>
                    <span className={profileStyles.statVal}>{profile.wordsWeek || 0}</span>
                    <span className={profileStyles.statLabel}>Слов за неделю</span>
                </div>
                <div className={profileStyles.statBox}>
                    <span className={profileStyles.statVal}>{profile.wordsTotal || 0}</span>
                    <span className={profileStyles.statLabel}>Слов за все время</span>
                </div>
                <div className={profileStyles.statBox}>
                    <span className={profileStyles.statVal}>{profile.totalPoints || 0}</span>
                    <span className={profileStyles.statLabel}>Всего очков</span>
                </div>
            </div>

            <div className={profileStyles.achievementsCard}>
                <h3>Достижения</h3>
                <div className={profileStyles.achList}>
                    {Array.isArray(profile.achievements) && profile.achievements.length > 0 ? (
                        profile.achievements.map((ach, i) => (
                            <div key={`${ach}-${i}`} className={profileStyles.achItem}>
                                <div className={profileStyles.bullet}></div>
                                <span>{ach}</span>
                            </div>
                        ))
                    ) : (
                        <p className={styles.empty}>Список достижений пуст</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublicProfilePage;
