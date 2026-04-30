import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CourseService from '../../services/CourseService';
import { useStores } from '../../stores/StoreContext';
import styles from './AdminLearningPage.module.css';

const STATUS_OPTIONS = [
    { value: '', label: 'Все статусы' },
    { value: 'published', label: 'Опубликован' },
    { value: 'draft', label: 'Черновик' }
];

const PINNED_MODE_OPTIONS = [
    { value: 'dismiss_once', label: 'Одноразовая (скрыть крестиком навсегда)' },
    { value: 'persistent', label: 'Постоянная (всегда показывать)' },
    { value: 'confirm_hide', label: 'С подтверждением скрытия' }
];

const statusLabel = (value) => (value === 'published' ? 'Опубликован' : 'Черновик');
const reviewLabel = (value) => {
    if (value === 'pending_review') return 'На модерации';
    if (value === 'approved') return 'Одобрен';
    if (value === 'rejected') return 'Отклонен';
    if (value === 'draft') return 'Черновик';
    return 'Без модерации';
};

const PencilIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20l4.5-1 9.3-9.3a1.8 1.8 0 0 0 0-2.5l-1-1a1.8 1.8 0 0 0-2.5 0L5 15.5 4 20z" />
        <path d="M13 7l4 4" />
    </svg>
);

const TrashIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16" />
        <path d="M9 7V5h6v2" />
        <path d="M7 7l1 12h8l1-12" />
        <path d="M10 11v6M14 11v6" />
    </svg>
);

