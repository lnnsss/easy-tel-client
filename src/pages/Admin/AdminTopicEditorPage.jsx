import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import TopicBlocksEditor from '../../components/TopicBlocksEditor/TopicBlocksEditor';
import CourseService from '../../services/CourseService';
import { useStores } from '../../stores/StoreContext';
import { getTopicBlockValidationErrors, getTopicBlocksForEditor } from '../../utils/topicContent';
import styles from './AdminLearningCoursePage.module.css';

const emptyTopic = {
    title: '',
    content: '',
    contentBlocks: [],
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

const AdminTopicEditorPage = () => {
    const { uiStore } = useStores();
    const navigate = useNavigate();
    const { courseId, topicId } = useParams();
    const isEditMode = Boolean(topicId);

    const [course, setCourse] = useState(null);
    const [topics, setTopics] = useState([]);
    const [form, setForm] = useState(emptyTopic);
    const [blockErrors, setBlockErrors] = useState([]);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [quizSaving, setQuizSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [quizForm, setQuizForm] = useState({ passingScore: 100, questions: [createQuestion()] });
    const [activeTab, setActiveTab] = useState('content');
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

    const currentTopic = useMemo(
        () => topics.find((topic) => String(topic._id) === String(topicId)) || null,
        [topicId, topics]
    );

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError('');
                const [coursesRes, topicsRes] = await Promise.all([
                    CourseService.getAdminCourses(),
                    CourseService.getAdminTopics(courseId)
                ]);

                const selectedCourse = (coursesRes.data || []).find((item) => item._id === courseId) || null;
                setCourse(selectedCourse);
                setTopics(topicsRes.data || []);
            } catch (err) {
                setError(err.response?.data?.message || 'Ошибка загрузки темы');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [courseId]);

    useEffect(() => {
        const loadQuiz = async () => {
            if (!isEditMode || !topicId) return;
            try {
                const { data } = await CourseService.getAdminTopicQuiz(topicId);
                if (data?.questions?.length) {
                    setQuizForm({
                        passingScore: Number(data.passingScore) || 100,
                        questions: data.questions
                    });
                } else {
                    setQuizForm({ passingScore: 100, questions: [createQuestion()] });
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Ошибка загрузки теста');
            }
        };

        if (!isEditMode) {
            setForm(emptyTopic);
            setBlockErrors([]);
            setQuizForm({ passingScore: 100, questions: [createQuestion()] });
            setActiveTab('content');
            setActiveQuestionIndex(-1);
            return;
        }

        if (!currentTopic) return;

        setForm({
            title: currentTopic.title || '',
            content: currentTopic.content || '',
            contentBlocks: getTopicBlocksForEditor(currentTopic),
            status: currentTopic.status || 'published',
            order: Number(currentTopic.order) || 0
        });
        setBlockErrors([]);
        setActiveQuestionIndex(0);
        loadQuiz();
    }, [currentTopic, isEditMode, topicId]);

    const uploadTopicImage = async (file) => {
        try {
            const { data } = await CourseService.uploadAdminTopicImage(file);
            if (!data?.url) {
                throw new Error('Сервер не вернул URL изображения');
            }
            return data.url;
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Ошибка загрузки изображения';
            setError(message);
            throw new Error(message);
        }
    };

    const submitTopicRequest = async () => {
        if (!String(form.title || '').trim()) {
            setError('Укажите название темы');
            return;
        }
        const errors = getTopicBlockValidationErrors(form.contentBlocks || []);
        if (errors.some(Boolean)) {
            setBlockErrors(errors);
            setError('Заполните обязательные поля темы');
            return;
        }

        const payload = {
            courseId,
            title: form.title,
            contentBlocks: form.contentBlocks,
            status: form.status,
            order: form.order
        };

        try {
            setSaving(true);
            if (isEditMode && topicId) {
                await CourseService.updateAdminTopic(topicId, payload);
                uiStore.closeModal();
            } else {
                const { data } = await CourseService.createAdminTopic(payload);
                uiStore.closeModal();
                navigate(`/admin/learning/courses/${courseId}/topics/${data?._id || ''}/edit`);
                return;
            }
            await CourseService.getAdminTopics(courseId);
            navigate(`/admin/learning/courses/${courseId}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка сохранения темы');
        } finally {
            setSaving(false);
        }
    };

    const submitTopic = (event) => {
        event.preventDefault();
        uiStore.showModal({
            title: isEditMode ? 'Сохранить тему?' : 'Создать тему?',
            message: isEditMode ? 'Изменения темы будут сохранены.' : 'Новая тема будет создана.',
            variant: 'info',
            primaryLabel: isEditMode ? 'Сохранить' : 'Создать',
            secondaryLabel: 'Отмена',
            onPrimary: submitTopicRequest,
            onSecondary: () => uiStore.closeModal()
        });
    };

    const saveQuizRequest = async () => {
        if (!topicId) return;
        try {
            setQuizSaving(true);
            await CourseService.upsertAdminTopicQuiz(topicId, quizForm);
            uiStore.closeModal();
            uiStore.showModal({
                title: 'Тест сохранен',
                message: 'Тест темы успешно сохранен.',
                variant: 'success',
                secondaryLabel: 'Закрыть'
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Ошибка сохранения теста');
        } finally {
            setQuizSaving(false);
        }
    };

    const saveQuiz = (event) => {
        event.preventDefault();
        uiStore.showModal({
            title: 'Сохранить тест?',
            message: 'Изменения теста будут применены к этой теме.',
            variant: 'info',
            primaryLabel: 'Сохранить',
            secondaryLabel: 'Отмена',
            onPrimary: saveQuizRequest,
            onSecondary: () => uiStore.closeModal()
        });
    };

    const cancelEditor = () => {
        uiStore.showModal({
            title: 'Выйти без сохранения?',
            message: 'Несохраненные изменения будут потеряны.',
            variant: 'info',
            primaryLabel: 'Выйти',
            secondaryLabel: 'Остаться',
            onPrimary: () => {
                uiStore.closeModal();
                navigate(`/admin/learning/courses/${courseId}`);
            },
            onSecondary: () => uiStore.closeModal()
        });
    };

    if (loading) {
        return <div className={`${styles.page} app-page-shell`}><p>Загрузка...</p></div>;
    }

    return (
        <div className={`${styles.page} app-page-shell`}>
            <div className="app-page-top">
                <div>
                    <Link to={`/admin/learning/courses/${courseId}`} className={styles.back}>← К курсу</Link>
                    <h1 className="app-page-title">{isEditMode ? 'Редактирование темы' : 'Новая тема'}</h1>
                    {course?.title ? <p className="app-page-subtitle">{course.title}</p> : null}
                </div>
            </div>

            {error ? <p className={styles.error}>{error}</p> : null}

            <section className={styles.card}>
                <h3>Параметры темы</h3>
                <label className={styles.fieldGroup}>
                    <span>Название темы</span>
                    <input
                        value={form.title}
                        onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Название темы"
                        required
                    />
                </label>
                <div className={styles.inlineFields}>
                    <select
                        value={form.status}
                        onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                    >
                        <option value="published">Опубликован</option>
                        <option value="draft">Черновик</option>
                    </select>
                    <input
                        type="number"
                        value={form.order}
                        onChange={(e) => setForm((prev) => ({ ...prev, order: e.target.value }))}
                        placeholder="Порядок"
                    />
                </div>
            </section>

            <section className={styles.card}>
                <div className={styles.editorTabs}>
                    <button
                        type="button"
                        className={`${styles.tabBtn} ${activeTab === 'content' ? styles.tabBtnActive : ''}`}
                        onClick={() => setActiveTab('content')}
                    >
                        Содержание темы
                    </button>
                    <button
                        type="button"
                        className={`${styles.tabBtn} ${activeTab === 'quiz' ? styles.tabBtnActive : ''}`}
                        onClick={() => setActiveTab('quiz')}
                        disabled={!isEditMode}
                    >
                        Тест темы
                    </button>
                </div>
            </section>

            {activeTab !== 'content' ? null : (
                <form className={styles.card} onSubmit={submitTopic}>
                    <h3>Содержание</h3>

                <TopicBlocksEditor
                    value={form.contentBlocks}
                    onChange={(contentBlocks) => {
                        setForm((prev) => ({ ...prev, contentBlocks }));
                        if (blockErrors.some(Boolean)) {
                            setBlockErrors(getTopicBlockValidationErrors(contentBlocks));
                        }
                    }}
                    onUploadImage={uploadTopicImage}
                    onUploadError={(message) => {
                        const safeMessage = String(message || '').trim() || 'Ошибка загрузки изображения';
                        setError(safeMessage);
                        uiStore.showModal({
                            title: 'Проблема с изображением',
                            message: safeMessage,
                            variant: 'warning',
                            secondaryLabel: 'Понятно'
                        });
                    }}
                    validationErrors={blockErrors}
                />

                <div className={styles.equalActions}>
                    <button type="submit" className={styles.successBtn} disabled={saving}>{saving ? 'Сохраняем...' : (isEditMode ? 'Сохранить тему' : 'Создать тему')}</button>
                    <button type="button" className={styles.ghostBtn} onClick={cancelEditor}>Отмена</button>
                </div>
                </form>
            )}

            {isEditMode && activeTab === 'quiz' && (
                <form className={styles.card} onSubmit={saveQuiz}>
                    <h3>Тест</h3>
                    <div className={styles.passScoreRow}>
                        <label htmlFor="passingScore">Проходной балл (%)</label>
                        <input
                            id="passingScore"
                            type="number"
                            min="1"
                            max="100"
                            value={quizForm.passingScore}
                            onChange={(e) => setQuizForm((prev) => ({ ...prev, passingScore: Number(e.target.value) || 100 }))}
                        />
                    </div>
                    {(quizForm.questions || []).map((question, qIndex) => (
                        <div
                            key={`q-${qIndex}`}
                            className={`${styles.questionCard} ${activeQuestionIndex !== qIndex ? styles.questionCardCollapsed : ''}`}
                        >
                            <button
                                type="button"
                                className={styles.questionHeaderBtn}
                                onClick={() => setActiveQuestionIndex((prev) => (prev === qIndex ? -1 : qIndex))}
                            >
                                {`Задание ${qIndex + 1}`}
                            </button>
                            <div className={`${styles.questionContent} ${activeQuestionIndex === qIndex ? styles.questionContentOpen : ''}`}>
                                <div className={styles.questionContentInner}>
                                    <label className={styles.questionLabel}>Вопрос</label>
                                    <input
                                        value={question.title}
                                        onChange={(e) => setQuizForm((prev) => ({
                                            ...prev,
                                            questions: prev.questions.map((item, i) => i === qIndex ? { ...item, title: e.target.value } : item)
                                        }))}
                                        placeholder={`Текст вопроса`}
                                        required
                                    />
                                    <select
                                        value={question.type}
                                        onChange={(e) => setQuizForm((prev) => {
                                            const nextType = e.target.value;
                                            return {
                                                ...prev,
                                                questions: prev.questions.map((item, i) => {
                                                    if (i !== qIndex) return item;
                                                    if (nextType === 'single_choice') {
                                                        return { ...item, type: nextType, options: createQuestion().options, correctText: '' };
                                                    }
                                                    return { ...item, type: nextType, options: [], correctText: '' };
                                                })
                                            };
                                        })}
                                    >
                                        <option value="single_choice">Один вариант</option>
                                        <option value="text_input">Текстовый ответ</option>
                                    </select>

                                    {question.type === 'single_choice' ? (
                                        <div className={styles.optionsGrid}>
                                            {(question.options || []).map((option, optionIndex) => (
                                                <div key={`opt-${qIndex}-${optionIndex}`} className={styles.optionRow}>
                                                    <input
                                                        value={option.text}
                                                        onChange={(e) => setQuizForm((prev) => ({
                                                            ...prev,
                                                            questions: prev.questions.map((item, i) => {
                                                                if (i !== qIndex) return item;
                                                                return {
                                                                    ...item,
                                                                    options: item.options.map((opt, oi) => oi === optionIndex ? { ...opt, text: e.target.value } : opt)
                                                                };
                                                            })
                                                        }))}
                                                        placeholder={`Вариант ${optionIndex + 1}`}
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        className={`${styles.correctMarker} ${option.isCorrect ? styles.correctMarkerActive : ''}`}
                                                        onClick={() => setQuizForm((prev) => ({
                                                            ...prev,
                                                            questions: prev.questions.map((item, i) => {
                                                                if (i !== qIndex) return item;
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
                                    ) : (
                                        <input
                                            value={question.correctText || ''}
                                            onChange={(e) => setQuizForm((prev) => ({
                                                ...prev,
                                                questions: prev.questions.map((item, i) => i === qIndex ? { ...item, correctText: e.target.value } : item)
                                            }))}
                                            placeholder="Правильный ответ"
                                            required
                                        />
                                    )}

                                    <button
                                        type="button"
                                        className={styles.ghostBtn}
                                        onClick={() => setQuizForm((prev) => {
                                            const nextQuestions = prev.questions.length <= 1
                                                ? prev.questions
                                                : prev.questions.filter((_, i) => i !== qIndex);
                                            setActiveQuestionIndex(Math.max(-1, Math.min(nextQuestions.length - 1, qIndex - 1)));
                                            return { ...prev, questions: nextQuestions };
                                        })}
                                        disabled={(quizForm.questions || []).length <= 1}
                                    >
                                        Удалить вопрос
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className={styles.equalActions}>
                        <button
                            type="button"
                            className={styles.ghostBtn}
                            onClick={() => setQuizForm((prev) => {
                                const nextQuestions = [...prev.questions, createQuestion()];
                                setActiveQuestionIndex(nextQuestions.length - 1);
                                return { ...prev, questions: nextQuestions };
                            })}
                        >
                            Добавить вопрос
                        </button>
                        <button type="submit" className={styles.successBtn} disabled={quizSaving}>
                            {quizSaving ? 'Сохраняем...' : 'Сохранить тест'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default AdminTopicEditorPage;
