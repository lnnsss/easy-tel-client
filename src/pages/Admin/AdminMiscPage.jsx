import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CourseService from '../../services/CourseService';
import { useStores } from '../../stores/StoreContext';
import styles from './AdminMiscPage.module.css';

const PINNED_MODE_OPTIONS = [
    { value: 'dismiss_once', labelKey: 'pages.admin.misc.mode_dismiss_once' },
    { value: 'persistent', labelKey: 'pages.admin.misc.mode_persistent' },
    { value: 'confirm_hide', labelKey: 'pages.admin.misc.mode_confirm_hide' }
];

const DEFAULT_DAYS = Array.from({ length: 7 }, (_, idx) => ({
    dayNumber: idx + 1,
    coins: 0,
    studyPoints: 0
}));

// Отрисовывает экран или компонент AdminMiscPage и связывает его с данными приложения.
const AdminMiscPage = () => {
    const { t } = useTranslation();
    const { uiStore } = useStores();
    const [courses, setCourses] = useState([]);
    const [rewards, setRewards] = useState(DEFAULT_DAYS);
    const [pinForm, setPinForm] = useState({
        courseId: '',
        enabled: false,
        text: '',
        mode: 'persistent'
    });
    const [error, setError] = useState('');
    const [isSavingRewards, setIsSavingRewards] = useState(false);

    // Загружает данные, необходимые для текущего экрана или сценария.
    const loadData = async () => {
        try {
            const [coursesRes, rewardsRes] = await Promise.all([
                CourseService.getAdminCourses(),
                CourseService.getAdminDailyRewardsConfig()
            ]);
            const nextCourses = Array.isArray(coursesRes.data) ? coursesRes.data : [];
            const pinnedCourse = nextCourses.find((course) => course.isPinnedHome);
            setCourses(nextCourses);
            setPinForm({
                courseId: pinnedCourse?._id || '',
                enabled: Boolean(pinnedCourse),
                text: pinnedCourse?.pinnedHomeText || '',
                mode: pinnedCourse?.pinnedHomeMode || 'persistent'
            });
            setRewards(Array.isArray(rewardsRes.data?.days) && rewardsRes.data.days.length === 7
                ? rewardsRes.data.days
                : DEFAULT_DAYS);
        } catch (e) {
            setError(e.response?.data?.message || t('pages.admin.misc.load_error'));
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Переключает состояние выбранной сущности или настройки.
    const togglePinnedCourse = async () => {
        const nextEnabled = !pinForm.enabled;
        try {
            if (!nextEnabled) {
                const currentPinned = courses.find((course) => course.isPinnedHome);
                if (currentPinned) {
                    await CourseService.updateAdminCourse(currentPinned._id, {
                        isPinnedHome: false,
                        pinnedHomeText: ''
                    });
                }
                await loadData();
                return;
            }

            if (!pinForm.courseId) {
                setError(t('pages.admin.misc.select_course_error'));
                return;
            }

            await CourseService.updateAdminCourse(pinForm.courseId, {
                isPinnedHome: true,
                pinnedHomeText: pinForm.text.trim(),
                pinnedHomeMode: pinForm.mode
            });
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || t('pages.admin.misc.save_pinned_error'));
        }
    };

    // Обрабатывает событие интерфейса пользователя.
    const onRewardValueChange = (dayNumber, field, value) => {
        const numeric = Math.max(0, Math.floor(Number(value) || 0));
        setRewards((prev) => prev.map((item) => (
            item.dayNumber === dayNumber
                ? { ...item, [field]: numeric }
                : item
        )));
    };

    // Сохраняет изменения пользователя.
    const saveRewards = async () => {
        try {
            setIsSavingRewards(true);
            await CourseService.updateAdminDailyRewardsConfig(rewards);
            uiStore.showModal({
                title: t('modals.done'),
                message: t('pages.admin.misc.rewards_saved'),
                variant: 'success',
                secondaryLabel: t('common.close')
            });
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || t('pages.admin.misc.save_rewards_error'));
        } finally {
            setIsSavingRewards(false);
        }
    };

    return (
        <div className={`${styles.page} app-page-shell`}>
            <div className="app-page-top">
                <div>
                    <h1 className="app-page-title">{t('pages.admin.misc_title')}</h1>
                    <p className="app-page-subtitle">{t('pages.admin.misc_subtitle')}</p>
                </div>
            </div>
            {error && <p className={styles.error}>{error}</p>}

            <section className={styles.card}>
                <h3>{t('pages.admin.misc.pinned_title')}</h3>
                <div className={styles.form}>
                    <label className={styles.fieldGroup}>
                        <span>{t('pages.admin.misc.course')}</span>
                        <select
                            value={pinForm.courseId}
                            onChange={(e) => setPinForm((prev) => ({ ...prev, courseId: e.target.value }))}
                        >
                            <option value="">{t('pages.admin.misc.select_course')}</option>
                            {courses.map((course) => (
                                <option key={course._id} value={course._id}>{course.title}</option>
                            ))}
                        </select>
                    </label>
                    <label className={styles.fieldGroup}>
                        <span>{t('pages.admin.misc.banner_text')}</span>
                        <input
                            value={pinForm.text}
                            onChange={(e) => setPinForm((prev) => ({ ...prev, text: e.target.value }))}
                            placeholder={t('pages.admin.misc.banner_placeholder')}
                        />
                    </label>
                    <label className={styles.fieldGroup}>
                        <span>{t('pages.admin.misc.mode')}</span>
                        <select
                            value={pinForm.mode}
                            onChange={(e) => setPinForm((prev) => ({ ...prev, mode: e.target.value }))}
                        >
                            {PINNED_MODE_OPTIONS.map((item) => (
                                <option key={item.value} value={item.value}>{t(item.labelKey)}</option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        onClick={togglePinnedCourse}
                        className={`${styles.pinnedToggleButton} ${pinForm.enabled ? styles.pinnedToggleActive : styles.pinnedToggleInactive}`}
                    >
                        {pinForm.enabled ? t('pages.admin.misc.active') : t('pages.admin.misc.activate')}
                    </button>
                </div>
            </section>

            <section className={styles.card}>
                <h3>{t('pages.admin.misc.rewards_title')}</h3>
                <div className={styles.rewardsGrid}>
                    {rewards.map((day) => (
                        <div key={day.dayNumber} className={styles.rewardRow}>
                            <strong className={styles.dayTitle}>{t('pages.admin.misc.day', { day: day.dayNumber })}</strong>
                            <label className={styles.rewardField}>
                                <span>{t('pages.admin.misc.coins')}</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={day.coins}
                                    onChange={(e) => onRewardValueChange(day.dayNumber, 'coins', e.target.value)}
                                />
                            </label>
                            <label className={styles.rewardField}>
                                <span>{t('pages.admin.misc.xp')}</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={day.studyPoints}
                                    onChange={(e) => onRewardValueChange(day.dayNumber, 'studyPoints', e.target.value)}
                                />
                            </label>
                        </div>
                    ))}
                </div>
                <button type="button" onClick={saveRewards} disabled={isSavingRewards}>
                    {isSavingRewards ? t('pages.admin.misc.saving') : t('pages.admin.misc.save_rewards')}
                </button>
            </section>
        </div>
    );
};

export default AdminMiscPage;
