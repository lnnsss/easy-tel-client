import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CourseService from '../../services/CourseService';
import { useStores } from '../../stores/StoreContext';
import styles from '../Admin/AdminLearningPage.module.css';

const STATUS_OPTIONS = [
    { value: '', label: 'Все статусы' },
    { value: 'published', label: 'Опубликован' },
    { value: 'draft', label: 'Черновик' }
];

const reviewLabel = (value) => {
    if (value === 'pending_review') return 'На модерации';
    if (value === 'approved') return 'Одобрен';
    if (value === 'rejected') return 'Отклонен';
    if (value === 'draft') return 'Черновик';
    return 'Без модерации';
};

const AuthorLearningPage = () => {
    const { uiStore } = useStores();
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [courses, setCourses] = useState([]);
    const [error, setError] = useState('');
    const [filterCategoryId, setFilterCategoryId] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [search, setSearch] = useState('');
    const [submittedCourseIds, setSubmittedCourseIds] = useState(new Set());

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
            setError(e.response?.data?.message || 'Ошибка загрузки кабинета автора');
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadAll();
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    const removeCourse = async (courseId) => {
        uiStore.showModal({
            title: 'Удалить курс?',
            message: 'Курс-черновик будет удален вместе с темами и тестами.',
            variant: 'error',
            primaryLabel: 'Удалить',
            secondaryLabel: 'Отмена',
            onPrimary: async () => {
                try {
                    await CourseService.deleteAuthorCourse(courseId);
                    uiStore.closeModal();
                    await loadAll();
                } catch (err) {
                    uiStore.showModal({
                        title: 'Ошибка',
                        message: err.response?.data?.message || 'Ошибка удаления курса',
                        variant: 'error',
                        secondaryLabel: 'Закрыть'
                    });
                }
            }
        });
    };

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
                title: alreadySubmitted ? 'Уже отправлено' : 'Отправлено',
                message: alreadySubmitted ? 'Курс уже отправлен на модерацию.' : 'Курс отправлен на модерацию.',
                variant: 'info',
                secondaryLabel: 'Закрыть'
            });
            await loadAll();
        } catch (err) {
            uiStore.showModal({
                title: 'Ошибка',
                message: err.response?.data?.message || 'Не удалось отправить курс на модерацию',
                variant: 'error',
                secondaryLabel: 'Закрыть'
            });
        }
    };

    const submitCourse = async (course) => {
        if (!course?._id) return;
        if (course.canSubmitForReview === false) {
            uiStore.showModal({
                title: 'Отправка недоступна',
                message: 'В курсе нет изменений после последней модерации.',
                variant: 'info',
                secondaryLabel: 'Закрыть'
            });
            return;
        }
        const alreadySubmitted = course.reviewStatus === 'pending_review' || submittedCourseIds.has(course._id);
        if (alreadySubmitted) {
            uiStore.showModal({
                title: 'Уже отправлено',
                message: 'Курс уже отправлен на модерацию.',
                variant: 'info',
                secondaryLabel: 'Закрыть'
            });
            return;
        }

        uiStore.showModal({
            title: 'Отправить курс на модерацию?',
            message: 'После отправки редактирование курса будет временно недоступно.',
            variant: 'info',
            primaryLabel: 'Отправить',
            secondaryLabel: 'Отмена',
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
                    <h1 className="app-page-title">Курсы</h1>
                </div>
            </div>
            {error && <p className={styles.error}>{error}</p>}

            <section className={styles.card}>
                <div className={styles.coursesHead}>
                    <div className={styles.sectionHead}>
                        <h3>Мои курсы</h3>
                        <button
                            type="button"
                            className={`${styles.linkBtn} ${styles.topCreateBtn}`}
                            onClick={() => navigate('/author/learning/courses/new')}
                        >
                            Новый курс
                        </button>
                    </div>
                    <div className={styles.filters}>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Поиск по названию/описанию"
                        />
                        <select value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}>
                            <option value="">Все категории</option>
                            {categories.map((category) => (
                                <option key={category._id} value={category._id}>{category.name}</option>
                            ))}
                        </select>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            {STATUS_OPTIONS.map((item) => (
                                <option key={item.value || 'all'} value={item.value}>{item.label}</option>
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
                                        {(getCourseCategoryNames(course).join(', ') || 'Без категории')} · {course.status === 'published' ? 'Опубликован' : 'Черновик'} · {reviewLabel(course.reviewStatus)}
                                    </small>
                                </div>
                                <div className={styles.actions}>
                                    <Link
                                        className={styles.actionLink}
                                        to={`/author/learning/courses/${course._id}`}
                                        title="Открыть страницу курса"
                                    >
                                        К курсу
                                    </Link>
                                    {course.status === 'draft' && (
                                        <button
                                            type="button"
                                            onClick={() => submitCourse(course)}
                                            disabled={!canSubmit}
                                        >
                                            {isPending ? 'Отправлено на модерацию' : (course.canSubmitForReview === false ? 'Нет изменений для отправки' : 'На модерацию')}
                                        </button>
                                    )}
                                    {course.status !== 'published' && (
                                        <button type="button" onClick={() => removeCourse(course._id)}>
                                            Удалить
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                {filteredCourses.length === 0 && <p className={styles.empty}>Курсы не найдены</p>}
            </section>
        </div>
    );
};

export default AuthorLearningPage;
