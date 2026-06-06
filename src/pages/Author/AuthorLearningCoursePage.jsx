import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CourseService from '../../services/CourseService';
import { useStores } from '../../stores/StoreContext';
import { getTopicBlockValidationErrors, hasTopicBlockValidationErrors } from '../../utils/topicContent';
import styles from '../Admin/AdminLearningCoursePage.module.css';

// Приводит входные данные к единому безопасному формату.
const normalizedIds = (value) => [...new Set((value || []).map((id) => String(id)))].sort();

// Переставляет элемент списка при ручной сортировке или drag-and-drop.
const moveItem = (items, fromIndex, toIndex) => {
    if (fromIndex === toIndex) return items;
    const next = [...items];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    return next;
};

// Отрисовывает экран или компонент AuthorLearningCoursePage и связывает его с данными приложения.
const AuthorLearningCoursePage = () => {
    const { t } = useTranslation();
    const { uiStore } = useStores();
    const navigate = useNavigate();
    const { courseId } = useParams();
    const [categories, setCategories] = useState([]);
    const [course, setCourse] = useState(null);
    const [topics, setTopics] = useState([]);
    const [error, setError] = useState('');
    const [topicDragIndex, setTopicDragIndex] = useState(-1);
    const [topicDragOverIndex, setTopicDragOverIndex] = useState(-1);
    const [courseCategoryIds, setCourseCategoryIds] = useState([]);
    const [savedCourseCategoryIds, setSavedCourseCategoryIds] = useState([]);
    const [isSavingCategories, setIsSavingCategories] = useState(false);
    const [categoriesSaved, setCategoriesSaved] = useState(false);
    const [locallySubmittedForReview, setLocallySubmittedForReview] = useState(false);

    const isPendingReview = course?.reviewStatus === 'pending_review' || locallySubmittedForReview;
    const editingBlocked = isPendingReview;
    const statusLabel = (value) => (
        value === 'published' ? t('pages.admin.learning.published') : t('pages.admin.learning.draft')
    );

    // Загружает данные, необходимые для текущего экрана или сценария.
    const loadData = async () => {
        try {
            const [coursesRes, topicsRes, categoriesRes] = await Promise.all([
                CourseService.getAuthorCourses(),
                CourseService.getAuthorTopics(courseId),
                CourseService.getAuthorCategories()
            ]);
            const currentCourse = (coursesRes.data || []).find((item) => item._id === courseId) || null;
            if (!currentCourse) {
                navigate('/author/learning');
                return;
            }
            setCourse(currentCourse);
            setCategories(categoriesRes.data || []);
            setTopics(topicsRes.data || []);
            const loadedCategoryIds = Array.isArray(currentCourse?.categoryIds) && currentCourse.categoryIds.length > 0
                ? currentCourse.categoryIds.map((entry) => String(entry?._id || entry || '')).filter(Boolean)
                : [String(currentCourse?.categoryId?._id || currentCourse?.categoryId || '')].filter(Boolean);
            setCourseCategoryIds(loadedCategoryIds);
            setSavedCourseCategoryIds(loadedCategoryIds);
        } catch (e) {
            setError(e.response?.data?.message || t('pages.course.load_error'));
        }
    };

    useEffect(() => {
        setLocallySubmittedForReview(false);
        const timer = setTimeout(() => {
            loadData();
        }, 0);
        return () => clearTimeout(timer);
    }, [courseId]);

    // Принимает отправленные пользователем данные и фиксирует результат.
    const submitReview = async () => {
        if (!course || editingBlocked) return;
        if (course.canSubmitForReview === false) {
            uiStore.showModal({
                title: t('pages.admin.learning.submit_unavailable_title'),
                message: t('pages.admin.learning.submit_unavailable_message'),
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
                try {
                    const { data } = await CourseService.submitAuthorCourseForReview(course._id);
                    const alreadySubmitted = Boolean(data?.alreadySubmitted);
                    setLocallySubmittedForReview(true);
                    uiStore.showModal({
                        title: alreadySubmitted ? t('pages.admin.learning.already_submitted_title') : t('pages.admin.learning.submitted_title'),
                        message: alreadySubmitted ? t('pages.admin.learning.already_submitted_message') : t('pages.admin.learning.submitted_message'),
                        variant: 'info',
                        secondaryLabel: t('common.close')
                    });
                    await loadData();
                } catch (err) {
                    setError(err.response?.data?.message || t('pages.admin.learning.submit_review_error'));
                }
            },
            onSecondary: () => uiStore.closeModal()
        });
    };

    const persistTopicOrder = async (orderedTopics) => {
        const updates = orderedTopics
            .map((topic, index) => ({
                id: topic._id,
                order: index + 1
            }))
            .filter((item, index) => Number(orderedTopics[index].order) !== item.order);

        if (!updates.length) return;
        await Promise.all(updates.map((item) => CourseService.updateAuthorTopic(item.id, { order: item.order })));
    };

    // Удаляет связь или сущность по запросу пользователя.
    const removeTopic = async (topicId) => {
        if (editingBlocked) return;
        uiStore.showModal({
            title: t('pages.admin.learning.delete_topic_title'),
            message: t('pages.admin.learning.delete_topic_message'),
            variant: 'error',
            primaryLabel: t('common.actions.delete'),
            secondaryLabel: t('modals.cancel'),
            onPrimary: async () => {
                try {
                    await CourseService.deleteAuthorTopic(topicId);
                    uiStore.closeModal();
                    await loadData();
                } catch (err) {
                    uiStore.showModal({
                        title: t('modals.error'),
                        message: err.response?.data?.message || t('pages.admin.learning.delete_topic_error'),
                        variant: 'error',
                        secondaryLabel: t('common.close')
                    });
                }
            }
        });
    };

    // Переключает состояние выбранной сущности или настройки.
    const toggleTopicStatus = async (topic) => {
        if (editingBlocked) return;
        const nextStatus = topic.status === 'published' ? 'draft' : 'published';
        if (nextStatus === 'published' && hasTopicBlockValidationErrors(topic)) {
            const errors = getTopicBlockValidationErrors(topic.contentBlocks || []);
            setError(t('pages.admin.learning.publish_topic_required'));
            if (errors.some(Boolean)) {
                navigate(`/author/learning/courses/${courseId}/topics/${topic._id}/edit`);
            }
            return;
        }
        uiStore.showModal({
            title: t('pages.admin.learning.change_topic_status_title'),
            message: t('pages.admin.learning.change_topic_status_message', {
                title: topic.title,
                status: nextStatus === 'published'
                    ? t('pages.admin.learning.topic_will_publish')
                    : t('pages.admin.learning.topic_will_draft')
            }),
            variant: 'info',
            primaryLabel: t('modals.yes'),
            secondaryLabel: t('modals.cancel'),
            onPrimary: async () => {
                try {
                    await CourseService.updateAuthorTopic(topic._id, { status: nextStatus });
                    uiStore.closeModal();
                    await loadData();
                } catch (err) {
                    uiStore.showModal({
                        title: t('modals.error'),
                        message: err.response?.data?.message || t('pages.admin.learning.update_topic_error'),
                        variant: 'error',
                        secondaryLabel: t('common.close')
                    });
                }
            },
            onSecondary: () => uiStore.closeModal()
        });
    };

    // Обрабатывает событие интерфейса пользователя.
    const onDropTopic = async (dropIndex) => {
        if (editingBlocked) return;
        if (topicDragIndex < 0 || dropIndex < 0 || topicDragIndex >= topics.length || dropIndex >= topics.length) {
            setTopicDragIndex(-1);
            setTopicDragOverIndex(-1);
            return;
        }

        const reordered = moveItem(topics, topicDragIndex, dropIndex);
        setTopics(reordered);
        setTopicDragIndex(-1);
        setTopicDragOverIndex(-1);
        try {
            await persistTopicOrder(reordered);
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || t('pages.admin.learning.save_topics_order_error'));
            await loadData();
        }
    };

    // Сохраняет изменения пользователя.
    const saveCourseCategory = async () => {
        if (editingBlocked || !hasCategoryChanges || isSavingCategories) return;
        if (!Array.isArray(courseCategoryIds) || courseCategoryIds.length === 0) {
            setError(t('pages.admin.learning.select_category_error'));
            return;
        }
        try {
            setIsSavingCategories(true);
            await CourseService.updateAuthorCourse(courseId, { categoryIds: courseCategoryIds });
            setSavedCourseCategoryIds(courseCategoryIds);
            setCategoriesSaved(true);
            uiStore.showModal({
                title: t('modals.done'),
                message: t('pages.admin.learning.categories_updated'),
                variant: 'success',
                secondaryLabel: t('common.close')
            });
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || t('pages.admin.learning.change_categories_error'));
        } finally {
            setIsSavingCategories(false);
        }
    };

    // Переключает состояние выбранной сущности или настройки.
    const toggleCourseCategory = (categoryId, checked) => {
        if (editingBlocked) return;
        setCategoriesSaved(false);
        setCourseCategoryIds((prev) => {
            if (checked) {
                if (prev.includes(categoryId)) return prev;
                return [...prev, categoryId];
            }
            return prev.filter((id) => id !== categoryId);
        });
    };

    const hasCategoryChanges = useMemo(() => {
        return JSON.stringify(normalizedIds(courseCategoryIds)) !== JSON.stringify(normalizedIds(savedCourseCategoryIds));
    }, [courseCategoryIds, savedCourseCategoryIds]);

    const categorySaveLabel = hasCategoryChanges
        ? (isSavingCategories ? t('pages.admin.learning.saving') : t('pages.admin.learning.save_categories'))
        : (categoriesSaved ? t('pages.admin.learning.saved') : t('pages.admin.learning.no_changes_saved'));

    const submitReviewLabel = isPendingReview
        ? t('pages.admin.learning.sent_to_review')
        : (course?.canSubmitForReview === false ? t('pages.admin.learning.no_changes') : t('pages.admin.learning.submit_review'));

    return (
        <div className={`${styles.page} app-page-shell`}>
            <div className="app-page-top">
                <div>
                    <Link to="/author/learning" className={styles.back}>← {t('pages.admin.learning.my_courses')}</Link>
                    <h1 className="app-page-title">{course?.title || t('pages.course.fallback_title')}</h1>
                    {course?.description && <p className="app-page-subtitle">{course.description}</p>}
                </div>
            </div>
            {error && <p className={styles.error}>{error}</p>}

            {isPendingReview && (
                <section className={styles.card}>
                    <p>{t('pages.admin.learning.pending_notice')}</p>
                </section>
            )}

            <section className={styles.card}>
                <button
                    type="button"
                    onClick={submitReview}
                    disabled={!course?.canSubmitForReview || isPendingReview}
                    className={styles.fullWidthButton}
                >
                    {submitReviewLabel}
                </button>
            </section>

            <section className={styles.card}>
                <h3>{t('pages.admin.learning.category')}</h3>
                <div className={styles.courseCategoryRow}>
                    <div className={styles.fieldGroup}>
                        <div className={styles.categoryChecks} role="group" aria-label={t('pages.admin.learning.course_categories')}>
                            {categories.map((category) => (
                                <label
                                    key={category._id}
                                    className={`${styles.categoryCheck} ${courseCategoryIds.includes(category._id) ? styles.categoryCheckSelected : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        disabled={editingBlocked}
                                        checked={courseCategoryIds.includes(category._id)}
                                        onChange={(e) => toggleCourseCategory(category._id, e.target.checked)}
                                    />
                                    <span>{category.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={saveCourseCategory}
                        disabled={editingBlocked || !hasCategoryChanges || isSavingCategories}
                    >
                        {categorySaveLabel}
                    </button>
                </div>
            </section>

            <section className={styles.card}>
                <h3>{t('pages.admin.learning.topics')}</h3>
                <div className={styles.topicsList}>
                    {topics.map((topic, index) => (
                        <div
                            key={topic._id}
                            className={`${styles.row} ${topicDragOverIndex === index ? styles.rowDragOver : ''}`}
                            draggable={!editingBlocked}
                            onDragStart={() => setTopicDragIndex(index)}
                            onDragOver={(e) => {
                                if (editingBlocked) return;
                                e.preventDefault();
                                setTopicDragOverIndex(index);
                            }}
                            onDrop={() => onDropTopic(index)}
                            onDragEnd={() => {
                                setTopicDragIndex(-1);
                                setTopicDragOverIndex(-1);
                            }}
                        >
                            <div className={styles.rowMain}>
                                <strong className={styles.topicTitle} title={topic.title}>{topic.title}</strong>
                                <small>{statusLabel(topic.status)}</small>
                            </div>
                            <div className={styles.topicActions}>
                                <button type="button" disabled={editingBlocked} onClick={() => navigate(`/author/learning/courses/${courseId}/topics/${topic._id}/edit`)}>{t('common.actions.edit')}</button>
                                <button type="button" disabled={editingBlocked} onClick={() => toggleTopicStatus(topic)}>
                                    {topic.status === 'published' ? t('common.actions.to_draft') : t('common.actions.publish')}
                                </button>
                                <button type="button" disabled={editingBlocked} onClick={() => removeTopic(topic._id)}>{t('common.actions.delete')}</button>
                            </div>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    disabled={editingBlocked}
                    className={styles.newTopicButton}
                    onClick={() => navigate(`/author/learning/courses/${courseId}/topics/new`)}
                >
                    {t('common.actions.new_topic')}
                </button>
            </section>
        </div>
    );
};

export default AuthorLearningCoursePage;
