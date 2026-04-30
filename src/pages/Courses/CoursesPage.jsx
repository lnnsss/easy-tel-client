import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CourseService from '../../services/CourseService';
import { useStores } from '../../stores/StoreContext';
import styles from './CoursesPage.module.css';

const EDUCATION_OPTIONS = [
    { value: 'secondary', label: 'Среднее образование' },
    { value: 'college', label: 'СПО / колледж' },
    { value: 'bachelor', label: 'Бакалавр' },
    { value: 'master_specialist', label: 'Магистр / специалист' },
    { value: 'phd', label: 'Аспирантура / докторская степень' },
    { value: 'other', label: 'Другое' }
];

const TATAR_LEVEL_OPTIONS = [
    { value: 'a0', label: 'A0 (нулевой)' },
    { value: 'a1', label: 'A1' },
    { value: 'a2', label: 'A2' },
    { value: 'b1', label: 'B1' },
    { value: 'b2', label: 'B2' },
    { value: 'c1', label: 'C1' },
    { value: 'c2', label: 'C2' },
    { value: 'native', label: 'Носитель' }
];

const TEACHING_LEVEL_OPTIONS = [
    { value: 'epg_phase_1', label: 'EPG Фаза 1 — начинающий преподаватель' },
    { value: 'epg_phase_2', label: 'EPG Фаза 2 — базовая практика преподавания' },
    { value: 'epg_phase_3', label: 'EPG Фаза 3 — самостоятельный преподаватель' },
    { value: 'epg_phase_4', label: 'EPG Фаза 4 — уверенный практик' },
    { value: 'epg_phase_5', label: 'EPG Фаза 5 — продвинутый наставник' },
    { value: 'epg_phase_6', label: 'EPG Фаза 6 — эксперт / лидер' }
];

const REQUEST_STATUS_LABEL = {
    pending: 'На рассмотрении',
    approved: 'Одобрена',
    rejected: 'Отклонена'
};

