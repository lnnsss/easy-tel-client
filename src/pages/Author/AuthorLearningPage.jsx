import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CourseService from '../../services/CourseService';
import { useStores } from '../../stores/StoreContext';
import styles from '../Admin/AdminLearningPage.module.css';

const STATUS_OPTIONS = [
    { value: '', labelKey: 'pages.admin.learning.all_statuses' },
    { value: 'published', labelKey: 'pages.admin.learning.published' },
    { value: 'draft', labelKey: 'pages.admin.learning.draft' }
];

// Отрисовывает экран или компонент AuthorLearningPage и связывает его с данными приложения.
const AuthorLearningPage = () => {
    const { t } = useTranslation();
    const { uiStore } = useStores();
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [courses, setCourses] = useState([]);
    const [error, setError] = useState('');
    const [filterCategoryId, setFilterCategoryId] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [search, setSearch] = useState('');
    const [submittedCourseIds, setSubmittedCourseIds] = useState(new Set());

    const statusLabel = (value) => (
        value === 'published' ? t('pages.admin.learning.published') : t('pages.admin.learning.draft')
    );

    const reviewLabel = (value) => {
        if (value === 'pending_review') return t('pages.admin.learning.pending_review');
        if (value === 'approved') return t('pages.admin.learning.approved');
        if (value === 'rejected') return t('pages.admin.learning.rejected');
        if (value === 'draft') return t('pages.admin.learning.draft');
        return t('pages.admin.learning.no_review');
    };

    const getCourseCategoryIds = (course) => {
        const fromArray = Array.isArray(course?.categoryIds) ? course.categoryIds : [];
        const normalizedArray = fromArray
            .map((entry) => String(entry?._id || entry || '').trim())
            .filter(Boolean);
        if (normalizedArray.length > 0) return normalizedArray;
        const fallback = String(course?.categoryId?._id || course?.categoryId || '').trim();
        return fallback ? [fallback] : [];
    };

    const getCourseCategoryNames = (course) => {
        const fromArray = Array.isArray(course?.categoryIds) ? course.categoryIds : [];
        const normalizedNames = fromArray
            .map((entry) => String(entry?.name || '').trim())
            .filter(Boolean);
        if (normalizedNames.length > 0) return normalizedNames;
        const fallback = String(course?.categoryId?.name || '').trim();
        return fallback ? [fallback] : [];
    };

    const filteredCourses = useMemo(() => {
        return courses.filter((course) => {
            const byCategory = !filterCategoryId || getCourseCategoryIds(course).includes(String(filterCategoryId));
            const byStatus = !filterStatus || course.status === filterStatus;
            const bySearch = !search.trim() || `${course.title} ${course.description || ''}`.toLowerCase().includes(search.trim().toLowerCase());
            return byCategory && byStatus && bySearch;
        });
    }, [courses, filterCategoryId, filterStatus, search]);

    // Загружает данные, необходимые для текущего экрана или сценария.
    const loadAll = async () => {
        try {
            setError('');
            const [categoriesRes, coursesRes] = await Promise.all([
                CourseService.getAuthorCategories(),
                CourseService.getAuthorCourses()
            ]);
            setCategories(categoriesRes.data || []);
            setCourses(coursesRes.data || []);
        } catch (e) {
            setError(e.response?.data?.message || t('pages.admin.learning.author_load_error'));
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadAll();
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    // Удаляет связь или сущность по запросу пользователя.
    const removeCourse = async (courseId) => {
        uiStore.showModal({
            title: t('pages.admin.learning.delete_course_title'),
            message: t('pages.admin.learning.delete_draft_course_message'),
            variant: 'error',
            primaryLabel: t('common.actions.delete'),
            secondaryLabel: t('modals.cancel'),
            onPrimary: async () => {
                try {
                    await CourseService.deleteAuthorCourse(courseId);
                    uiStore.closeModal();
                    await loadAll();
                } catch (err) {
                    uiStore.showModal({
                        title: t('modals.error'),
                        message: err.response?.data?.message || t('pages.admin.learning.delete_course_error'),
                        variant: 'error',
                        secondaryLabel: t('common.close')
                    });
                }
            }
        });
    };

    // Выполняет подтвержденное действие после проверки состояния.
    const performSubmitCourse = async (courseId) => {
        try {
            const { data } = await CourseService.submitAuthorCourseForReview(courseId);
            const alreadySubmitted = Boolean(data?.alreadySubmitted);
            setSubmittedCourseIds((prev) => {
                const next = new Set(prev);
                next.add(courseId);
                return next;
            });
            uiStore.showModal({
                title: alreadySubmitted ? t('pages.admin.learning.already_submitted_title') : t('pages.admin.learning.submitted_title'),
                message: alreadySubmitted ? t('pages.admin.learning.already_submitted_message') : t('pages.admin.learning.submitted_message'),
                variant: 'info',
                secondaryLabel: t('common.close')
            });
            await loadAll();
        } catch (err) {
            uiStore.showModal({
                title: t('modals.error'),
                message: err.response?.data?.message || t('pages.admin.learning.submit_review_error'),
                variant: 'error',
                secondaryLabel: t('common.close')
            });
        }
    };

    // Принимает отправленные пользователем данные и фиксирует результат.
    const submitCourse = async (course) => {
        if (!course?._id) return;
        if (course.canSubmitForReview === false) {
            uiStore.showModal({
                title: t('pages.admin.learning.submit_unavailable_title'),
                message: t('pages.admin.learning.submit_unavailable_message'),
                variant: 'info',
                secondaryLabel: t('common.close')
            });
            return;
        }
        const alreadySubmitted = course.reviewStatus === 'pending_review' || submittedCourseIds.has(course._id);
        if (alreadySubmitted) {
            uiStore.showModal({
                title: t('pages.admin.learning.already_submitted_title'),
                message: t('pages.admin.learning.already_submitted_message'),
                variant: 'info',
                secondaryLabel: t('common.close')
            });
            return;
        }

        uiStore.showModal({
            title: t('pages.admin.learning.submit_review_title'),
            message: t('pages.admin.learning.submit_review_message'),
            variant: 'info',
            primaryLabel: t('modals.send'),
            secondaryLabel: t('modals.cancel'),
            onPrimary: async () => {
                uiStore.closeModal();
                await performSubmitCourse(course._id);
            },
            onSecondary: () => uiStore.closeModal()
        });
    };

    return (
        <div className={`${styles.page} app-page-shell`}>
            <div className="app-page-top">
                <div>
                    <h1 className="app-page-title">{t('pages.author.courses')}</h1>
                </div>
            </div>
            {error && <p className={styles.error}>{error}</p>}

            <section className={styles.card}>
                <div className={styles.coursesHead}>
                    <div className={styles.sectionHead}>
                        <h3>{t('pages.admin.learning.my_courses')}</h3>
                        <button
                            type="button"
                            className={`${styles.linkBtn} ${styles.topCreateBtn}`}
                            onClick={() => navigate('/author/learning/courses/new')}
                        >
                            {t('pages.admin.learning.new_course')}
                        </button>
                    </div>
                    <div className={styles.filters}>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('pages.admin.learning.search_placeholder')}
                        />
                        <select value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}>
                            <option value="">{t('pages.admin.learning.all_categories')}</option>
                            {categories.map((category) => (
                                <option key={category._id} value={category._id}>{category.name}</option>
                            ))}
                        </select>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            {STATUS_OPTIONS.map((item) => (
                                <option key={item.value || 'all'} value={item.value}>{t(item.labelKey)}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {filteredCourses.map((course) => {
                        const isPending = course.reviewStatus === 'pending_review' || submittedCourseIds.has(course._id);
                        const canSubmit = Boolean(course.canSubmitForReview) && !isPending;
                        return (
                            <div key={course._id} className={styles.row}>
                                <div className={styles.rowMain}>
                                    <strong>
                                        {course.title}
                                    </strong>
                                    <small>
                                        {(getCourseCategoryNames(course).join(', ') || t('pages.admin.learning.no_category'))} · {statusLabel(course.status)} · {reviewLabel(course.reviewStatus)}
                                    </small>
                                </div>
                                <div className={styles.actions}>
                                    <Link
                                        className={styles.actionLink}
                                        to={`/author/learning/courses/${course._id}`}
                                        title={t('pages.admin.learning.open_course_title')}
                                    >
                                        {t('pages.admin.learning.to_course')}
                                    </Link>
                                    {course.status === 'draft' && (
                                        <button
                                            type="button"
                                            onClick={() => submitCourse(course)}
                                            disabled={!canSubmit}
                                        >
                                            {isPending ? t('pages.admin.learning.sent_to_review') : (course.canSubmitForReview === false ? t('pages.admin.learning.no_changes') : t('pages.admin.learning.to_review'))}
                                        </button>
                                    )}
                                    {course.status !== 'published' && (
                                        <button type="button" onClick={() => removeCourse(course._id)}>
                                            {t('common.actions.delete')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                {filteredCourses.length === 0 && <p className={styles.empty}>{t('pages.admin.learning.not_found')}</p>}
            </section>
        </div>
    );
};

export default AuthorLearningPage;
