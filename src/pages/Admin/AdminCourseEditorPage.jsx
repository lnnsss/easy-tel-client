import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CourseService from '../../services/CourseService';
import { useStores } from '../../stores/StoreContext';
import styles from './AdminLearningPage.module.css';

const emptyCourse = {
    title: '',
    description: '',
    categoryIds: [],
    status: 'published',
    order: 0
};

// Отрисовывает экран или компонент AdminCourseEditorPage и связывает его с данными приложения.
const AdminCourseEditorPage = () => {
    const { t } = useTranslation();
    const { uiStore } = useStores();
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [courseForm, setCourseForm] = useState(emptyCourse);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const { data } = await CourseService.getAdminCategories();
                setCategories(data || []);
            } catch (err) {
                setError(err.response?.data?.message || t('pages.admin.course_form.load_categories_error'));
            }
        };
        loadCategories();
    }, []);

    // Переключает состояние выбранной сущности или настройки.
    const toggleCourseFormCategory = (categoryId, checked) => {
        setCourseForm((prev) => {
            const current = Array.isArray(prev.categoryIds) ? prev.categoryIds : [];
            if (checked) {
                if (current.includes(categoryId)) return prev;
                return { ...prev, categoryIds: [...current, categoryId] };
            }
            return { ...prev, categoryIds: current.filter((id) => id !== categoryId) };
        });
    };

    // Принимает отправленные пользователем данные и фиксирует результат.
    const submitCreateCourse = async () => {
        if (saving) return;
        if (!Array.isArray(courseForm.categoryIds) || courseForm.categoryIds.length === 0) {
            setError(t('pages.admin.course_form.select_category_error'));
            return;
        }
        try {
            setSaving(true);
            const { data } = await CourseService.createAdminCourse(courseForm);
            uiStore.closeModal();
            navigate(`/admin/learning/courses/${data?._id || ''}`);
        } catch (err) {
            setError(err.response?.data?.message || t('pages.admin.course_form.create_error'));
        } finally {
            setSaving(false);
        }
    };

    // Создает сущность и возвращает результат клиенту.
    const createCourse = (event) => {
        event.preventDefault();
        uiStore.showModal({
            title: t('pages.admin.course_form.create_title'),
            message: t('pages.admin.course_form.create_message_admin'),
            variant: 'info',
            primaryLabel: t('common.actions.create'),
            secondaryLabel: t('common.actions.cancel'),
            onPrimary: submitCreateCourse,
            onSecondary: () => uiStore.closeModal()
        });
    };

    const cancelCreate = () => {
        uiStore.showModal({
            title: t('pages.admin.course_form.cancel_title'),
            message: t('pages.admin.course_form.cancel_message'),
            variant: 'info',
            primaryLabel: t('common.actions.exit'),
            secondaryLabel: t('pages.admin.course_form.stay'),
            onPrimary: () => {
                uiStore.closeModal();
                navigate('/admin/learning');
            },
            onSecondary: () => uiStore.closeModal()
        });
    };

    return (
        <div className={`${styles.page} app-page-shell`}>
            <div className="app-page-top">
                <div>
                    <Link to="/admin/learning" className={styles.back}>{t('pages.admin.course_form.back_to_courses')}</Link>
                    <h1 className="app-page-title">{t('pages.admin.new_course')}</h1>
                </div>
            </div>
            {error ? <p className={styles.error}>{error}</p> : null}

            <form className={styles.card} onSubmit={createCourse}>
                <label className={styles.fieldGroup}>
                    <span>{t('pages.admin.course_form.name')}</span>
                    <input
                        value={courseForm.title}
                        onChange={(e) => setCourseForm((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder={t('pages.admin.course_form.name_placeholder')}
                        required
                    />
                </label>
                <label className={styles.fieldGroup}>
                    <span>{t('pages.admin.course_form.description')}</span>
                    <textarea
                        value={courseForm.description}
                        onChange={(e) => setCourseForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder={t('pages.admin.course_form.description_placeholder')}
                    />
                </label>
                <div className={styles.inlineFields}>
                    <div className={styles.fieldGroup}>
                        <span>{t('pages.admin.course_form.categories')}</span>
                        <div className={styles.categoryChecks} role="group" aria-label={t('pages.admin.course_form.course_categories')}>
                            {categories.map((category) => (
                                <label
                                    key={category._id}
                                    className={`${styles.categoryCheck} ${courseForm.categoryIds.includes(category._id) ? styles.categoryCheckSelected : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={courseForm.categoryIds.includes(category._id)}
                                        onChange={(e) => toggleCourseFormCategory(category._id, e.target.checked)}
                                    />
                                    <span>{category.name}</span>
                                </label>
                            ))}
                            {categories.length === 0 && <p className={styles.empty}>{t('pages.admin.course_form.create_category_first')}</p>}
                        </div>
                    </div>
                    <label className={styles.fieldGroup}>
                        <span>{t('pages.admin.course_form.status')}</span>
                        <select
                            value={courseForm.status}
                            onChange={(e) => setCourseForm((prev) => ({ ...prev, status: e.target.value }))}
                        >
                            <option value="published">{t('pages.admin.course_form.published')}</option>
                            <option value="draft">{t('pages.admin.course_form.draft')}</option>
                        </select>
                    </label>
                </div>
                <div className={styles.equalActions}>
                    <button type="submit" className={styles.successBtn} disabled={saving}>{saving ? t('pages.admin.course_form.creating') : t('common.actions.create_course')}</button>
                    <button type="button" className={styles.ghostBtn} onClick={cancelCreate}>{t('common.actions.cancel')}</button>
                </div>
            </form>
        </div>
    );
};

export default AdminCourseEditorPage;
