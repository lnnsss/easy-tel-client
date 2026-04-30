import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CourseService from '../../services/CourseService';
import { useStores } from '../../stores/StoreContext';
import { getTopicBlockValidationErrors, hasTopicBlockValidationErrors } from '../../utils/topicContent';
import styles from '../Admin/AdminLearningCoursePage.module.css';

const statusLabel = (value) => (value === 'published' ? 'Опубликован' : 'Черновик');
const normalizedIds = (value) => [...new Set((value || []).map((id) => String(id)))].sort();

const moveItem = (items, fromIndex, toIndex) => {
    if (fromIndex === toIndex) return items;
    const next = [...items];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    return next;
};

const AuthorLearningCoursePage = () => {
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
            setError(e.response?.data?.message || 'Ошибка загрузки курса');
        }
    };

    useEffect(() => {
        setLocallySubmittedForReview(false);
        const timer = setTimeout(() => {
            loadData();
        }, 0);
        return () => clearTimeout(timer);
    }, [courseId]);

    const submitReview = async () => {
        if (!course || editingBlocked) return;
        if (course.canSubmitForReview === false) {
            uiStore.showModal({
                title: 'Отправка недоступна',
                message: 'В курсе нет изменений после последней модерации.',
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
                try {
                    const { data } = await CourseService.submitAuthorCourseForReview(course._id);
                    const alreadySubmitted = Boolean(data?.alreadySubmitted);
                    setLocallySubmittedForReview(true);
                    uiStore.showModal({
                        title: alreadySubmitted ? 'Уже отправлено' : 'Отправлено',
                        message: alreadySubmitted ? 'Курс уже отправлен на модерацию.' : 'Курс отправлен на модерацию.',
                        variant: 'info',
                        secondaryLabel: 'Закрыть'
                    });
                    await loadData();
                } catch (err) {
                    setError(err.response?.data?.message || 'Ошибка отправки на модерацию');
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

    const removeTopic = async (topicId) => {
        if (editingBlocked) return;
        uiStore.showModal({
            title: 'Удалить тему?',
            message: 'Тема и связанный тест будут удалены.',
            variant: 'error',
            primaryLabel: 'Удалить',
            secondaryLabel: 'Отмена',
            onPrimary: async () => {
                try {
                    await CourseService.deleteAuthorTopic(topicId);
                    uiStore.closeModal();
                    await loadData();
                } catch (err) {
                    uiStore.showModal({
                        title: 'Ошибка',
                        message: err.response?.data?.message || 'Ошибка удаления темы',
                        variant: 'error',
                        secondaryLabel: 'Закрыть'
                    });
                }
            }
        });
    };

    const toggleTopicStatus = async (topic) => {
        if (editingBlocked) return;
        const nextStatus = topic.status === 'published' ? 'draft' : 'published';
        if (nextStatus === 'published' && hasTopicBlockValidationErrors(topic)) {
            const errors = getTopicBlockValidationErrors(topic.contentBlocks || []);
            setError('Чтобы опубликовать тему, заполните обязательные поля в блоках');
            if (errors.some(Boolean)) {
                navigate(`/author/learning/courses/${courseId}/topics/${topic._id}/edit`);
            }
            return;
        }
        uiStore.showModal({
            title: 'Изменить статус темы?',
            message: `Тема "${topic.title}" будет ${nextStatus === 'published' ? 'опубликована' : 'переведена в черновик'}.`,
            variant: 'info',
            primaryLabel: 'Подтвердить',
            secondaryLabel: 'Отмена',
            onPrimary: async () => {
                try {
                    await CourseService.updateAuthorTopic(topic._id, { status: nextStatus });
                    uiStore.closeModal();
                    await loadData();
                } catch (err) {
                    uiStore.showModal({
                        title: 'Ошибка',
                        message: err.response?.data?.message || 'Ошибка обновления темы',
                        variant: 'error',
                        secondaryLabel: 'Закрыть'
                    });
                }
            },
            onSecondary: () => uiStore.closeModal()
        });
    };

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
            setError(err.response?.data?.message || 'Ошибка сохранения порядка тем');
            await loadData();
        }
    };

    const saveCourseCategory = async () => {
        if (editingBlocked || !hasCategoryChanges || isSavingCategories) return;
        if (!Array.isArray(courseCategoryIds) || courseCategoryIds.length === 0) {
            setError('Выберите хотя бы одну категорию');
            return;
        }
        try {
            setIsSavingCategories(true);
            await CourseService.updateAuthorCourse(courseId, { categoryIds: courseCategoryIds });
            setSavedCourseCategoryIds(courseCategoryIds);
            setCategoriesSaved(true);
            uiStore.showModal({
                title: 'Готово',
                message: 'Категории курса обновлены.',
                variant: 'success',
                secondaryLabel: 'Закрыть'
            });
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Не удалось сменить категории курса');
        } finally {
            setIsSavingCategories(false);
        }
    };

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
        ? (isSavingCategories ? 'Сохраняем...' : 'Сохранить категории')
        : (categoriesSaved ? 'Сохранено' : 'Изменений нет');

    const submitReviewLabel = isPendingReview
        ? 'Отправлено на модерацию'
        : (course?.canSubmitForReview === false ? 'Нет изменений для отправки' : 'Отправить курс на модерацию');

    return (
        <div className={`${styles.page} app-page-shell`}>
            <div className="app-page-top">
                <div>
                    <Link to="/author/learning" className={styles.back}>← К моим курсам</Link>
                    <h1 className="app-page-title">{course?.title || 'Курс'}</h1>
                    {course?.description && <p className="app-page-subtitle">{course.description}</p>}
                </div>
            </div>
            {error && <p className={styles.error}>{error}</p>}

            {isPendingReview && (
                <section className={styles.card}>
                    <p>Курс на модерации. Редактирование временно недоступно.</p>
                </section>
            )}

            <section className={styles.card}>
                <button
                    type="button"
                    onClick={submitReview}
                    disabled={!Boolean(course?.canSubmitForReview) || isPendingReview}
                    className={styles.fullWidthButton}
                >
                    {submitReviewLabel}
                </button>
            </section>

            <section className={styles.card}>
                <h3>Категория</h3>
                <div className={styles.courseCategoryRow}>
                    <div className={styles.fieldGroup}>
                        <div className={styles.categoryChecks} role="group" aria-label="Категории курса">
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
                <h3>Темы курса</h3>
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
                                <button type="button" disabled={editingBlocked} onClick={() => navigate(`/author/learning/courses/${courseId}/topics/${topic._id}/edit`)}>Редактировать</button>
                                <button type="button" disabled={editingBlocked} onClick={() => toggleTopicStatus(topic)}>
                                    {topic.status === 'published' ? 'В черновик' : 'Опубликовать'}
                                </button>
                                <button type="button" disabled={editingBlocked} onClick={() => removeTopic(topic._id)}>Удалить</button>
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
                    Новая тема
                </button>
            </section>
        </div>
    );
};

export default AuthorLearningCoursePage;
