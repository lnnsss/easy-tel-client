import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CourseService from '../../services/CourseService';
import styles from './CoursesPage.module.css';

const CoursesPage = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [completionFilter, setCompletionFilter] = useState('all');

    const isVisibleByCompletion = (course) => {
        if (completionFilter === 'completed') return Boolean(course.progress?.completed);
        if (completionFilter === 'incomplete') return !course.progress?.completed;
        return true;
    };

    const visibleCategories = categories
        .map((category) => ({
            ...category,
            courses: (category.courses || []).filter(isVisibleByCompletion)
        }))
        .filter((category) => (category.courses || []).length > 0);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const { data } = await CourseService.getCourses();
                setCategories(data.categories || []);
            } catch (e) {
                setError(e.response?.data?.message || 'Ошибка загрузки материала');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) return <div className={styles.state}>Загрузка материала...</div>;
    if (error) return <div className={styles.stateError}>{error}</div>;

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>Учебный материал</h1>
            <p className={styles.subtitle}>Выберите материал и проходите темы по порядку.</p>
            <div className={styles.completionFilters}>
                <button
                    type="button"
                    className={`${styles.filterBtn} ${completionFilter === 'all' ? styles.filterBtnActive : ''}`}
                    onClick={() => setCompletionFilter('all')}
                >
                    Все
                </button>
                <button
                    type="button"
                    className={`${styles.filterBtn} ${completionFilter === 'completed' ? styles.filterBtnActive : ''}`}
                    onClick={() => setCompletionFilter('completed')}
                >
                    Пройденные
                </button>
                <button
                    type="button"
                    className={`${styles.filterBtn} ${completionFilter === 'incomplete' ? styles.filterBtnActive : ''}`}
                    onClick={() => setCompletionFilter('incomplete')}
                >
                    Непройденные
                </button>
            </div>
            {visibleCategories.length === 0 && <p className={styles.empty}>Пока нет опубликованных материалов</p>}

            {visibleCategories.map((category) => (
                <section key={category._id} className={styles.category}>
                    <h2 className={styles.categoryTitle}>{category.name}</h2>
                    <div className={styles.courseGrid}>
                        {(category.courses || []).map((course) => (
                            <article
                                key={course._id}
                                className={`${styles.courseCard} ${course.progress?.completed ? styles.courseCardCompleted : ''}`}
                            >
                                <div className={styles.courseMain}>
                                    <h3 className={styles.courseTitle}>{course.title}</h3>
                                    <p className={styles.courseDescription}>{course.description || 'Описание пока не добавлено'}</p>
                                    <div className={styles.meta}>
                                        <span>
                                            Пройдено тем: {course.progress?.completedTopics || 0}/{course.progress?.totalTopics || 0}
                                        </span>
                                    </div>
                                </div>
                                <Link to={`/courses/${course._id}`} className={styles.btn}>
                                    {course.progress?.completed
                                        ? 'Открыть повторно'
                                        : (course.progress?.completedTopics || 0) > 0
                                            ? 'Продолжить курс'
                                            : 'Начать курс'}
                                </Link>
                            </article>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
};

export default CoursesPage;