const CoursesPage = () => {
    const { authStore, uiStore } = useStores();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [completionFilter, setCompletionFilter] = useState('all');
    const [request, setRequest] = useState(null);
    const [requestLoading, setRequestLoading] = useState(false);
    const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
    const [requestBlockHidden, setRequestBlockHidden] = useState(false);
    const [requestForm, setRequestForm] = useState({
        educationLevel: 'bachelor',
        educationDetails: '',
        contactEmail: '',
        tatarLevel: 'b1',
        teachingLevel: 'epg_phase_2',
        motivation: ''
    });

    const isAuthor = authStore.user?.role === 'author';

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

    const hiddenKey = useMemo(() => (
        request?._id ? `easytel:author-request:hidden:${request._id}` : ''
    ), [request?._id]);

    const loadRequest = async () => {
        try {
            setRequestLoading(true);
            const { data } = await CourseService.getAuthorRequest();
            const latest = data?.request || authStore.user?.latestAuthorRequest || null;
            setRequest(latest);
        } catch {
            setRequest(authStore.user?.latestAuthorRequest || null);
        } finally {
            setRequestLoading(false);
        }
    };

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
        loadRequest();
    }, []);

    useEffect(() => {
        if (!hiddenKey) {
            setRequestBlockHidden(false);
            return;
        }
        setRequestBlockHidden(localStorage.getItem(hiddenKey) === '1');
    }, [hiddenKey]);

    const hideRequestBlock = () => {
        if (!hiddenKey) return;
        localStorage.setItem(hiddenKey, '1');
        setRequestBlockHidden(true);
    };

    const submitAuthorRequestConfirmed = async () => {
        try {
            await CourseService.createAuthorRequest(requestForm);
            setIsRequestFormOpen(false);
            uiStore.showModal({
                title: 'Заявка отправлена',
                message: 'Ваша заявка на роль автора отправлена администратору.',
                variant: 'success',
                secondaryLabel: 'Закрыть'
            });
            setRequestForm((prev) => ({ ...prev, motivation: '' }));
            await loadRequest();
            await authStore.refreshProfile();
        } catch (e2) {
            uiStore.showModal({
                title: 'Ошибка',
                message: e2.response?.data?.message || 'Не удалось отправить заявку',
                variant: 'error',
                secondaryLabel: 'Закрыть'
            });
        }
    };

    const submitAuthorRequest = async (e) => {
        e.preventDefault();
        uiStore.showModal({
            title: 'Отправить заявку?',
            message: 'Подтвердите отправку заявки на роль автора.',
            variant: 'info',
            primaryLabel: 'Отправить',
            secondaryLabel: 'Отмена',
            onPrimary: async () => {
                uiStore.closeModal();
                await submitAuthorRequestConfirmed();
            },
            onSecondary: () => uiStore.closeModal()
        });
    };

    if (loading) return <div className={styles.state}>Загрузка материала...</div>;
    if (error) return <div className={styles.stateError}>{error}</div>;

    return (
        <div className={`${styles.page} app-page-shell`}>
            <div className="app-page-top">
                <div>
                    <h1 className={`${styles.title} app-page-title`}>Учебный материал</h1>
                    <p className={`${styles.subtitle} app-page-subtitle`}>Выберите материал и проходите темы по порядку.</p>
                </div>
            </div>

            {!requestLoading && request && !requestBlockHidden && (
                <div className={styles.requestStatusCard}>
                    <div className={styles.requestStatusContent}>
                        <strong>Заявка на авторство: {REQUEST_STATUS_LABEL[request.status] || request.status}</strong>
                        {request.adminComment && <p>Комментарий администратора: {request.adminComment}</p>}
                    </div>
                    <button type="button" className={styles.requestHideBtn} onClick={hideRequestBlock}>Скрыть</button>
                </div>
            )}

            <div className={styles.filtersRow}>
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
                {isAuthor ? (
                    <Link to="/author/learning" className={styles.authorBtn}>
                        Мой кабинет автора
                    </Link>
                ) : (
                    <button
                        type="button"
                        className={styles.authorBtn}
                        onClick={() => setIsRequestFormOpen((prev) => !prev)}
                        disabled={request?.status === 'pending'}
                    >
                        {request?.status === 'pending' ? 'Заявка на рассмотрении' : 'Подать заявку на авторство'}
                    </button>
                )}
            </div>

            {!isAuthor && isRequestFormOpen && (
                <form className={styles.authorRequestForm} onSubmit={submitAuthorRequest}>
                    <h3>Заявка на роль автора</h3>
                    <label>
                        Почта для связи
                        <input
                            type="email"
                            value={requestForm.contactEmail}
                            onChange={(e) => setRequestForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                            placeholder="name@example.com"
                        />
                    </label>
                    <div className={styles.authorRequestGrid}>
                        <label>
                            Образование
                            <select
                                value={requestForm.educationLevel}
                                onChange={(e) => setRequestForm((prev) => ({ ...prev, educationLevel: e.target.value }))}
                            >
                                {EDUCATION_OPTIONS.map((item) => (
                                    <option key={item.value} value={item.value}>{item.label}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Уровень владения татарским языком
                            <select
                                value={requestForm.tatarLevel}
                                onChange={(e) => setRequestForm((prev) => ({ ...prev, tatarLevel: e.target.value }))}
                            >
                                {TATAR_LEVEL_OPTIONS.map((item) => (
                                    <option key={item.value} value={item.value}>{item.label}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <label>
                        Уровень преподавания
                        <select
                            value={requestForm.teachingLevel}
                            onChange={(e) => setRequestForm((prev) => ({ ...prev, teachingLevel: e.target.value }))}
                        >
                            {TEACHING_LEVEL_OPTIONS.map((item) => (
                                <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span className={styles.optionalLabel}>
                            Уточнение по образованию
                            <span
                                className={styles.optionalStar}
                                title="Поле необязательно к заполнению"
                                aria-label="Поле необязательно"
                            >
                                *
                            </span>
                        </span>
                        <textarea
                            value={requestForm.educationDetails}
                            onChange={(e) => setRequestForm((prev) => ({ ...prev, educationDetails: e.target.value }))}
                            placeholder="Например, профиль, вуз, сертификаты"
                        />
                    </label>
                    <label>
                        Почему именно вы должны получить роль автора
                        <textarea
                            required
                            minLength={20}
                            value={requestForm.motivation}
                            onChange={(e) => setRequestForm((prev) => ({ ...prev, motivation: e.target.value }))}
                            placeholder="Опишите ваш опыт и мотивацию"
                        />
                    </label>
                    <div className={styles.authorRequestActions}>
                        <button type="submit">Отправить заявку</button>
                        <button type="button" onClick={() => setIsRequestFormOpen(false)}>Отмена</button>
                    </div>
                </form>
            )}

            {visibleCategories.length === 0 && <p className={styles.empty}>Пока нет опубликованных материалов</p>}

            {visibleCategories.map((category) => (
                <section key={category._id} className={styles.category}>
                    <h2 className={styles.categoryTitle}>{category.name}</h2>
                    <div key={`${category._id}-${completionFilter}`} className={styles.courseGrid}>
                        {(category.courses || []).map((course, index) => {
                            const completedTopics = Math.max(0, Number(course.progress?.completedTopics) || 0);
                            const totalTopics = Math.max(0, Number(course.progress?.totalTopics) || 0);
                            const progressPercent = totalTopics > 0
                                ? Math.min(100, Math.round((completedTopics / totalTopics) * 100))
                                : 0;

                            return (
                                <article
                                    key={course._id}
                                    className={`${styles.courseCard} ${styles.courseCardAnimated} ${course.progress?.completed ? styles.courseCardCompleted : ''}`}
                                    style={{ animationDelay: `${Math.min(index, 14) * 0.045}s` }}
                                >
                                    <div className={styles.courseMain}>
                                        <h3 className={styles.courseTitle}>{course.title}</h3>
                                        <p className={styles.courseDescription}>{course.description || 'Описание пока не добавлено'}</p>
                                        <div className={styles.courseFooter}>
                                            <div className={styles.progressWrap} aria-label={`Пройдено тем: ${completedTopics}/${totalTopics}`}>
                                                <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
                                                <span
                                                    className={styles.progressText}
                                                    style={{ color: progressPercent < 45 ? 'var(--color-text)' : 'var(--c-black)' }}
                                                >
                                                    Пройдено тем: {completedTopics}/{totalTopics}
                                                </span>
                                            </div>
                                            <Link to={`/courses/${course._id}`} className={styles.btn}>
                                                {course.progress?.completed
                                                    ? 'Открыть'
                                                    : completedTopics > 0
                                                        ? 'Продолжить'
                                                        : 'Начать'}
                                            </Link>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
};

export default CoursesPage;
