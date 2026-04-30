import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const AdminCourseEditorPage = () => {
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
                setError(err.response?.data?.message || 'Ошибка загрузки категорий');
            }
        };
        loadCategories();
    }, []);

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

    const submitCreateCourse = async () => {
        if (saving) return;
        if (!Array.isArray(courseForm.categoryIds) || courseForm.categoryIds.length === 0) {
            setError('Выберите хотя бы одну категорию');
            return;
        }
        try {
            setSaving(true);
            const { data } = await CourseService.createAdminCourse(courseForm);
            uiStore.closeModal();
            navigate(`/admin/learning/courses/${data?._id || ''}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка создания курса');
        } finally {
            setSaving(false);
        }
    };

    const createCourse = (event) => {
        event.preventDefault();
        uiStore.showModal({
            title: 'Создать курс?',
            message: 'Курс будет создан и откроется для редактирования.',
            variant: 'info',
            primaryLabel: 'Создать',
            secondaryLabel: 'Отмена',
            onPrimary: submitCreateCourse,
            onSecondary: () => uiStore.closeModal()
        });
    };

    const cancelCreate = () => {
        uiStore.showModal({
            title: 'Отменить создание?',
            message: 'Несохраненные изменения будут потеряны.',
            variant: 'info',
            primaryLabel: 'Выйти',
            secondaryLabel: 'Остаться',
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
                    <Link to="/admin/learning" className={styles.back}>← К курсам</Link>
                    <h1 className="app-page-title">Новый курс</h1>
                </div>
            </div>
            {error ? <p className={styles.error}>{error}</p> : null}

            <form className={styles.card} onSubmit={createCourse}>
                <label className={styles.fieldGroup}>
                    <span>Название</span>
                    <input
                        value={courseForm.title}
                        onChange={(e) => setCourseForm((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Название курса"
                        required
                    />
                </label>
                <label className={styles.fieldGroup}>
                    <span>Описание</span>
                    <textarea
                        value={courseForm.description}
                        onChange={(e) => setCourseForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Описание курса"
                    />
                </label>
                <div className={styles.inlineFields}>
                    <div className={styles.fieldGroup}>
                        <span>Категории</span>
                        <div className={styles.categoryChecks} role="group" aria-label="Категории курса">
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
                            {categories.length === 0 && <p className={styles.empty}>Сначала создайте категорию</p>}
                        </div>
                    </div>
                    <label className={styles.fieldGroup}>
                        <span>Статус</span>
                        <select
                            value={courseForm.status}
                            onChange={(e) => setCourseForm((prev) => ({ ...prev, status: e.target.value }))}
                        >
                            <option value="published">Опубликован</option>
                            <option value="draft">Черновик</option>
                        </select>
                    </label>
                </div>
                <div className={styles.equalActions}>
                    <button type="submit" className={styles.successBtn} disabled={saving}>{saving ? 'Создаем...' : 'Создать курс'}</button>
                    <button type="button" className={styles.ghostBtn} onClick={cancelCreate}>Отмена</button>
                </div>
            </form>
        </div>
    );
};

export default AdminCourseEditorPage;
