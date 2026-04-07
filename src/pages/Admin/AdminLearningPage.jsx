import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

const emptyCourse = {
    title: '',
    description: '',
    categoryId: '',
    status: 'published',
    order: 0,
    isPinnedHome: false,
    pinnedHomeText: ''
};

const AdminLearningPage = () => {
    const { uiStore } = useStores();
    const [categories, setCategories] = useState([]);
    const [courses, setCourses] = useState([]);
    const [error, setError] = useState('');

    const [categoryName, setCategoryName] = useState('');
    const [editingCategoryId, setEditingCategoryId] = useState('');
    const [editingCategoryName, setEditingCategoryName] = useState('');
    const [courseForm, setCourseForm] = useState(emptyCourse);
    const [pinForm, setPinForm] = useState({
        courseId: '',
        enabled: false,
        text: '',
        mode: 'persistent'
    });

    const [filterCategoryId, setFilterCategoryId] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [search, setSearch] = useState('');

    const filteredCourses = useMemo(() => {
        return courses.filter((course) => {
            const byCategory = !filterCategoryId || String(course.categoryId?._id || course.categoryId) === String(filterCategoryId);
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

    const createCourse = async (e) => {
        e.preventDefault();
        try {
            await CourseService.createAdminCourse(courseForm);
            setCourseForm(emptyCourse);
            await loadAll();
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка создания курса');
        }
    };

    const savePinnedCourse = async (e) => {
        e.preventDefault();
        try {
            if (!pinForm.enabled) {
                const currentPinned = courses.find((course) => course.isPinnedHome);
                if (currentPinned) {
                    await CourseService.updateAdminCourse(currentPinned._id, {
                        isPinnedHome: false,
                        pinnedHomeText: ''
                    });
                }

                uiStore.showModal({
                    title: 'Готово',
                    message: 'Закрепленный курс снят с главной.',
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
                message: 'Курс закреплен на главной странице.',
                variant: 'success',
                secondaryLabel: 'Закрыть'
            });
            await loadAll();
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка сохранения закрепленного курса');
        }
    };

    const toggleCourseStatus = async (course) => {
        try {
            await CourseService.updateAdminCourse(course._id, {
                status: course.status === 'published' ? 'draft' : 'published'
            });
            await loadAll();
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка обновления курса');
        }
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
        <div className={styles.page}>
            <h1>Админ: обучение</h1>
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
                <h3>Новый курс</h3>
                <form className={styles.createCourseForm} onSubmit={createCourse}>
                    <input
                        value={courseForm.title}
                        onChange={(e) => setCourseForm((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Название курса"
                        required
                    />
                    <textarea
                        value={courseForm.description}
                        onChange={(e) => setCourseForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Описание курса"
                    />
                    <div className={styles.inlineFields}>
                        <select
                            value={courseForm.categoryId}
                            onChange={(e) => setCourseForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                            required
                        >
                            <option value="">Выберите категорию</option>
                            {categories.map((category) => (
                                <option key={category._id} value={category._id}>{category.name}</option>
                            ))}
                        </select>
                        <select
                            value={courseForm.status}
                            onChange={(e) => setCourseForm((prev) => ({ ...prev, status: e.target.value }))}
                        >
                            <option value="published">Опубликован</option>
                            <option value="draft">Черновик</option>
                        </select>
                    </div>
                    <button type="submit">Создать курс</button>
                </form>
            </section>

            <section className={styles.card}>
                <h3>Закрепленный курс на главной</h3>
                <form className={styles.createCourseForm} onSubmit={savePinnedCourse}>
                    <select
                        value={pinForm.courseId}
                        onChange={(e) => setPinForm((prev) => ({ ...prev, courseId: e.target.value }))}
                        disabled={!pinForm.enabled}
                    >
                        <option value="">Выберите курс</option>
                        {courses.map((course) => (
                            <option key={course._id} value={course._id}>{course.title}</option>
                        ))}
                    </select>
                    <label className={styles.pinToggle}>
                        <input
                            type="checkbox"
                            checked={pinForm.enabled}
                            onChange={(e) => setPinForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                        />
                        Показать закрепленную плашку на главной
                    </label>
                    <input
                        value={pinForm.text}
                        onChange={(e) => setPinForm((prev) => ({ ...prev, text: e.target.value }))}
                        placeholder="Текст плашки на главной"
                        disabled={!pinForm.enabled}
                    />
                    <select
                        value={pinForm.mode}
                        onChange={(e) => setPinForm((prev) => ({ ...prev, mode: e.target.value }))}
                        disabled={!pinForm.enabled}
                    >
                        {PINNED_MODE_OPTIONS.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                    </select>
                    <button type="submit">Сохранить закрепление</button>
                </form>
            </section>

            <section className={styles.card}>
                <div className={styles.coursesHead}>
                    <h3>Курсы</h3>
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
                                {course.categoryId?.name || 'Без категории'} · {statusLabel(course.status)}
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
                            <button type="button" onClick={() => removeCourse(course._id)}>Удалить</button>
                        </div>
                    </div>
                ))}
                {filteredCourses.length === 0 && <p className={styles.empty}>Курсы не найдены</p>}
            </section>
        </div>
    );
};

export default AdminLearningPage;
