import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStores } from '../../stores/StoreContext';
import styles from './Profile.module.css';
import CharacterPreviewCard from '../../components/CharacterPreviewCard/CharacterPreviewCard';
import { getAvatarFallbackStyle } from '../../utils/avatarAccentColor';

// Отрисовывает пользовательский профиль с прогрессом и настройками.
const UserProfile = ({ user }) => {
    const { t } = useTranslation();
    const { authStore, uiStore } = useStores();
    const navigate = useNavigate();
    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [activeStat, setActiveStat] = useState(null);
    const [profileAccentColor, setProfileAccentColor] = useState(user.profileAccentColor || '');
    const [nowTs] = useState(() => Date.now());
    const [form, setForm] = useState({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || ''
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            setProfileAccentColor(user.profileAccentColor || '');
        }, 0);
        return () => clearTimeout(timer);
    }, [user.profileAccentColor]);

    const wordsTotal = user.dictionary?.length || 0;
    const totalPoints = Number.isFinite(user.totalPoints) ? user.totalPoints : wordsTotal;
    const coins = Number.isFinite(user.coins) ? user.coins : totalPoints;
    const level = Math.floor(totalPoints / 10) + 1;
    const currentLevelBasePoints = Math.floor(totalPoints / 10) * 10;
    const pointsToNextLevel = Math.max(0, currentLevelBasePoints + 10 - totalPoints);
    const levelProgressPercent = Math.max(0, Math.min(100, ((totalPoints - currentLevelBasePoints) / 10) * 100));
    const wordsWeek = useMemo(() => {
        const weekAgo = nowTs - 7 * 24 * 60 * 60 * 1000;
        return (user.dictionary || []).filter((entry) => {
            const ts = new Date(entry.learnedAt || 0).getTime();
            return Number.isFinite(ts) && ts >= weekAgo;
        }).length;
    }, [user.dictionary, nowTs]);

    const initials = useMemo(() => {
        const first = (user.firstName || '').trim().charAt(0);
        const last = (user.lastName || '').trim().charAt(0);
        return `${first}${last}`.toUpperCase() || 'U';
    }, [user.firstName, user.lastName]);

    const avatarSrc = useMemo(() => {
        if (!user.avatarUrl) return '';
        if (user.avatarUrl.startsWith('http')) return user.avatarUrl;
        const apiBase = import.meta.env.VITE_API_URL || '';
        const serverBase = apiBase.replace(/\/api\/?$/, '');
        return `${serverBase}${user.avatarUrl}`;
    }, [user.avatarUrl]);
    const avatarFallbackStyle = useMemo(() => (
        getAvatarFallbackStyle(user.avatarAccentColor, `${user.username || ''}${initials}`)
    ), [user.avatarAccentColor, user.username, initials]);

    // Обрабатывает событие интерфейса пользователя.
    const onAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const res = await authStore.uploadAvatar(file);
        if (res.success) {
            setAvatarLoadFailed(false);
            uiStore.showModal({
                title: t('pages.profile.done'),
                message: t('pages.profile.avatar_updated'),
                variant: 'success',
                primaryLabel: t('pages.profile.close'),
                secondaryLabel: t('pages.profile.close')
            });
        } else {
            uiStore.showModal({
                title: t('pages.profile.error'),
                message: res.message,
                variant: 'error',
                primaryLabel: t('pages.profile.close'),
                secondaryLabel: t('pages.profile.close')
            });
        }
        e.target.value = '';
    };

    // Обрабатывает событие интерфейса пользователя.
    const onSaveProfile = async (e) => {
        e.preventDefault();
        const payload = {
            firstName: form.firstName,
            lastName: form.lastName,
            username: form.username
        };
        const normalizedAccent = String(profileAccentColor || '').trim();
        if (normalizedAccent) payload.profileAccentColor = normalizedAccent;
        const res = await authStore.updateProfile(payload);

        if (res.success) {
            setIsEditing(false);
            uiStore.showModal({
                title: t('pages.profile.done'),
                message: t('pages.profile.profile_updated'),
                variant: 'success',
                primaryLabel: t('pages.profile.close'),
                secondaryLabel: t('pages.profile.close')
            });
        } else {
            uiStore.showModal({
                title: t('pages.profile.error'),
                message: res.message,
                variant: 'error',
                primaryLabel: t('pages.profile.close'),
                secondaryLabel: t('pages.profile.close')
            });
        }
    };

    // Обрабатывает событие интерфейса пользователя.
    const onLogout = () => {
        authStore.logout();
        navigate('/login');
    };

    // Обрабатывает событие интерфейса пользователя.
    const onCopyUsername = async () => {
        const normalizedUsername = String(user.username || '').trim().replace(/^@+/, '');
        const value = normalizedUsername;
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            uiStore.showCopyToast(t('pages.profile.copy_toast'));
        } catch {
            // Игнорируем ошибки доступа к буферу обмена.
        }
    };

    const stats = [
        {
            key: 'streak',
            displayValue: String(user.streak || 0),
            label: t('pages.profile.stats.streak'),
            description: t('pages.profile.stats.streak_desc')
        },
        {
            key: 'wordsWeek',
            displayValue: String(wordsWeek),
            label: t('pages.profile.stats.words_week'),
            description: t('pages.profile.stats.words_week_desc')
        },
        {
            key: 'wordsTotal',
            displayValue: String(wordsTotal),
            label: t('pages.profile.stats.words_total'),
            description: t('pages.profile.stats.words_total_desc')
        },
        {
            key: 'achievementsCount',
            displayValue: String((Array.isArray(user.userAchievements) ? user.userAchievements.filter((item) => item?.unlockedAt).length : 0) || (Array.isArray(user.achievements) ? user.achievements.length : 0)),
            label: t('pages.profile.stats.achievements'),
            description: t('pages.profile.stats.achievements_desc')
        },
        {
            key: 'coins',
            displayValue: String(coins),
            label: t('pages.profile.stats.coins'),
            description: t('pages.profile.stats.coins_desc')
        }
    ];

    const statByKey = Object.fromEntries(stats.map((s) => [s.key, s]));
    const statRows = [
        ['streak', 'wordsWeek', 'wordsTotal'],
        ['achievementsCount', 'coins']
    ];
    const isDarkTheme = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
    const headerTopBg = useMemo(() => {
        if (!profileAccentColor) return 'var(--color-bg-soft)';
        const hex = profileAccentColor.replace('#', '');
        if (hex.length !== 6) return profileAccentColor;
        const num = parseInt(hex, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        const delta = isDarkTheme ? 28 : -18;
        const clamp = (v) => Math.max(0, Math.min(255, v + delta));
        const toHex = (v) => clamp(v).toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }, [profileAccentColor, isDarkTheme]);
    const headerTopTextColor = useMemo(() => {
        if (!profileAccentColor) return 'var(--color-text)';
        const hex = headerTopBg.replace('#', '');
        if (hex.length !== 6) return '#111111';
        const num = parseInt(hex, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.58 ? '#111111' : '#ffffff';
    }, [headerTopBg, profileAccentColor]);

    return (
        <>
            {!user.emailVerified && (
                <div className={styles.verifyNotice}>
                    <p>{t('pages.profile.email_notice')}</p>
                    <Link to="/verify-email" className={styles.verifyLink}>{t('pages.profile.verify_email')}</Link>
                </div>
            )}

            <div className={styles.header}>
                <div className={styles.headerSplit}>
                    <div
                        className={styles.headerTop}
                        style={{ backgroundColor: headerTopBg, color: headerTopTextColor, '--profile-top-text': headerTopTextColor }}
                    >
                        <div className={styles.avatarRow}>
                            <div
                                className={styles.avatarCircle}
                                style={!avatarSrc ? avatarFallbackStyle : undefined}
                            >
                                {avatarSrc && !avatarLoadFailed ? (
                                    <img
                                        src={avatarSrc}
                                        alt={t('pages.profile.avatar_alt')}
                                        className={styles.avatarImage}
                                        onError={() => setAvatarLoadFailed(true)}
                                    />
                                ) : (
                                    <span className={styles.avatarInitials}>{initials}</span>
                                )}
                            </div>
                        </div>
                        <h1 className={styles.fullName}>{user.firstName} {user.lastName}</h1>
                        <button type="button" className={styles.usernameBtn} onClick={onCopyUsername}>
                            @{user.username}
                        </button>
                        <div className={styles.rank}>{t('pages.profile.level', { level })}</div>
                    </div>

                    <div className={styles.headerBottom}>
                        <div className={styles.levelProgressWrap}>
                            <div className={styles.levelProgressLabel}>{t('pages.profile.next_level', { count: pointsToNextLevel })}</div>
                            <div className={styles.levelProgressBar}>
                                <div className={styles.levelProgressFill} style={{ width: `${levelProgressPercent}%` }} />
                            </div>
                        </div>

                        <div className={styles.controlsStack}>
                            <div className={styles.profileActions}>
                                <button
                                    className={styles.editBtn}
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(!isEditing);
                                        setForm({
                                            firstName: user.firstName || '',
                                            lastName: user.lastName || '',
                                            username: user.username || ''
                                        });
                                    }}
                                >
                                    {isEditing ? t('pages.profile.cancel') : t('pages.profile.edit')}
                                </button>
                                <button className={styles.logoutBtn} type="button" onClick={onLogout}>
                                    {t('pages.profile.logout')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {isEditing && (
                    <form className={styles.editForm} onSubmit={onSaveProfile}>
                        <label className={styles.colorPickerBlock}>
                            <span className={styles.colorPickerText}>{t('pages.profile.change_color')}</span>
                            <input
                                type="color"
                                value={profileAccentColor || '#dff7e8'}
                                onChange={(e) => setProfileAccentColor(e.target.value)}
                                className={styles.colorPickerInput}
                                aria-label={t('pages.profile.color_aria')}
                            />
                        </label>
                        <div className={styles.editGrid}>
                            <input
                                value={form.firstName}
                                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                                placeholder={t('pages.profile.first_name')}
                                required
                            />
                            <input
                                value={form.lastName}
                                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                                placeholder={t('pages.profile.last_name')}
                                required
                            />
                        </div>
                        <div className={styles.editMetaRow}>
                            <input
                                value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                placeholder="Username"
                                required
                            />
                            <label className={styles.avatarUploadBtn}>
                                {t('pages.profile.change_avatar')}
                                <input type="file" accept="image/*" hidden onChange={onAvatarChange} />
                            </label>
                        </div>
                        <button type="submit" className={styles.saveBtn}>{t('common.actions.save')}</button>
                    </form>
                )}
            </div>

            <div className={styles.statsRows}>
                {statRows.map((row, rowIndex) => (
                    <div
                        key={`row-${rowIndex}`}
                        className={`${styles.statsRow} ${row.length === 2 ? styles.statsRowTwo : styles.statsRowThree}`}
                    >
                        {row.map((key) => {
                            const stat = statByKey[key];
                            if (!stat) return null;
                            return (
                                <button
                                    key={stat.key}
                                    type="button"
                                    className={`${styles.statBox} ${styles.statBoxBtn}`}
                                    onClick={() => setActiveStat(stat)}
                                >
                                    <span className={styles.statVal}>{stat.displayValue}</span>
                                    <span className={styles.statLabel}>{stat.label}</span>
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>

            <CharacterPreviewCard customization={user.characterCustomization} editable />

            {activeStat && (
                <div className={styles.statModalOverlay} onClick={() => setActiveStat(null)}>
                    <div
                        className={styles.statModal}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="stat-modal-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            className={styles.statModalClose}
                            onClick={() => setActiveStat(null)}
                            aria-label={t('pages.profile.modal_close_aria')}
                        >
                            ×
                        </button>
                        <div className={styles.statModalValue}>{activeStat.displayValue}</div>
                        <h3 id="stat-modal-title" className={styles.statModalTitle}>{activeStat.label}</h3>
                        <p className={styles.statModalDescription}>{activeStat.description}</p>
                    </div>
                </div>
            )}
        </>
    );
};

export default UserProfile;
