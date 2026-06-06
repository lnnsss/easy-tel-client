import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CourseService from '../../services/CourseService';
import { useStores } from '../../stores/StoreContext';
import TopicBlocksRenderer from '../../components/TopicBlocksRenderer/TopicBlocksRenderer';
import styles from './CourseDetailPage.module.css';

// Перемешивает слова для quiz-вопросов без изменения исходного массива.
const shuffleWords = (words = []) => {
    const next = [...words];
    for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
};

// Отрисовывает экран или компонент CourseDetailPage и связывает его с данными приложения.
const CourseDetailPage = () => {
    const { t } = useTranslation();
    const { uiStore, authStore } = useStores();
    const navigate = useNavigate();
    const { courseId } = useParams();
    const [course, setCourse] = useState(null);
    const [topics, setTopics] = useState([]);
    const [selectedTopicId, setSelectedTopicId] = useState('');
    const [topicPayload, setTopicPayload] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [answers, setAnswers] = useState({});
    const [sentenceWordsMap, setSentenceWordsMap] = useState({});
    const [draggingWordMap, setDraggingWordMap] = useState({});
    const [isQuizMode, setIsQuizMode] = useState(false);

    const selectedTopicMeta = useMemo(
        () => topics.find((topic) => topic._id === selectedTopicId) || null,
        [topics, selectedTopicId]
    );

    useEffect(() => {
        const loadCourse = async () => {
            try {
                setLoading(true);
                setError('');
                const { data } = await CourseService.getCourse(courseId);
                setCourse(data.course);
                setTopics(data.topics || []);
                const firstUnlocked = (data.topics || []).find((topic) => topic.isUnlocked);
                setSelectedTopicId(firstUnlocked?._id || '');
            } catch (e) {
                setError(e.response?.data?.message || t('pages.course.load_error'));
            } finally {
                setLoading(false);
            }
        };
        loadCourse();
    }, [courseId]);

    useEffect(() => {
        const loadTopic = async () => {
            if (!selectedTopicId) return;
            try {
                setError('');
                setAnswers({});
                setSentenceWordsMap({});
                setDraggingWordMap({});
                setIsQuizMode(false);
                const { data } = await CourseService.getTopic(courseId, selectedTopicId);
                setTopicPayload(data);
            } catch (e) {
                setTopicPayload(null);
                setError(e.response?.data?.message || t('pages.course.topic_load_error'));
            }
        };
        loadTopic();
    }, [courseId, selectedTopicId]);

    useEffect(() => {
        if (!isQuizMode || !topicPayload?.quiz?.questions?.length) return;

        const nextMap = {};
        for (const question of topicPayload.quiz.questions) {
            if (question.type !== 'sentence_order') continue;
            const words = String(question.sentenceText || '').trim().split(/\s+/).filter(Boolean);
            nextMap[question._id] = shuffleWords(words);
        }
        setSentenceWordsMap(nextMap);
        setDraggingWordMap({});
    }, [isQuizMode, topicPayload]);

    // Принимает отправленные пользователем данные и фиксирует результат.
    const submitQuiz = async (e) => {
        e.preventDefault();
        if (!topicPayload?.quiz?.questions?.length) return;
        try {
            setSubmitting(true);
            const payload = topicPayload.quiz.questions.map((question) => {
                const sentenceAnswer = question.type === 'sentence_order'
                    ? (sentenceWordsMap[question._id] || []).join(' ')
                    : '';
                return {
                    questionId: question._id,
                    selectedOptionIndex: answers[question._id]?.selectedOptionIndex,
                    answerText: question.type === 'sentence_order' ? sentenceAnswer : (answers[question._id]?.answerText || '')
                };
            });
            const { data } = await CourseService.submitTopicQuiz(courseId, selectedTopicId, payload);
            const refreshed = await CourseService.getCourse(courseId);
            const refreshedTopics = refreshed.data.topics || [];
            setTopics(refreshedTopics);

            if (!data.passed) {
                setAnswers({});
                uiStore.showModal({
                    title: t('pages.course.modals.quiz_failed_title'),
                    message: t('pages.course.modals.quiz_failed_message', {
                        score: data.scorePercent,
                        passing: data.passingScore
                    }),
                    variant: 'error',
                    secondaryLabel: t('pages.course.modals.retry')
                });
                return;
            }

            const currentIndex = refreshedTopics.findIndex((topic) => topic._id === selectedTopicId);
            const nextUnlocked = refreshedTopics.slice(currentIndex + 1).find((topic) => topic.isUnlocked && !topic.isCompleted);

            setAnswers({});
            setIsQuizMode(false);
            await authStore.refreshProfile();

            if (nextUnlocked) {
                setSelectedTopicId(nextUnlocked._id);
                uiStore.showModal({
                    title: t('pages.course.modals.quiz_done_title'),
                    message: t('pages.course.modals.quiz_done_next_message', { score: data.scorePercent }),
                    variant: 'success',
                    secondaryLabel: t('pages.course.modals.continue')
                });
                return;
            }

            const allCompleted = refreshedTopics.length > 0 && refreshedTopics.every((topic) => topic.isCompleted);
            if (allCompleted) {
                uiStore.showModal({
                    title: t('pages.course.modals.course_done_title'),
                    message: t('pages.course.modals.course_done_message', { score: data.scorePercent }),
                    variant: 'success',
                    secondaryLabel: t('pages.course.modals.to_profile'),
                    onSecondary: () => {
                        uiStore.closeModal();
                        navigate('/profile');
                    }
                });
                setTimeout(() => {
                    uiStore.closeModal();
                    navigate('/profile');
                }, 1200);
                return;
            }

            uiStore.showModal({
                title: t('pages.course.modals.quiz_done_title'),
                message: t('pages.course.modals.result_message', { score: data.scorePercent }),
                variant: 'success',
                secondaryLabel: t('common.close')
            });
        } catch (e) {
            setError(e.response?.data?.message || t('pages.course.submit_error'));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className={styles.state}>{t('pages.course.loading')}</div>;
    if (error && !course) return <div className={styles.stateError}>{error}</div>;
    if (!course) return <div className={styles.stateError}>{t('pages.course.not_found')}</div>;

    return (
        <div className={`${styles.page} app-page-shell`}>
            <div className="app-page-top">
                <div>
                    <Link to="/courses" className={styles.back}>{t('pages.course.back_to_materials')}</Link>
                    <h1 className="app-page-title">{course.title}</h1>
                    <p className="app-page-subtitle">{course.description}</p>
                </div>
            </div>

            <div className={styles.layout}>
                <aside className={styles.sidebar}>
                    <h3>{t('pages.course.topics')}</h3>
                    {(topics || []).map((topic) => (
                        <button
                            key={topic._id}
                            type="button"
                            className={`${styles.topicBtn} ${selectedTopicId === topic._id ? styles.topicBtnActive : ''}`}
                            disabled={!topic.isUnlocked}
                            onClick={() => setSelectedTopicId(topic._id)}
                        >
                            <span>{topic.title}</span>
                            <span>
                                {topic.isCompleted ? '✓' : topic.isUnlocked ? t('pages.course.open') : t('pages.course.locked')}
                            </span>
                        </button>
                    ))}
                </aside>

                <main className={styles.content}>
                    {error && <p className={styles.inlineError}>{error}</p>}
                    {!topicPayload && <p>{t('pages.course.select_topic')}</p>}

                    {topicPayload && (
                        <>
                            {!isQuizMode && (
                                <article className={styles.topicBlock}>
                                    <h2>{topicPayload.topic.title}</h2>
                                    <TopicBlocksRenderer topic={topicPayload.topic} />
                                    <div className={styles.topicActions}>
                                        {topicPayload?.quiz ? (
                                            <button
                                                type="button"
                                                className={styles.primaryBtn}
                                                onClick={() => {
                                                    setIsQuizMode(true);
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                            >
                                                {t('pages.course.go_to_quiz')}
                                            </button>
                                        ) : null}
                                    </div>
                                </article>
                            )}

                            {isQuizMode && topicPayload?.quiz && (
                                <>
                                    <form className={styles.quiz} onSubmit={submitQuiz}>
                                        <h3 className={styles.quizTitle}>{t('pages.course.quiz')}</h3>
                                        {(topicPayload.quiz.questions || []).map((question, index) => (
                                            <div key={question._id} className={styles.question}>
                                                <p>{index + 1}. {question.title}</p>
                                                {question.type === 'single_choice' ? (
                                                    <div className={styles.options}>
                                                        {(question.options || []).map((option, optionIndex) => (
                                                            <label
                                                                key={`${question._id}-${optionIndex}`}
                                                                className={`${styles.optionCard} ${answers[question._id]?.selectedOptionIndex === optionIndex ? styles.optionCardActive : ''}`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name={`q-${question._id}`}
                                                                    checked={answers[question._id]?.selectedOptionIndex === optionIndex}
                                                                    onChange={() => setAnswers((prev) => ({
                                                                        ...prev,
                                                                        [question._id]: { selectedOptionIndex: optionIndex, answerText: '' }
                                                                    }))}
                                                                />
                                                                <span>{option.text}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : question.type === 'sentence_order' ? (
                                                    <div className={styles.sentenceBuilder}>
                                                        <small>{t('pages.course.sentence_hint')}</small>
                                                        <div className={styles.sentenceWords}>
                                                            {(sentenceWordsMap[question._id] || []).map((word, wordIndex) => (
                                                                <button
                                                                    key={`${question._id}-${wordIndex}-${word}`}
                                                                    type="button"
                                                                    className={styles.wordChip}
                                                                    draggable
                                                                    onDragStart={() => {
                                                                        setDraggingWordMap((prev) => ({ ...prev, [question._id]: wordIndex }));
                                                                    }}
                                                                    onDragOver={(event) => event.preventDefault()}
                                                                    onDrop={() => {
                                                                        const dragIndex = draggingWordMap[question._id];
                                                                        if (!Number.isInteger(dragIndex) || dragIndex === wordIndex) return;
                                                                        setSentenceWordsMap((prev) => {
                                                                            const source = [...(prev[question._id] || [])];
                                                                            const [moved] = source.splice(dragIndex, 1);
                                                                            source.splice(wordIndex, 0, moved);
                                                                            return { ...prev, [question._id]: source };
                                                                        });
                                                                    }}
                                                                    onDragEnd={() => {
                                                                        setDraggingWordMap((prev) => ({ ...prev, [question._id]: null }));
                                                                    }}
                                                                >
                                                                    {word}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className={styles.resetWordOrder}
                                                            onClick={() => {
                                                                const baseWords = String(question.sentenceText || '').trim().split(/\s+/).filter(Boolean);
                                                                setSentenceWordsMap((prev) => ({ ...prev, [question._id]: shuffleWords(baseWords) }));
                                                            }}
                                                        >
                                                            {t('pages.course.reset_order')}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={answers[question._id]?.answerText || ''}
                                                        onChange={(e) => setAnswers((prev) => ({
                                                            ...prev,
                                                            [question._id]: { selectedOptionIndex: null, answerText: e.target.value }
                                                        }))}
                                                        placeholder={t('pages.course.answer_placeholder')}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                        <div className={styles.topicActions}>
                                            <button type="submit" className={styles.primaryBtn} disabled={submitting || !selectedTopicMeta?.isUnlocked}>
                                                {submitting ? t('common.actions.checking') : t('common.actions.finish_test')}
                                            </button>
                                            <button type="button" className={styles.secondaryBtn} onClick={() => setIsQuizMode(false)}>
                                                {t('pages.course.back_to_topic')}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            )}

                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default CourseDetailPage;
