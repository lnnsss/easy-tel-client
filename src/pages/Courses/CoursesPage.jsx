import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CourseService from '../../services/CourseService';
import { useStores } from '../../stores/StoreContext';
import styles from './CoursesPage.module.css';

const EDUCATION_OPTIONS = [
    { value: 'secondary', labelKey: 'pages.courses.education_options.secondary' },
    { value: 'college', labelKey: 'pages.courses.education_options.college' },
    { value: 'bachelor', labelKey: 'pages.courses.education_options.bachelor' },
    { value: 'master_specialist', labelKey: 'pages.courses.education_options.master_specialist' },
    { value: 'phd', labelKey: 'pages.courses.education_options.phd' },
    { value: 'other', labelKey: 'pages.courses.education_options.other' }
];

const TATAR_LEVEL_OPTIONS = [
    { value: 'a0', labelKey: 'pages.courses.tatar_level_options.a0' },
    { value: 'a1', label: 'A1' },
    { value: 'a2', label: 'A2' },
    { value: 'b1', label: 'B1' },
    { value: 'b2', label: 'B2' },
    { value: 'c1', label: 'C1' },
    { value: 'c2', label: 'C2' },
    { value: 'native', labelKey: 'pages.courses.tatar_level_options.native' }
];

const TEACHING_LEVEL_OPTIONS = [
    { value: 'epg_phase_1', labelKey: 'pages.courses.teaching_options.epg_phase_1' },
    { value: 'epg_phase_2', labelKey: 'pages.courses.teaching_options.epg_phase_2' },
    { value: 'epg_phase_3', labelKey: 'pages.courses.teaching_options.epg_phase_3' },
    { value: 'epg_phase_4', labelKey: 'pages.courses.teaching_options.epg_phase_4' },
    { value: 'epg_phase_5', labelKey: 'pages.courses.teaching_options.epg_phase_5' },
    { value: 'epg_phase_6', labelKey: 'pages.courses.teaching_options.epg_phase_6' }
];

