import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CourseService from '../../services/CourseService';
import { useStores } from '../../stores/StoreContext';
import styles from './AdminLearningPage.module.css';

const STATUS_OPTIONS = [
    { value: '', labelKey: 'pages.admin.learning.all_statuses' },
    { value: 'published', labelKey: 'pages.admin.learning.published' },
    { value: 'draft', labelKey: 'pages.admin.learning.draft' }
];

// Рисует иконку редактирования для управляющих кнопок.
const PencilIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20l4.5-1 9.3-9.3a1.8 1.8 0 0 0 0-2.5l-1-1a1.8 1.8 0 0 0-2.5 0L5 15.5 4 20z" />
        <path d="M13 7l4 4" />
    </svg>
);

// Рисует иконку удаления для опасных действий.
const TrashIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16" />
        <path d="M9 7V5h6v2" />
        <path d="M7 7l1 12h8l1-12" />
        <path d="M10 11v6M14 11v6" />
    </svg>
);

// Отрисовывает экран или компонент AdminLearningPage и связывает его с данными приложения.
const AdminLearningPage = () => {
    const { t } = useTranslation();
    const { uiStore } = useStores();
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [courses, setCourses] = useState([]);
    const [error, setError] = useState('');

    const [categoryName, setCategoryName] = useState('');
    const [editingCategoryId, setEditingCategoryId] = useState('');
    const [editingCategoryName, setEditingCategoryName] = useState('');

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

    // Загружает данные, необходимые для текущего экрана или сценария.
    const loadAll = async () => {
        try {
            const [categoriesRes, coursesRes] = await Promise.all([
                CourseService.getAdminCategories(),
                CourseService.getAdminCourses()
            ]);
            setCategories(categoriesRes.data || []);
            setCourses(coursesRes.data || []);
        } catch (e) {
            setError(e.response?.data?.message || t('pages.admin.learning.load_error'));
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadAll();
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    // Создает сущность и возвращает результат клиенту.
    const createCategory = async (e) => {
        e.preventDefault();
        try {
            await CourseService.createAdminCategory({ name: categoryName });
            setCategoryName('');
            await loadAll();
        } catch (err) {
            setError(err.response?.data?.message || t('pages.admin.learning.create_category_error'));
        }
    };

    // Переключает состояние выбранной сущности или настройки.
    const toggleCourseStatus = async (course) => {
        const nextStatus = course.status === 'published' ? 'draft' : 'published';
        const nextLabel = statusLabel(nextStatus);
        uiStore.showModal({
            title: t('pages.admin.learning.confirm_status_title'),
            message: t('pages.admin.learning.confirm_status_message', { title: course.title, status: nextLabel }),
            variant: 'info',
            primaryLabel: t('modals.yes'),
            secondaryLabel: t('modals.cancel'),
            onPrimary: async () => {
                try {
                    await CourseService.updateAdminCourse(course._id, { status: nextStatus });
                    uiStore.closeModal();
                    await loadAll();
                } catch (err) {
                    uiStore.showModal({
                        title: t('modals.error'),
                        message: err.response?.data?.message || t('pages.admin.learning.update_course_error'),
                        variant: 'error',
                        secondaryLabel: t('common.close')
                    });
                }
            },
            onSecondary: () => uiStore.closeModal()
        });
    };

    // Удаляет связь или сущность по запросу пользователя.
    const removeCourse = async (courseId) => {
        uiStore.showModal({
            title: t('pages.admin.learning.delete_course_title'),
            message: t('pages.admin.learning.delete_course_message'),
            variant: 'error',
            primaryLabel: t('common.actions.delete'),
            secondaryLabel: t('modals.cancel'),
            onPrimary: async () => {
                try {
                    await CourseService.deleteAdminCourse(courseId);
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

    // Открывает локальное состояние интерфейса или модального окна.
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

    // Закрывает локальное состояние интерфейса или модального окна.
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
            setError(err.response?.data?.message || t('pages.admin.learning.review_error'));
            setReviewModal((prev) => ({ ...prev, isSubmitting: false }));
        }
    };

    // Удаляет связь или сущность по запросу пользователя.
    const removeCategory = async (categoryId) => {
        uiStore.showModal({
            title: t('pages.admin.learning.delete_category_title'),
            message: t('pages.admin.learning.delete_category_message'),
            variant: 'info',
            primaryLabel: t('common.actions.delete'),
            secondaryLabel: t('modals.cancel'),
            onPrimary: async () => {
                try {
                    await CourseService.deleteAdminCategory(categoryId);
                    uiStore.closeModal();
                    await loadAll();
                } catch (err) {
                    uiStore.showModal({
                        title: t('pages.admin.learning.delete_category_blocked_title'),
                        message: err.response?.data?.message || t('pages.admin.learning.delete_category_blocked_message'),
                        variant: 'error',
                        secondaryLabel: t('pages.admin.learning.understood')
                    });
                }
            }
        });
    };

    const startEditCategory = (category) => {
        setEditingCategoryId(category._id);
        setEditingCategoryName(category.name || '');
    };

    // Сохраняет изменения пользователя.
    const saveCategoryName = async () => {
        if (!editingCategoryId || !editingCategoryName.trim()) return;
        try {
            await CourseService.updateAdminCategory(editingCategoryId, { name: editingCategoryName.trim() });
            setEditingCategoryId('');
            setEditingCategoryName('');
            await loadAll();
        } catch (err) {
            setError(err.response?.data?.message || t('pages.admin.learning.update_category_error'));
        }
    };

    return (
        <div className={`${styles.page} app-page-shell`}>
            <div className="app-page-top">
                <div>
                    <h1 className="app-page-title">{t('pages.admin.materials_title')}</h1>
                    <p className="app-page-subtitle">{t('pages.admin.materials_subtitle')}</p>
                </div>
            </div>
            {error && <p className={styles.error}>{error}</p>}

            <section className={styles.card}>
                <div className={styles.sectionHead}>
                    <h3>{t('pages.admin.learning.categories')}</h3>
                    <form className={styles.inlineCreate} onSubmit={createCategory}>
                        <input
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                            placeholder={t('pages.admin.learning.new_category')}
                            required
                        />
                        <button type="submit">{t('common.actions.create')}</button>
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
                                        placeholder={t('pages.admin.learning.category_name')}
                                    />
                                    <div className={styles.categoryActions}>
                                        <button type="button" title={t('pages.admin.learning.save')} onClick={saveCategoryName}>✓</button>
                                        <button type="button" title={t('common.actions.cancel')} onClick={() => setEditingCategoryId('')}>✕</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <span title={category.name} className={styles.categoryName}>{category.name}</span>
                                    <div className={styles.categoryActions}>
                                        <button type="button" title={t('pages.admin.learning.rename')} onClick={() => startEditCategory(category)}>
                                            <PencilIcon />
                                        </button>
                                        <button type="button" title={t('common.actions.delete')} onClick={() => removeCategory(category._id)}>
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
                <div className={styles.coursesHead}>
                    <div className={styles.sectionHead}>
                        <h3>{t('pages.admin.learning.courses')}</h3>
                        <button
                            type="button"
                            className={`${styles.linkBtn} ${styles.topCreateBtn}`}
                            onClick={() => navigate('/admin/learning/courses/new')}
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
                {filteredCourses.map((course) => (
                    <div key={course._id} className={styles.row}>
                        <div className={styles.rowMain}>
                            <strong>{course.title}</strong>
                            <small>
                                {(getCourseCategoryNames(course).join(', ') || t('pages.admin.learning.no_category'))} · {statusLabel(course.status)} · {reviewLabel(course.reviewStatus)}
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
                                title={t('pages.admin.learning.open_course_title')}
                            >
                                {t('pages.admin.learning.to_course')}
                            </Link>
                            <button type="button" onClick={() => toggleCourseStatus(course)}>
                                {course.status === 'published' ? t('pages.admin.learning.to_draft') : t('pages.admin.learning.publish')}
                            </button>
                            {course.reviewStatus === 'pending_review' && (
                                <>
                                    <button type="button" onClick={() => openReviewModal(course, 'approved')}>
                                        {t('pages.admin.learning.approve')}
                                    </button>
                                    <button type="button" onClick={() => openReviewModal(course, 'rejected')}>
                                        {t('pages.admin.learning.decline')}
                                    </button>
                                </>
                            )}
                            <button type="button" onClick={() => removeCourse(course._id)}>{t('common.actions.delete')}</button>
                        </div>
                    </div>
                ))}
                {filteredCourses.length === 0 && <p className={styles.empty}>{t('pages.admin.learning.not_found')}</p>}
            </section>

            {reviewModal.isOpen && (
                <div className={styles.modalOverlay} onClick={closeReviewModal}>
                    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                        <button type="button" className={styles.modalClose} onClick={closeReviewModal} aria-label={t('common.close')}>
                            ×
                        </button>
                        <h3 className={styles.modalTitle}>
                            {reviewModal.decision === 'approved' ? t('pages.admin.learning.review_course_approve') : t('pages.admin.learning.review_course_decline')}
                        </h3>
                        <p className={styles.modalDescription}>
                            {t('pages.admin.learning.course_label')} <strong>{reviewModal.courseTitle || '—'}</strong>
                        </p>
                        <label className={styles.modalField}>
                            {t('pages.admin.learning.admin_comment_optional')}
                            <textarea
                                className={styles.modalTextarea}
                                value={reviewModal.adminComment}
                                onChange={(e) => setReviewModal((prev) => ({ ...prev, adminComment: e.target.value }))}
                                placeholder={t('pages.admin.learning.author_comment_placeholder')}
                            />
                        </label>
                        <div className={styles.modalActions}>
                            <button type="button" onClick={reviewCourse} disabled={reviewModal.isSubmitting}>
                                {reviewModal.decision === 'approved' ? t('pages.admin.learning.approve') : t('pages.admin.learning.decline')}
                            </button>
                            <button type="button" onClick={closeReviewModal} disabled={reviewModal.isSubmitting}>
                                {t('modals.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLearningPage;
