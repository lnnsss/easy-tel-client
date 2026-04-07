import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CourseService from '../../services/CourseService';
import { useStores } from '../../stores/StoreContext';
import styles from './AdminLearningCoursePage.module.css';

const emptyTopic = {
    courseId: '',
    title: '',
    content: '',
    status: 'published',
    order: ''
};

const createQuestion = () => ({
    title: '',
    type: 'single_choice',
    points: 1,
    options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
    ],
    correctText: ''
});

const statusLabel = (value) => (value === 'published' ? 'Опубликован' : 'Черновик');
const questionTypeLabel = (value) => (value === 'single_choice' ? 'Один вариант' : 'Текстовый ответ');

const AdminLearningCoursePage = () => {
    const { uiStore } = useStores();
    const { courseId } = useParams();
    const [categories, setCategories] = useState([]);
    const [course, setCourse] = useState(null);
    const [topics, setTopics] = useState([]);
    const [error, setError] = useState('');

    const [topicForm, setTopicForm] = useState({ ...emptyTopic, courseId });
    const [editingTopicId, setEditingTopicId] = useState('');
    const [topicEditForm, setTopicEditForm] = useState({
        title: '',
        content: '',
        status: 'published',
        order: 0
    });

    const [quizTopicId, setQuizTopicId] = useState('');
    const [quizForm, setQuizForm] = useState({
        topicId: '',
        passingScore: 100,
        questions: [createQuestion()]
    });
    const [expandedQuestionIndex, setExpandedQuestionIndex] = useState(0);
    const [courseCategoryId, setCourseCategoryId] = useState('');

    const selectedTopic = useMemo(
        () => topics.find((topic) => topic._id === quizTopicId) || null,
        [topics, quizTopicId]
    );

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
            setCourseCategoryId(String(currentCourse?.categoryId?._id || currentCourse?.categoryId || ''));
        } catch (e) {
            setError(e.response?.data?.message || 'Ошибка загрузки курса');
        }
    };

    useEffect(() => {
        loadData();
    }, [courseId]);

    const createTopic = async (e) => {
        e.preventDefault();
        try {
            await CourseService.createAdminTopic(topicForm);
            setTopicForm({ ...emptyTopic, courseId });
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка создания темы');
        }
    };

    const startEditTopic = (topic) => {
        setEditingTopicId(topic._id);
        setTopicEditForm({
            title: topic.title || '',
            content: topic.content || '',
            status: topic.status || 'published',
            order: Number(topic.order) || 0
        });
    };

    const saveEditTopic = async (e) => {
        e.preventDefault();
        if (!editingTopicId) return;
        try {
            await CourseService.updateAdminTopic(editingTopicId, topicEditForm);
            setEditingTopicId('');
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка обновления темы');
        }
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
                    if (quizTopicId === topicId) {
                        setQuizTopicId('');
                        setQuizForm({ topicId: '', passingScore: 100, questions: [createQuestion()] });
                        setExpandedQuestionIndex(0);
                    }
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
        try {
            await CourseService.updateAdminTopic(topic._id, {
                status: topic.status === 'published' ? 'draft' : 'published'
            });
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка обновления темы');
        }
    };

    const loadTopicQuiz = async (topicId) => {
        if (!topicId) {
            setQuizTopicId('');
            setQuizForm({ topicId: '', passingScore: 100, questions: [createQuestion()] });
            setExpandedQuestionIndex(0);
            return;
        }
        try {
            setQuizTopicId(topicId);
            const { data } = await CourseService.getAdminTopicQuiz(topicId);
            if (data?.questions?.length) {
                setQuizForm({
                    topicId,
                    passingScore: Number(data.passingScore) || 100,
                    questions: data.questions
                });
                setExpandedQuestionIndex(0);
            } else {
                setQuizForm({
                    topicId,
                    passingScore: 100,
                    questions: [createQuestion()]
                });
                setExpandedQuestionIndex(0);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка загрузки теста');
        }
    };

    const addQuestion = () => {
        setQuizForm((prev) => ({
            ...prev,
            questions: [...prev.questions, createQuestion()]
        }));
        setExpandedQuestionIndex(quizForm.questions.length);
    };

    const deleteQuestion = (questionIndex) => {
        if ((quizForm.questions || []).length <= 1) return;
        setQuizForm((prev) => {
            const nextQuestions = prev.questions.filter((_, i) => i !== questionIndex);
            return { ...prev, questions: nextQuestions };
        });
        if (expandedQuestionIndex === questionIndex) {
            setExpandedQuestionIndex(Math.max(0, questionIndex - 1));
        } else if (expandedQuestionIndex > questionIndex) {
            setExpandedQuestionIndex((prev) => prev - 1);
        }
    };

    const saveQuiz = async (e) => {
        e.preventDefault();
        if (!quizForm.topicId) {
            uiStore.showModal({
                title: 'Тема не выбрана',
                message: 'Сначала выберите тему, для которой создается тест.',
                variant: 'info',
                secondaryLabel: 'Понятно'
            });
            return;
        }
        try {
            await CourseService.upsertAdminTopicQuiz(quizForm.topicId, quizForm);
            const currentTopic = quizForm.topicId;
            setQuizForm({ topicId: currentTopic, passingScore: 100, questions: [createQuestion()] });
            setExpandedQuestionIndex(0);
            setQuizTopicId('');
            uiStore.showModal({
                title: 'Тест сохранен',
                message: 'Тест успешно создан и форма сброшена.',
                variant: 'success',
                secondaryLabel: 'Отлично'
            });
            await loadData();
        } catch (err) {
            uiStore.showModal({
                title: 'Ошибка сохранения теста',
                message: err.response?.data?.message || 'Ошибка сохранения теста',
                variant: 'error',
                secondaryLabel: 'Закрыть'
            });
        }
    };

    const saveCourseCategory = async () => {
        if (!courseCategoryId) return;
        try {
            await CourseService.updateAdminCourse(courseId, { categoryId: courseCategoryId });
            uiStore.showModal({
                title: 'Готово',
                message: 'Категория курса обновлена.',
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
        }
    };

    return (
        <div className={styles.page}>
            <Link to="/admin/learning" className={styles.back}>← К курсам</Link>
            <h1>{course?.title || 'Курс'}</h1>
            {course?.description && <p className={styles.subtitle}>{course.description}</p>}
            {error && <p className={styles.error}>{error}</p>}

            <section className={styles.card}>
                <h3>Редактирование курса</h3>
                <div className={styles.inlineFields}>
                    <select
                        value={courseCategoryId}
                        onChange={(e) => setCourseCategoryId(e.target.value)}
                    >
                        <option value="">Выберите категорию</option>
                        {categories.map((category) => (
                            <option key={category._id} value={category._id}>{category.name}</option>
                        ))}
                    </select>
                    <button type="button" onClick={saveCourseCategory}>
                        Сменить категорию
                    </button>
                </div>
            </section>

            <section className={styles.grid}>
                <form className={styles.card} onSubmit={createTopic}>
                    <h3>Добавить тему</h3>
                    <input
                        value={topicForm.title}
                        onChange={(e) => setTopicForm((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Название темы"
                        required
                    />
                    <textarea
                        value={topicForm.content}
                        onChange={(e) => setTopicForm((prev) => ({ ...prev, content: e.target.value }))}
                        placeholder="Контент темы"
                        required
                    />
                    <div className={styles.inlineFields}>
                        <select
                            value={topicForm.status}
                            onChange={(e) => setTopicForm((prev) => ({ ...prev, status: e.target.value }))}
                        >
                            <option value="published">Опубликован</option>
                            <option value="draft">Черновик</option>
                        </select>
                        <input
                            type="number"
                            value={topicForm.order}
                            onChange={(e) => setTopicForm((prev) => ({ ...prev, order: e.target.value }))}
                            placeholder="Порядок"
                        />
                    </div>
                    <button type="submit">Создать тему</button>
                </form>

                <section className={styles.card}>
                    <h3>Темы курса</h3>
                    <div className={styles.topicsList}>
                        {topics.map((topic) => (
                                <div key={topic._id} className={styles.row}>
                                    <div className={styles.rowMain}>
                                        <strong className={styles.topicTitle} title={topic.title}>{topic.title}</strong>
                                        <small>{statusLabel(topic.status)}</small>
                                    </div>
                                <div className={styles.topicActions}>
                                    <button type="button" onClick={() => startEditTopic(topic)}>Редактировать</button>
                                    <button type="button" onClick={() => toggleTopicStatus(topic)}>
                                        {topic.status === 'published' ? 'В черновик' : 'Опубликовать'}
                                    </button>
                                    <button type="button" onClick={() => removeTopic(topic._id)}>Удалить</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {editingTopicId && (
                        <form className={styles.editTopicForm} onSubmit={saveEditTopic}>
                            <h4>Редактирование темы</h4>
                            <input
                                value={topicEditForm.title}
                                onChange={(e) => setTopicEditForm((prev) => ({ ...prev, title: e.target.value }))}
                                placeholder="Название темы"
                                required
                            />
                            <textarea
                                value={topicEditForm.content}
                                onChange={(e) => setTopicEditForm((prev) => ({ ...prev, content: e.target.value }))}
                                placeholder="Контент темы"
                                required
                            />
                            <div className={styles.inlineFields}>
                                <select
                                    value={topicEditForm.status}
                                    onChange={(e) => setTopicEditForm((prev) => ({ ...prev, status: e.target.value }))}
                                >
                                    <option value="published">Опубликован</option>
                                    <option value="draft">Черновик</option>
                                </select>
                                <input
                                    type="number"
                                    value={topicEditForm.order}
                                    onChange={(e) => setTopicEditForm((prev) => ({ ...prev, order: Number(e.target.value) || 0 }))}
                                    placeholder="Порядок"
                                />
                            </div>
                            <div className={styles.actions}>
                                <button type="submit">Сохранить тему</button>
                                <button type="button" onClick={() => setEditingTopicId('')}>Отмена</button>
                            </div>
                        </form>
                    )}
                </section>
            </section>

            <section className={styles.card}>
                <h3>Тест темы</h3>
                <select value={quizTopicId} onChange={(e) => loadTopicQuiz(e.target.value)}>
                    <option value="">Выберите тему</option>
                    {topics.map((topic) => (
                        <option key={topic._id} value={topic._id}>{topic.title}</option>
                    ))}
                </select>

                {quizTopicId && (
                    <form onSubmit={saveQuiz} className={styles.quizForm}>
                        <div className={styles.passScore}>
                            <label htmlFor="passingScore">Проходной балл теста, %</label>
                            <input
                                id="passingScore"
                                type="number"
                                min="1"
                                max="100"
                                value={quizForm.passingScore}
                                onChange={(e) => setQuizForm((prev) => ({ ...prev, passingScore: Number(e.target.value) || 100 }))}
                                placeholder="Например, 100"
                            />
                            <small>Тест считается пройденным при достижении этого процента.</small>
                        </div>

                        {quizForm.questions.map((question, questionIndex) => (
                            <div key={`q-${questionIndex}`} className={styles.question}>
                                <div className={styles.questionHead}>
                                    <strong>Вопрос {questionIndex + 1}</strong>
                                    <div className={styles.actions}>
                                        <button
                                            type="button"
                                            onClick={() => setExpandedQuestionIndex((prev) => prev === questionIndex ? -1 : questionIndex)}
                                        >
                                            {expandedQuestionIndex === questionIndex ? 'Свернуть' : 'Развернуть'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => deleteQuestion(questionIndex)}
                                            disabled={(quizForm.questions || []).length <= 1}
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                </div>

                                {expandedQuestionIndex === questionIndex && (
                                    <>
                                        <input
                                            value={question.title}
                                            onChange={(e) => setQuizForm((prev) => ({
                                                ...prev,
                                                questions: prev.questions.map((item, i) => i === questionIndex ? { ...item, title: e.target.value } : item)
                                            }))}
                                            placeholder="Текст вопроса"
                                            required
                                        />
                                        <div className={styles.typeBlock}>
                                            <label className={styles.fieldLabel}>Тип вопроса</label>
                                            <select
                                                value={question.type}
                                                onChange={(e) => setQuizForm((prev) => ({
                                                    ...prev,
                                                    questions: prev.questions.map((item, i) => i === questionIndex
                                                        ? {
                                                            ...item,
                                                            type: e.target.value,
                                                            options: e.target.value === 'single_choice' ? createQuestion().options : [],
                                                            correctText: ''
                                                        }
                                                        : item)
                                                }))}
                                            >
                                                <option value="single_choice">{questionTypeLabel('single_choice')}</option>
                                                <option value="text_input">{questionTypeLabel('text_input')}</option>
                                            </select>
                                        </div>

                                        {question.type === 'single_choice' ? (
                                            <div className={styles.answerSection}>
                                                <p className={styles.answerLabel}>Варианты ответа</p>
                                                <div className={styles.options}>
                                                    {(question.options || []).map((option, optionIndex) => (
                                                        <div key={`opt-${questionIndex}-${optionIndex}`} className={styles.option}>
                                                            <input
                                                                value={option.text}
                                                                onChange={(e) => setQuizForm((prev) => ({
                                                                    ...prev,
                                                                    questions: prev.questions.map((item, i) => {
                                                                        if (i !== questionIndex) return item;
                                                                        return {
                                                                            ...item,
                                                                            options: item.options.map((opt, oi) => (
                                                                                oi === optionIndex ? { ...opt, text: e.target.value } : opt
                                                                            ))
                                                                        };
                                                                    })
                                                                }))}
                                                                placeholder={`Вариант ${optionIndex + 1}`}
                                                                required
                                                            />
                                                            <button
                                                                type="button"
                                                                className={`${styles.correctMarker} ${option.isCorrect ? styles.correctMarkerActive : ''}`}
                                                                title="Отметить как правильный"
                                                                aria-label={`Отметить вариант ${optionIndex + 1} правильным`}
                                                                onClick={() => setQuizForm((prev) => ({
                                                                    ...prev,
                                                                    questions: prev.questions.map((item, i) => {
                                                                        if (i !== questionIndex) return item;
                                                                        return {
                                                                            ...item,
                                                                            options: item.options.map((opt, oi) => ({ ...opt, isCorrect: oi === optionIndex }))
                                                                        };
                                                                    })
                                                                }))}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={styles.answerSection}>
                                                <p className={styles.answerLabel}>Правильный ответ</p>
                                                <input
                                                    value={question.correctText || ''}
                                                    onChange={(e) => setQuizForm((prev) => ({
                                                        ...prev,
                                                        questions: prev.questions.map((item, i) => i === questionIndex ? { ...item, correctText: e.target.value } : item)
                                                    }))}
                                                    placeholder="Правильный текстовый ответ"
                                                    required
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}

                        <div className={styles.actions}>
                            <button type="button" onClick={addQuestion}>Добавить вопрос</button>
                            <button type="submit">Сохранить тест</button>
                        </div>
                    </form>
                )}

                {quizTopicId && !selectedTopic && <p className={styles.error}>Тема не найдена</p>}
            </section>
        </div>
    );
};

export default AdminLearningCoursePage;
