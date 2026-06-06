import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TopicBlocksEditor from '../../components/TopicBlocksEditor/TopicBlocksEditor';
import CourseService from '../../services/CourseService';
import { useStores } from '../../stores/StoreContext';
import { getTopicBlockValidationErrors, getTopicBlocksForEditor } from '../../utils/topicContent';
import styles from '../Admin/AdminLearningCoursePage.module.css';

const emptyTopic = {
    title: '',
    content: '',
    contentBlocks: [],
    status: 'draft',
    order: ''
};

// Создает сущность и возвращает результат клиенту.
const createQuestion = () => ({
    title: '',
    type: 'single_choice',
    points: 1,
    options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
    ],
    correctText: ''
});

// Рисует иконку удаления для опасных действий.
const TrashIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 7H20" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M9 3H15" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M7 7L8 20C8.06 20.67 8.62 21.18 9.29 21.18H14.71C15.38 21.18 15.94 20.67 16 20L17 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M10 11V17" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M14 11V17" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
);

// Отрисовывает экран или компонент AuthorTopicEditorPage и связывает его с данными приложения.
const AuthorTopicEditorPage = () => {
    const { t } = useTranslation();
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

    const editingBlocked = course?.reviewStatus === 'pending_review';

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError('');
                const [coursesRes, topicsRes] = await Promise.all([
                    CourseService.getAuthorCourses(),
                    CourseService.getAuthorTopics(courseId)
                ]);

                const selectedCourse = (coursesRes.data || []).find((item) => item._id === courseId) || null;
                setCourse(selectedCourse);
                setTopics(topicsRes.data || []);
            } catch (err) {
                setError(err.response?.data?.message || t('pages.admin.topic_editor.load_topic_error'));
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
                const { data } = await CourseService.getAuthorTopicQuiz(topicId);
                if (data?.questions?.length) {
                    setQuizForm({
                        passingScore: Number(data.passingScore) || 100,
                        questions: data.questions
                    });
                } else {
                    setQuizForm({ passingScore: 100, questions: [createQuestion()] });
                }
            } catch (err) {
                setError(err.response?.data?.message || t('pages.admin.topic_editor.load_quiz_error'));
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
            status: currentTopic.status || 'draft',
            order: Number(currentTopic.order) || 0
        });
        setBlockErrors([]);
        setActiveQuestionIndex(0);
        loadQuiz();
    }, [currentTopic, isEditMode, topicId]);

    // Принимает загруженный файл и возвращает информацию для дальнейшей работы.
    const uploadTopicImage = async (file) => {
        try {
            const { data } = await CourseService.uploadAuthorTopicImage(courseId, file);
            if (!data?.url) {
                throw new Error(t('pages.admin.topic_editor.server_image_url_error'));
            }
            return data.url;
        } catch (err) {
            const message = err.response?.data?.message || err.message || t('pages.admin.topic_editor.upload_image_error');
            setError(message);
            throw new Error(message);
        }
    };

    // Принимает отправленные пользователем данные и фиксирует результат.
    const submitTopicRequest = async () => {
        if (editingBlocked) return;
        if (!String(form.title || '').trim()) {
            setError(t('pages.admin.topic_editor.title_required'));
            return;
        }
        const errors = getTopicBlockValidationErrors(form.contentBlocks || []);
        if (errors.some(Boolean)) {
            setBlockErrors(errors);
            setError(t('pages.admin.topic_editor.required_fields'));
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
                await CourseService.updateAuthorTopic(topicId, payload);
                uiStore.closeModal();
            } else {
                const { data } = await CourseService.createAuthorTopic(payload);
                uiStore.closeModal();
                navigate(`/author/learning/courses/${courseId}/topics/${data?._id || ''}/edit`);
                return;
            }
            navigate(`/author/learning/courses/${courseId}`);
        } catch (err) {
            setError(err.response?.data?.message || t('pages.admin.topic_editor.save_topic_error'));
        } finally {
            setSaving(false);
        }
    };

    // Принимает отправленные пользователем данные и фиксирует результат.
    const submitTopic = (event) => {
        event.preventDefault();
        uiStore.showModal({
            title: isEditMode ? t('pages.admin.topic_editor.save_topic_title') : t('pages.admin.topic_editor.create_topic_title'),
            message: isEditMode ? t('pages.admin.topic_editor.save_topic_message') : t('pages.admin.topic_editor.create_topic_message'),
            variant: 'info',
            primaryLabel: isEditMode ? t('common.actions.save') : t('common.actions.create'),
            secondaryLabel: t('modals.cancel'),
            onPrimary: submitTopicRequest,
            onSecondary: () => uiStore.closeModal()
        });
    };

    // Сохраняет изменения пользователя.
    const saveQuizRequest = async () => {
        if (!topicId || editingBlocked) return;
        try {
            setQuizSaving(true);
            await CourseService.upsertAuthorTopicQuiz(topicId, quizForm);
            uiStore.closeModal();
            navigate(`/author/learning/courses/${courseId}`);
        } catch (err) {
            setError(err.response?.data?.message || t('pages.admin.topic_editor.save_quiz_error'));
        } finally {
            setQuizSaving(false);
        }
    };

    // Сохраняет изменения пользователя.
    const saveQuiz = (event) => {
        event.preventDefault();
        uiStore.showModal({
            title: t('pages.admin.topic_editor.save_quiz_title'),
            message: t('pages.admin.topic_editor.save_quiz_message'),
            variant: 'info',
            primaryLabel: t('common.actions.save'),
            secondaryLabel: t('modals.cancel'),
            onPrimary: saveQuizRequest,
            onSecondary: () => uiStore.closeModal()
        });
    };

    // Показывает подтверждение перед необратимым действием.
    const confirmRemoveQuestion = (qIndex) => {
        if ((quizForm.questions || []).length <= 1 || editingBlocked) return;
        uiStore.showModal({
            title: t('pages.admin.topic_editor.delete_question_title'),
            message: t('pages.admin.topic_editor.delete_question_message'),
            variant: 'warning',
            primaryLabel: t('common.actions.delete'),
            secondaryLabel: t('modals.cancel'),
            onPrimary: () => {
                setQuizForm((prev) => {
                    const nextQuestions = prev.questions.filter((_, i) => i !== qIndex);
                    setActiveQuestionIndex(Math.max(-1, Math.min(nextQuestions.length - 1, qIndex - 1)));
                    return { ...prev, questions: nextQuestions };
                });
                uiStore.closeModal();
            },
            onSecondary: () => uiStore.closeModal()
        });
    };

    const cancelEditor = () => {
        uiStore.showModal({
            title: t('pages.admin.topic_editor.leave_title'),
            message: t('pages.admin.topic_editor.leave_message'),
            variant: 'info',
            primaryLabel: t('common.actions.exit'),
            secondaryLabel: t('pages.admin.topic_editor.stay'),
            onPrimary: () => {
                uiStore.closeModal();
                navigate(`/author/learning/courses/${courseId}`);
            },
            onSecondary: () => uiStore.closeModal()
        });
    };

    if (loading) {
        return <div className={`${styles.page} app-page-shell`}><p>{t('pages.admin.topic_editor.loading')}</p></div>;
    }

    return (
        <div className={`${styles.page} app-page-shell`}>
            <div className="app-page-top">
                <div>
                    <Link to={`/author/learning/courses/${courseId}`} className={styles.back}>{t('pages.admin.topic_editor.back_to_course')}</Link>
                    <h1 className="app-page-title">{isEditMode ? t('pages.author.edit_topic') : t('pages.author.new_topic')}</h1>
                    {course?.title ? <p className="app-page-subtitle">{course.title}</p> : null}
                </div>
            </div>

            {editingBlocked ? (
                <section className={styles.card}>
                    <p>{t('pages.admin.topic_editor.pending_topic_notice')}</p>
                </section>
            ) : null}

            {error ? <p className={styles.error}>{error}</p> : null}

            <section className={styles.card}>
                <h3>{t('pages.admin.topic_editor.topic_params')}</h3>
                <label className={styles.fieldGroup}>
                    <span>{t('pages.admin.topic_editor.topic_title')}</span>
                    <input
                        value={form.title}
                        onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder={t('pages.admin.topic_editor.topic_title_placeholder')}
                        required
                        disabled={editingBlocked}
                    />
                </label>
                <div className={styles.inlineFields}>
                    <select
                        value={form.status}
                        onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                        disabled={editingBlocked}
                    >
                        <option value="published">{t('pages.admin.learning.published')}</option>
                        <option value="draft">{t('pages.admin.learning.draft')}</option>
                    </select>
                    <input
                        type="number"
                        value={form.order}
                        onChange={(e) => setForm((prev) => ({ ...prev, order: e.target.value }))}
                        placeholder={t('pages.admin.topic_editor.order_placeholder')}
                        disabled={editingBlocked}
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
                        {t('pages.admin.topic_editor.content_tab')}
                    </button>
                    <button
                        type="button"
                        className={`${styles.tabBtn} ${activeTab === 'quiz' ? styles.tabBtnActive : ''}`}
                        onClick={() => setActiveTab('quiz')}
                        disabled={!isEditMode}
                    >
                        {t('pages.admin.topic_editor.quiz_tab')}
                    </button>
                </div>
            </section>

            {activeTab !== 'content' ? null : (
                <form className={styles.card} onSubmit={submitTopic}>
                    <h3>{t('pages.admin.topic_editor.content')}</h3>
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
                        const safeMessage = String(message || '').trim() || t('pages.admin.topic_editor.upload_image_error');
                        setError(safeMessage);
                        uiStore.showModal({
                            title: t('pages.admin.topic_editor.image_problem'),
                            message: safeMessage,
                            variant: 'warning',
                            secondaryLabel: t('pages.admin.learning.understood')
                        });
                    }}
                    validationErrors={blockErrors}
                    disabled={editingBlocked}
                />

                <div className={styles.equalActions}>
                    <button type="submit" className={styles.successBtn} disabled={saving || editingBlocked}>{saving ? t('pages.admin.learning.saving') : (isEditMode ? t('common.actions.save_topic') : t('common.actions.create_topic'))}</button>
                    <button type="button" className={styles.ghostBtn} onClick={cancelEditor}>{t('common.actions.cancel')}</button>
                </div>
                </form>
            )}

            {isEditMode && activeTab === 'quiz' && (
                <form className={styles.card} onSubmit={saveQuiz}>
                    <h3>{t('pages.admin.topic_editor.quiz')}</h3>
                    <div className={styles.passScoreRow}>
                        <label htmlFor="passingScore">{t('pages.admin.topic_editor.passing_score')}</label>
                        <input
                            id="passingScore"
                            type="number"
                            min="1"
                            max="100"
                            value={quizForm.passingScore}
                            onChange={(e) => setQuizForm((prev) => ({ ...prev, passingScore: Number(e.target.value) || 100 }))}
                            disabled={editingBlocked}
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
                                {t('pages.admin.topic_editor.question', { count: qIndex + 1 })}
                            </button>
                            <button
                                type="button"
                                className={styles.questionDeleteBtn}
                                onClick={() => confirmRemoveQuestion(qIndex)}
                                disabled={(quizForm.questions || []).length <= 1 || editingBlocked}
                                aria-label={t('pages.admin.topic_editor.delete_question', { count: qIndex + 1 })}
                                title={t('pages.admin.topic_editor.delete_question_title_attr')}
                            >
                                <TrashIcon />
                            </button>
                            <div className={`${styles.questionContent} ${activeQuestionIndex === qIndex ? styles.questionContentOpen : ''}`}>
                                <div className={styles.questionContentInner}>
                                    <label className={styles.questionLabel}>{t('pages.admin.topic_editor.question_label')}</label>
                                    <input
                                        value={question.title}
                                        onChange={(e) => setQuizForm((prev) => ({
                                            ...prev,
                                            questions: prev.questions.map((item, i) => i === qIndex ? { ...item, title: e.target.value } : item)
                                        }))}
                                        placeholder={t('pages.admin.topic_editor.question_placeholder')}
                                        required
                                        disabled={editingBlocked}
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
                                        disabled={editingBlocked}
                                    >
                                        <option value="single_choice">{t('pages.admin.topic_editor.type_single')}</option>
                                        <option value="text_input">{t('pages.admin.topic_editor.type_text')}</option>
                                        <option value="sentence_order">{t('pages.admin.topic_editor.type_sentence')}</option>
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
                                                        placeholder={t('pages.admin.topic_editor.option_placeholder', { count: optionIndex + 1 })}
                                                        required
                                                        disabled={editingBlocked}
                                                    />
                                                    <button
                                                        type="button"
                                                        className={`${styles.correctMarker} ${option.isCorrect ? styles.correctMarkerActive : ''}`}
                                                        disabled={editingBlocked}
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
                                                    <button
                                                        type="button"
                                                        className={styles.correctMarker}
                                                        disabled={(question.options || []).length <= 3 || editingBlocked}
                                                        onClick={() => setQuizForm((prev) => ({
                                                            ...prev,
                                                            questions: prev.questions.map((item, i) => {
                                                                if (i !== qIndex) return item;
                                                                if ((item.options || []).length <= 3) return item;
                                                                const nextOptions = item.options.filter((_, oi) => oi !== optionIndex);
                                                                const hasCorrect = nextOptions.some((opt) => opt.isCorrect);
                                                                return {
                                                                    ...item,
                                                                    options: hasCorrect ? nextOptions : nextOptions.map((opt, oi) => ({ ...opt, isCorrect: oi === 0 }))
                                                                };
                                                            })
                                                        }))}
                                                        title={t('pages.admin.topic_editor.delete_option_title')}
                                                        aria-label={t('pages.admin.topic_editor.delete_option', { count: optionIndex + 1 })}
                                                    >
                                                        <TrashIcon />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                className={styles.ghostBtn}
                                                onClick={() => setQuizForm((prev) => ({
                                                    ...prev,
                                                    questions: prev.questions.map((item, i) => {
                                                        if (i !== qIndex) return item;
                                                        return {
                                                            ...item,
                                                            options: [...(item.options || []), { text: '', isCorrect: false }]
                                                        };
                                                    })
                                                }))}
                                                disabled={editingBlocked}
                                            >
                                                {t('pages.admin.topic_editor.add_option')}
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {question.type === 'sentence_order' ? (
                                                <small className={styles.questionHint}>{t('pages.admin.topic_editor.sentence_hint')}</small>
                                            ) : null}
                                            <input
                                                value={question.correctText || ''}
                                                onChange={(e) => setQuizForm((prev) => ({
                                                    ...prev,
                                                    questions: prev.questions.map((item, i) => i === qIndex ? { ...item, correctText: e.target.value } : item)
                                                }))}
                                                placeholder={question.type === 'sentence_order' ? t('pages.admin.topic_editor.sentence_placeholder') : t('pages.admin.topic_editor.correct_answer')}
                                                required
                                                disabled={editingBlocked}
                                            />
                                        </>
                                    )}

                                </div>
                            </div>
                        </div>
                    ))}

                    <div className={styles.equalActions}>
                        <button
                            type="button"
                            className={styles.ghostBtn}
                            disabled={editingBlocked}
                            onClick={() => setQuizForm((prev) => {
                                const nextQuestions = [...prev.questions, createQuestion()];
                                setActiveQuestionIndex(nextQuestions.length - 1);
                                return { ...prev, questions: nextQuestions };
                            })}
                        >
                            {t('pages.admin.topic_editor.add_question')}
                        </button>
                        <button type="submit" className={styles.successBtn} disabled={quizSaving || editingBlocked}>
                            {quizSaving ? t('pages.admin.learning.saving') : t('pages.admin.topic_editor.save_quiz')}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default AuthorTopicEditorPage;
