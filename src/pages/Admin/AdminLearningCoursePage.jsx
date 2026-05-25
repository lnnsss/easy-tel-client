import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CourseService from '../../services/CourseService';
import { useStores } from '../../stores/StoreContext';
import { getTopicBlockValidationErrors, hasTopicBlockValidationErrors } from '../../utils/topicContent';
import styles from './AdminLearningCoursePage.module.css';

const statusLabel = (value) => (value === 'published' ? 'Опубликован' : 'Черновик');
const normalizedIds = (value) => [...new Set((value || []).map((id) => String(id)))].sort();

const moveItem = (items, fromIndex, toIndex) => {
    if (fromIndex === toIndex) return items;
    const next = [...items];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    return next;
};

const AdminLearningCoursePage = () => {
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

    const loadData = async () => {
        try {
            const [coursesRes, topicsRes, categoriesRes] = await Promise.all([
                CourseService.getAdminCourses(),
                CourseService.getAdminTopics(courseId),
                CourseService.getAdminCategories()
            ]);
            const currentCourse = (coursesRes.data || []).find((item) => item._id === courseId) || null;
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
        loadData();
    }, [courseId]);

    const persistTopicOrder = async (orderedTopics) => {
        const updates = orderedTopics
            .map((topic, index) => ({
                id: topic._id,
                order: index + 1
            }))
            .filter((item, index) => Number(orderedTopics[index].order) !== item.order);

        if (!updates.length) return;
        await Promise.all(updates.map((item) => CourseService.updateAdminTopic(item.id, { order: item.order })));
    };

    const removeTopic = async (topicId) => {
        uiStore.showModal({
            title: 'Удалить тему?',
            message: 'Тема и связанный тест будут удалены.',
            variant: 'error',
            primaryLabel: 'Удалить',
            secondaryLabel: 'Отмена',
            onPrimary: async () => {
                try {
                    await CourseService.deleteAdminTopic(topicId);
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
        const nextStatus = topic.status === 'published' ? 'draft' : 'published';
        if (nextStatus === 'published' && hasTopicBlockValidationErrors(topic)) {
            const errors = getTopicBlockValidationErrors(topic.contentBlocks || []);
            setError('Чтобы опубликовать тему, заполните обязательные поля в блоках');
            if (errors.some(Boolean)) {
                navigate(`/admin/learning/courses/${courseId}/topics/${topic._id}/edit`);
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
                    await CourseService.updateAdminTopic(topic._id, { status: nextStatus });
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
        if (!hasCategoryChanges || isSavingCategories) return;
        if (!Array.isArray(courseCategoryIds) || courseCategoryIds.length === 0) {
            setError('Выберите хотя бы одну категорию');
            return;
        }
        try {
            setIsSavingCategories(true);
            await CourseService.updateAdminCourse(courseId, { categoryIds: courseCategoryIds });
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
            uiStore.showModal({
                title: 'Ошибка',
                message: err.response?.data?.message || 'Не удалось сменить категорию курса',
                variant: 'error',
                secondaryLabel: 'Закрыть'
            });
        } finally {
            setIsSavingCategories(false);
        }
    };

    const toggleCourseCategory = (categoryId, checked) => {
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

    return (
        <div className={`${styles.page} app-page-shell`}>
            <div className="app-page-top">
                <div>
                    <Link to="/admin/learning" className={styles.back}>← К курсам</Link>
                    <h1 className="app-page-title">{course?.title || t('pages.course.fallback_title')}</h1>
                    {course?.description && <p className="app-page-subtitle">{course.description}</p>}
                </div>
            </div>
            {error && <p className={styles.error}>{error}</p>}

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
                                        checked={courseCategoryIds.includes(category._id)}
                                        onChange={(e) => toggleCourseCategory(category._id, e.target.checked)}
                                    />
                                    <span>{category.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <button type="button" onClick={saveCourseCategory} disabled={!hasCategoryChanges || isSavingCategories}>
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
                            draggable
                            onDragStart={() => setTopicDragIndex(index)}
                            onDragOver={(e) => {
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
                                <button type="button" onClick={() => navigate(`/admin/learning/courses/${courseId}/topics/${topic._id}/edit`)}>{t('common.actions.edit')}</button>
                                <button type="button" onClick={() => toggleTopicStatus(topic)}>
                                    {topic.status === 'published' ? t('common.actions.to_draft') : t('common.actions.publish')}
                                </button>
                                <button type="button" onClick={() => removeTopic(topic._id)}>{t('common.actions.delete')}</button>
                            </div>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    className={styles.newTopicButton}
                    onClick={() => navigate(`/admin/learning/courses/${courseId}/topics/new`)}
                >
                    {t('common.actions.new_topic')}
                </button>
            </section>
        </div>
    );
};

export default AdminLearningCoursePage;