// Отрисовывает экран или компонент CoursesPage и связывает его с данными приложения.
const CoursesPage = () => {
    const { t } = useTranslation();
    const { authStore, uiStore } = useStores();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [completionFilter, setCompletionFilter] = useState('all');
    const [request, setRequest] = useState(null);
    const [requestLoading, setRequestLoading] = useState(false);
    const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
    const [requestBlockHidden, setRequestBlockHidden] = useState(false);
    const [requestForm, setRequestForm] = useState({
        educationLevel: 'bachelor',
        educationDetails: '',
        contactEmail: '',
        tatarLevel: 'b1',
        teachingLevel: 'epg_phase_2',
        motivation: ''
    });

    const isAuthor = authStore.user?.role === 'author';

    const isVisibleByCompletion = (course) => {
        if (completionFilter === 'completed') return Boolean(course.progress?.completed);
        if (completionFilter === 'incomplete') return !course.progress?.completed;
        return true;
    };

    const visibleCategories = categories
        .map((category) => ({
            ...category,
            courses: (category.courses || []).filter(isVisibleByCompletion)
        }))
        .filter((category) => (category.courses || []).length > 0);

    const hiddenKey = useMemo(() => (
        request?._id ? `easytel:author-request:hidden:${request._id}` : ''
    ), [request?._id]);

    // Загружает данные, необходимые для текущего экрана или сценария.
    const loadRequest = async () => {
        try {
            setRequestLoading(true);
            const { data } = await CourseService.getAuthorRequest();
            const latest = data?.request || authStore.user?.latestAuthorRequest || null;
            setRequest(latest);
        } catch {
            setRequest(authStore.user?.latestAuthorRequest || null);
        } finally {
            setRequestLoading(false);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const { data } = await CourseService.getCourses();
                setCategories(data.categories || []);
            } catch (e) {
                setError(e.response?.data?.message || t('pages.courses.load_error'));
            } finally {
                setLoading(false);
            }
        };
        loadData();
        loadRequest();
    }, []);

    useEffect(() => {
        if (!hiddenKey) {
            setRequestBlockHidden(false);
            return;
        }
        setRequestBlockHidden(localStorage.getItem(hiddenKey) === '1');
    }, [hiddenKey]);

    const hideRequestBlock = () => {
        if (!hiddenKey) return;
        localStorage.setItem(hiddenKey, '1');
        setRequestBlockHidden(true);
    };

    // Принимает отправленные пользователем данные и фиксирует результат.
    const submitAuthorRequestConfirmed = async () => {
        try {
            await CourseService.createAuthorRequest(requestForm);
            setIsRequestFormOpen(false);
            uiStore.showModal({
                title: t('pages.courses.modals.author_request_sent_title'),
                message: t('pages.courses.modals.author_request_sent'),
                variant: 'success',
                secondaryLabel: t('common.close')
            });
            setRequestForm((prev) => ({ ...prev, motivation: '' }));
            await loadRequest();
            await authStore.refreshProfile();
        } catch (e2) {
            uiStore.showModal({
                title: t('modals.error'),
                message: e2.response?.data?.message || t('pages.courses.modals.author_request_failed'),
                variant: 'error',
                secondaryLabel: t('common.close')
            });
        }
    };

    // Принимает отправленные пользователем данные и фиксирует результат.
    const submitAuthorRequest = async (e) => {
        e.preventDefault();
        uiStore.showModal({
            title: t('pages.courses.modals.confirm_submit_title'),
            message: t('pages.courses.modals.confirm_submit_message'),
            variant: 'info',
            primaryLabel: t('common.actions.send'),
            secondaryLabel: t('common.actions.cancel'),
            onPrimary: async () => {
                uiStore.closeModal();
                await submitAuthorRequestConfirmed();
            },
            onSecondary: () => uiStore.closeModal()
        });
    };

    if (loading) return <div className={styles.state}>{t('pages.courses.loading')}</div>;
    if (error) return <div className={styles.stateError}>{error}</div>;

    return (
        <div className={`${styles.page} app-page-shell`}>
            <div className="app-page-top">
                <div>
                    <h1 className={`${styles.title} app-page-title`}>{t('pages.courses.title')}</h1>
                    <p className={`${styles.subtitle} app-page-subtitle`}>{t('pages.courses.subtitle')}</p>
                </div>
            </div>

            {!requestLoading && request && !requestBlockHidden && (
                <div className={styles.requestStatusCard}>
                    <div className={styles.requestStatusContent}>
                        <strong>{t('pages.courses.request_status', { status: t(`pages.courses.statuses.${request.status}`, { defaultValue: request.status }) })}</strong>
                        {request.adminComment && <p>{t('pages.courses.admin_comment', { comment: request.adminComment })}</p>}
                    </div>
                    <button type="button" className={styles.requestHideBtn} onClick={hideRequestBlock}>{t('pages.courses.hide')}</button>
                </div>
            )}

            <div className={styles.filtersRow}>
                <div className={styles.completionFilters}>
                    <button
                        type="button"
                        className={`${styles.filterBtn} ${completionFilter === 'all' ? styles.filterBtnActive : ''}`}
                        onClick={() => setCompletionFilter('all')}
                    >
                        {t('pages.courses.all')}
                    </button>
                    <button
                        type="button"
                        className={`${styles.filterBtn} ${completionFilter === 'completed' ? styles.filterBtnActive : ''}`}
                        onClick={() => setCompletionFilter('completed')}
                    >
                        {t('pages.courses.completed')}
                    </button>
                    <button
                        type="button"
                        className={`${styles.filterBtn} ${completionFilter === 'incomplete' ? styles.filterBtnActive : ''}`}
                        onClick={() => setCompletionFilter('incomplete')}
                    >
                        {t('pages.courses.incomplete')}
                    </button>
                </div>
                {isAuthor ? (
                    <Link to="/author/learning" className={styles.authorBtn}>
                        {t('pages.courses.author_cabinet')}
                    </Link>
                ) : (
                    <button
                        type="button"
                        className={styles.authorBtn}
                        onClick={() => setIsRequestFormOpen((prev) => !prev)}
                        disabled={request?.status === 'pending'}
                    >
                        {request?.status === 'pending' ? t('pages.courses.request_pending') : t('pages.courses.request_author')}
                    </button>
                )}
            </div>

            {!isAuthor && isRequestFormOpen && (
                <form className={styles.authorRequestForm} onSubmit={submitAuthorRequest}>
                    <h3>{t('pages.courses.request_form_title')}</h3>
                    <label>
                        {t('pages.courses.contact_email')}
                        <input
                            type="email"
                            value={requestForm.contactEmail}
                            onChange={(e) => setRequestForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                            placeholder="name@example.com"
                        />
                    </label>
                    <div className={styles.authorRequestGrid}>
                        <label>
                            {t('pages.courses.education')}
                            <select
                                value={requestForm.educationLevel}
                                onChange={(e) => setRequestForm((prev) => ({ ...prev, educationLevel: e.target.value }))}
                            >
                                {EDUCATION_OPTIONS.map((item) => (
                                    <option key={item.value} value={item.value}>{t(item.labelKey)}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            {t('pages.courses.tatar_level')}
                            <select
                                value={requestForm.tatarLevel}
                                onChange={(e) => setRequestForm((prev) => ({ ...prev, tatarLevel: e.target.value }))}
                            >
                                {TATAR_LEVEL_OPTIONS.map((item) => (
                                    <option key={item.value} value={item.value}>{item.labelKey ? t(item.labelKey) : item.label}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <label>
                        {t('pages.courses.teaching_level')}
                        <select
                            value={requestForm.teachingLevel}
                            onChange={(e) => setRequestForm((prev) => ({ ...prev, teachingLevel: e.target.value }))}
                        >
                            {TEACHING_LEVEL_OPTIONS.map((item) => (
                                <option key={item.value} value={item.value}>{t(item.labelKey)}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span className={styles.optionalLabel}>
                            {t('pages.courses.education_details')}
                            <span
                                className={styles.optionalStar}
                                title={t('pages.courses.optional_title')}
                                aria-label={t('pages.courses.optional_aria')}
                            >
                                *
                            </span>
                        </span>
                        <textarea
                            value={requestForm.educationDetails}
                            onChange={(e) => setRequestForm((prev) => ({ ...prev, educationDetails: e.target.value }))}
                            placeholder={t('pages.courses.education_placeholder')}
                        />
                    </label>
                    <label>
                        {t('pages.courses.motivation')}
                        <textarea
                            required
                            minLength={20}
                            value={requestForm.motivation}
                            onChange={(e) => setRequestForm((prev) => ({ ...prev, motivation: e.target.value }))}
                            placeholder={t('pages.courses.motivation_placeholder')}
                        />
                    </label>
                    <div className={styles.authorRequestActions}>
                        <button type="submit">{t('pages.courses.publish_request')}</button>
                        <button type="button" onClick={() => setIsRequestFormOpen(false)}>{t('common.actions.cancel')}</button>
                    </div>
                </form>
            )}

            {visibleCategories.length === 0 && <p className={styles.empty}>{t('pages.courses.empty')}</p>}

            {visibleCategories.map((category) => (
                <section key={category._id} className={styles.category}>
                    <h2 className={styles.categoryTitle}>{category.name}</h2>
                    <div key={`${category._id}-${completionFilter}`} className={styles.courseGrid}>
                        {(category.courses || []).map((course, index) => {
                            const completedTopics = Math.max(0, Number(course.progress?.completedTopics) || 0);
                            const totalTopics = Math.max(0, Number(course.progress?.totalTopics) || 0);
                            const progressPercent = totalTopics > 0
                                ? Math.min(100, Math.round((completedTopics / totalTopics) * 100))
                                : 0;

                            return (
                                <article
                                    key={course._id}
                                    className={`${styles.courseCard} ${styles.courseCardAnimated} ${course.progress?.completed ? styles.courseCardCompleted : ''}`}
                                    style={{ animationDelay: `${Math.min(index, 14) * 0.045}s` }}
                                >
                                    <div className={styles.courseMain}>
                                        <h3 className={styles.courseTitle}>{course.title}</h3>
                                        <p className={styles.courseDescription}>{course.description || t('pages.courses.no_description')}</p>
                                        <div className={styles.courseFooter}>
                                            <div className={styles.progressWrap} aria-label={t('pages.courses.progress_aria', { completed: completedTopics, total: totalTopics })}>
                                                <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
                                                <span
                                                    className={styles.progressText}
                                                    style={{ color: progressPercent < 45 ? 'var(--color-text)' : 'var(--c-black)' }}
                                                >
                                                    {t('pages.courses.progress', { completed: completedTopics, total: totalTopics })}
                                                </span>
                                            </div>
                                            <Link to={`/courses/${course._id}`} className={styles.btn}>
                                                {course.progress?.completed
                                                    ? t('pages.courses.open')
                                                    : completedTopics > 0
                                                        ? t('pages.courses.continue')
                                                        : t('pages.courses.start')}
                                            </Link>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
};

export default CoursesPage;
