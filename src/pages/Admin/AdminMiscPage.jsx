import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CourseService from '../../services/CourseService';
import { useStores } from '../../stores/StoreContext';
import styles from './AdminMiscPage.module.css';

const PINNED_MODE_OPTIONS = [
    { value: 'dismiss_once', label: 'Одноразовая (скрыть крестиком навсегда)' },
    { value: 'persistent', label: 'Постоянная (всегда показывать)' },
    { value: 'confirm_hide', label: 'С подтверждением скрытия' }
];

const DEFAULT_DAYS = Array.from({ length: 7 }, (_, idx) => ({
    dayNumber: idx + 1,
    coins: 0,
    studyPoints: 0
}));

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
            setError(e.response?.data?.message || 'Ошибка загрузки страницы');
        }
    };

    useEffect(() => {
        loadData();
    }, []);

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
                setError('Выберите курс для закрепления');
                return;
            }

            await CourseService.updateAdminCourse(pinForm.courseId, {
                isPinnedHome: true,
                pinnedHomeText: pinForm.text.trim(),
                pinnedHomeMode: pinForm.mode
            });
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка сохранения закрепленного курса');
        }
    };

    const onRewardValueChange = (dayNumber, field, value) => {
        const numeric = Math.max(0, Math.floor(Number(value) || 0));
        setRewards((prev) => prev.map((item) => (
            item.dayNumber === dayNumber
                ? { ...item, [field]: numeric }
                : item
        )));
    };

    const saveRewards = async () => {
        try {
            setIsSavingRewards(true);
            await CourseService.updateAdminDailyRewardsConfig(rewards);
            uiStore.showModal({
                title: 'Готово',
                message: 'Награды на 7 дней сохранены.',
                variant: 'success',
                secondaryLabel: 'Закрыть'
            });
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка сохранения наград');
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
                <h3>Закрепленный курс на главной</h3>
                <div className={styles.form}>
                    <label className={styles.fieldGroup}>
                        <span>Курс</span>
                        <select
                            value={pinForm.courseId}
                            onChange={(e) => setPinForm((prev) => ({ ...prev, courseId: e.target.value }))}
                        >
                            <option value="">Выберите курс</option>
                            {courses.map((course) => (
                                <option key={course._id} value={course._id}>{course.title}</option>
                            ))}
                        </select>
                    </label>
                    <label className={styles.fieldGroup}>
                        <span>Текст плашки</span>
                        <input
                            value={pinForm.text}
                            onChange={(e) => setPinForm((prev) => ({ ...prev, text: e.target.value }))}
                            placeholder="Текст плашки на главной"
                        />
                    </label>
                    <label className={styles.fieldGroup}>
                        <span>Режим</span>
                        <select
                            value={pinForm.mode}
                            onChange={(e) => setPinForm((prev) => ({ ...prev, mode: e.target.value }))}
                        >
                            {PINNED_MODE_OPTIONS.map((item) => (
                                <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        onClick={togglePinnedCourse}
                        className={`${styles.pinnedToggleButton} ${pinForm.enabled ? styles.pinnedToggleActive : styles.pinnedToggleInactive}`}
                    >
                        {pinForm.enabled ? 'Активно' : 'Активировать'}
                    </button>
                </div>
            </section>

            <section className={styles.card}>
                <h3>Награды на 7 дней</h3>
                <div className={styles.rewardsGrid}>
                    {rewards.map((day) => (
                        <div key={day.dayNumber} className={styles.rewardRow}>
                            <strong className={styles.dayTitle}>День {day.dayNumber}</strong>
                            <label className={styles.rewardField}>
                                <span>Монеты</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={day.coins}
                                    onChange={(e) => onRewardValueChange(day.dayNumber, 'coins', e.target.value)}
                                />
                            </label>
                            <label className={styles.rewardField}>
                                <span>Опыт</span>
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
                    {isSavingRewards ? 'Сохранение...' : 'Сохранить награды'}
                </button>
            </section>
        </div>
    );
};

export default AdminMiscPage;