const AdminLearningPage = () => {
    const { uiStore } = useStores();
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [courses, setCourses] = useState([]);
    const [error, setError] = useState('');

    const [categoryName, setCategoryName] = useState('');
    const [editingCategoryId, setEditingCategoryId] = useState('');
    const [editingCategoryName, setEditingCategoryName] = useState('');
    const [pinForm, setPinForm] = useState({
        courseId: '',
        enabled: false,
        text: '',
        mode: 'persistent'
    });

    const [filterCategoryId, setFilterCategoryId] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [search, setSearch] = useState('');
    const [reviewModal, setReviewModal] = useState({
        isOpen: false,
        courseId: '',
        courseTitle: '',
        decision: 'approved',
        adminComment: '',
        isSubmitting: false
    });

    const getCourseCategoryIds = (course) => {
        const fromArray = Array.isArray(course?.categoryIds) ? course.categoryIds : [];
        const normalizedArray = fromArray
            .map((entry) => String(entry?._id || entry || '').trim())
            .filter(Boolean);

        if (normalizedArray.length > 0) {
            return normalizedArray;
        }

        const fallback = String(course?.categoryId?._id || course?.categoryId || '').trim();
        return fallback ? [fallback] : [];
    };

    const getCourseCategoryNames = (course) => {
        const fromArray = Array.isArray(course?.categoryIds) ? course.categoryIds : [];
        const normalizedNames = fromArray
            .map((entry) => String(entry?.name || '').trim())
            .filter(Boolean);

        if (normalizedNames.length > 0) {
            return normalizedNames;
        }

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
            const [categoriesRes, coursesRes] = await Promise.all([
                CourseService.getAdminCategories(),
                CourseService.getAdminCourses()
            ]);
            setCategories(categoriesRes.data || []);
            setCourses(coursesRes.data || []);
        } catch (e) {
            setError(e.response?.data?.message || 'Ошибка загрузки обучения');
        }
    };

    useEffect(() => {
        loadAll();
    }, []);

    useEffect(() => {
        const pinnedCourse = courses.find((course) => course.isPinnedHome);
        if (pinnedCourse) {
            setPinForm({
                courseId: pinnedCourse._id,
                enabled: true,
                text: pinnedCourse.pinnedHomeText || '',
                mode: pinnedCourse.pinnedHomeMode || 'persistent'
            });
            return;
        }

        setPinForm((prev) => ({ ...prev, enabled: false, text: '', mode: 'persistent' }));
    }, [courses]);

    const createCategory = async (e) => {
        e.preventDefault();
        try {
            await CourseService.createAdminCategory({ name: categoryName });
            setCategoryName('');
            await loadAll();
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка создания категории');
        }
    };

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

                uiStore.showModal({
                    title: 'Готово',
                    message: 'Закрепление отключено.',
                    variant: 'success',
                    secondaryLabel: 'Закрыть'
                });
                await loadAll();
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

            uiStore.showModal({
                title: 'Готово',
                message: 'Закрепление включено.',
                variant: 'success',
                secondaryLabel: 'Закрыть'
            });
            await loadAll();
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка сохранения закрепленного курса');
        }
    };

    const toggleCourseStatus = async (course) => {
        const nextStatus = course.status === 'published' ? 'draft' : 'published';
        const nextLabel = nextStatus === 'published' ? 'Опубликован' : 'Черновик';
        uiStore.showModal({
            title: 'Подтвердить действие?',
            message: `Статус курса "${course.title}" будет изменен на "${nextLabel}".`,
            variant: 'info',
            primaryLabel: 'Подтвердить',
            secondaryLabel: 'Отмена',
            onPrimary: async () => {
                try {
                    await CourseService.updateAdminCourse(course._id, { status: nextStatus });
                    uiStore.closeModal();
                    await loadAll();
                } catch (err) {
                    uiStore.showModal({
                        title: 'Ошибка',
                        message: err.response?.data?.message || 'Ошибка обновления курса',
                        variant: 'error',
                        secondaryLabel: 'Закрыть'
                    });
                }
            },
            onSecondary: () => uiStore.closeModal()
        });
    };

    const removeCourse = async (courseId) => {
        uiStore.showModal({
            title: 'Удалить курс?',
            message: 'Курс будет удален вместе со всеми темами и тестами.',
            variant: 'error',
            primaryLabel: 'Удалить',
            secondaryLabel: 'Отмена',
            onPrimary: async () => {
                try {
                    await CourseService.deleteAdminCourse(courseId);
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

    const openReviewModal = (course, decision) => {
        setReviewModal({
            isOpen: true,
            courseId: course._id,
            courseTitle: course.title,
            decision,
            adminComment: '',
            isSubmitting: false
        });
    };

    const closeReviewModal = () => {
        setReviewModal((prev) => ({ ...prev, isOpen: false }));
    };

    const reviewCourse = async () => {
        if (!reviewModal.courseId || reviewModal.isSubmitting) return;
        try {
            setReviewModal((prev) => ({ ...prev, isSubmitting: true }));
            await CourseService.reviewAdminCourse(reviewModal.courseId, {
                decision: reviewModal.decision,
                adminComment: reviewModal.adminComment
            });
            closeReviewModal();
            await loadAll();
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка модерации курса');
            setReviewModal((prev) => ({ ...prev, isSubmitting: false }));
        }
    };

    const removeCategory = async (categoryId) => {
        uiStore.showModal({
            title: 'Удалить категорию?',
            message: 'Категория удалится только если к ней не привязаны курсы.',
            variant: 'info',
            primaryLabel: 'Удалить',
            secondaryLabel: 'Отмена',
            onPrimary: async () => {
                try {
                    await CourseService.deleteAdminCategory(categoryId);
                    uiStore.closeModal();
                    await loadAll();
                } catch (err) {
                    uiStore.showModal({
                        title: 'Удаление недоступно',
                        message: err.response?.data?.message || 'Категорию нельзя удалить, пока к ней привязан курс.',
                        variant: 'error',
                        secondaryLabel: 'Понятно'
                    });
                }
            }
        });
    };

    const startEditCategory = (category) => {
        setEditingCategoryId(category._id);
        setEditingCategoryName(category.name || '');
    };

    const saveCategoryName = async () => {
        if (!editingCategoryId || !editingCategoryName.trim()) return;
        try {
            await CourseService.updateAdminCategory(editingCategoryId, { name: editingCategoryName.trim() });
            setEditingCategoryId('');
            setEditingCategoryName('');
            await loadAll();
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка обновления категории');
        }
    };

    return (
        <div className={`${styles.page} app-page-shell`}>
            <div className="app-page-top">
                <div>
                    <h1 className="app-page-title">Админ: материал</h1>
                    <p className="app-page-subtitle">Управление категориями и курсами.</p>
                </div>
            </div>
            {error && <p className={styles.error}>{error}</p>}

            <section className={styles.card}>
                <div className={styles.sectionHead}>
                    <h3>Категории</h3>
                    <form className={styles.inlineCreate} onSubmit={createCategory}>
                        <input
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                            placeholder="Новая категория"
                            required
                        />
                        <button type="submit">Создать</button>
                    </form>
                </div>
                <div className={styles.categoryGrid}>
                    {categories.map((category) => (
                        <div key={category._id} className={styles.categoryChip}>
                            {editingCategoryId === category._id ? (
                                <>
                                    <input
                                        value={editingCategoryName}
                                        onChange={(e) => setEditingCategoryName(e.target.value)}
                                        placeholder="Название категории"
                                    />
                                    <div className={styles.categoryActions}>
                                        <button type="button" title="Сохранить" onClick={saveCategoryName}>✓</button>
                                        <button type="button" title="Отмена" onClick={() => setEditingCategoryId('')}>✕</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <span title={category.name} className={styles.categoryName}>{category.name}</span>
                                    <div className={styles.categoryActions}>
                                        <button type="button" title="Переименовать" onClick={() => startEditCategory(category)}>
                                            <PencilIcon />
                                        </button>
                                        <button type="button" title="Удалить" onClick={() => removeCategory(category._id)}>
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <section className={styles.card}>
                <h3>Закрепленный курс на главной</h3>
                <div className={styles.createCourseForm}>
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
                <div className={styles.coursesHead}>
                    <div className={styles.sectionHead}>
                        <h3>Курсы</h3>
                        <button
                            type="button"
                            className={`${styles.linkBtn} ${styles.topCreateBtn}`}
                            onClick={() => navigate('/admin/learning/courses/new')}
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
                {filteredCourses.map((course) => (
                    <div key={course._id} className={styles.row}>
                        <div className={styles.rowMain}>
                            <strong>{course.title}</strong>
                            <small>
                                {(getCourseCategoryNames(course).join(', ') || 'Без категории')} · {statusLabel(course.status)} · {reviewLabel(course.reviewStatus)}
                                {course?.ownerUserId?.username && (
                                    <>
                                        {' · '}
                                        <Link className={styles.authorLink} to={`/u/${course.ownerUserId.username}`}>
                                            @{course.ownerUserId.username}
                                        </Link>
                                    </>
                                )}
                            </small>
                        </div>
                        <div className={styles.actions}>
                            <Link
                                className={styles.actionLink}
                                to={`/admin/learning/courses/${course._id}`}
                                title="Открыть страницу курса"
                            >
                                К курсу
                            </Link>
                            <button type="button" onClick={() => toggleCourseStatus(course)}>
                                {course.status === 'published' ? 'В черновик' : 'Опубликовать'}
                            </button>
                            {course.reviewStatus === 'pending_review' && (
                                <>
                                    <button type="button" onClick={() => openReviewModal(course, 'approved')}>
                                        Одобрить
                                    </button>
                                    <button type="button" onClick={() => openReviewModal(course, 'rejected')}>
                                        Отклонить
                                    </button>
                                </>
                            )}
                            <button type="button" onClick={() => removeCourse(course._id)}>Удалить</button>
                        </div>
                    </div>
                ))}
                {filteredCourses.length === 0 && <p className={styles.empty}>Курсы не найдены</p>}
            </section>

            {reviewModal.isOpen && (
                <div className={styles.modalOverlay} onClick={closeReviewModal}>
                    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                        <button type="button" className={styles.modalClose} onClick={closeReviewModal} aria-label="Закрыть">
                            ×
                        </button>
                        <h3 className={styles.modalTitle}>
                            {reviewModal.decision === 'approved' ? 'Одобрить курс' : 'Отклонить курс'}
                        </h3>
                        <p className={styles.modalDescription}>
                            Курс: <strong>{reviewModal.courseTitle || '—'}</strong>
                        </p>
                        <label className={styles.modalField}>
                            Комментарий администратора (необязательно)
                            <textarea
                                className={styles.modalTextarea}
                                value={reviewModal.adminComment}
                                onChange={(e) => setReviewModal((prev) => ({ ...prev, adminComment: e.target.value }))}
                                placeholder="Введите комментарий для автора"
                            />
                        </label>
                        <div className={styles.modalActions}>
                            <button type="button" onClick={reviewCourse} disabled={reviewModal.isSubmitting}>
                                {reviewModal.decision === 'approved' ? 'Одобрить' : 'Отклонить'}
                            </button>
                            <button type="button" onClick={closeReviewModal} disabled={reviewModal.isSubmitting}>
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLearningPage;
