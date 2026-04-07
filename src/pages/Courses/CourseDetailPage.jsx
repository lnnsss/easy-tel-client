import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CourseService from '../../services/CourseService';
import { useStores } from '../../stores/StoreContext';
import styles from './CourseDetailPage.module.css';

const CourseDetailPage = () => {
    const { uiStore } = useStores();
    const { courseId } = useParams();
    const [course, setCourse] = useState(null);
    const [topics, setTopics] = useState([]);
    const [selectedTopicId, setSelectedTopicId] = useState('');
    const [topicPayload, setTopicPayload] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [answers, setAnswers] = useState({});
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
                setError(e.response?.data?.message || 'Ошибка загрузки курса');
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
                setIsQuizMode(false);
                const { data } = await CourseService.getTopic(courseId, selectedTopicId);
                setTopicPayload(data);
            } catch (e) {
                setTopicPayload(null);
                setError(e.response?.data?.message || 'Ошибка загрузки темы');
            }
        };
        loadTopic();
    }, [courseId, selectedTopicId]);

    const submitQuiz = async (e) => {
        e.preventDefault();
        if (!topicPayload?.quiz?.questions?.length) return;
        try {
            setSubmitting(true);
            const payload = topicPayload.quiz.questions.map((question) => ({
                questionId: question._id,
                selectedOptionIndex: answers[question._id]?.selectedOptionIndex,
                answerText: answers[question._id]?.answerText || ''
            }));
            const { data } = await CourseService.submitTopicQuiz(courseId, selectedTopicId, payload);
            const refreshed = await CourseService.getCourse(courseId);
            const refreshedTopics = refreshed.data.topics || [];
            setTopics(refreshedTopics);

            if (!data.passed) {
                setAnswers({});
                uiStore.showModal({
                    title: 'Тест не пройден',
                    message: `Результат: ${data.scorePercent}% (проходной: ${data.passingScore}%). Попробуйте еще раз.`,
                    variant: 'error',
                    secondaryLabel: 'Повторить'
                });
                return;
            }

            const currentIndex = refreshedTopics.findIndex((topic) => topic._id === selectedTopicId);
            const nextUnlocked = refreshedTopics.slice(currentIndex + 1).find((topic) => topic.isUnlocked && !topic.isCompleted);

            setAnswers({});
            setIsQuizMode(false);

            if (nextUnlocked) {
                setSelectedTopicId(nextUnlocked._id);
                uiStore.showModal({
                    title: 'Тест завершен',
                    message: `Отлично! ${data.scorePercent}% правильных ответов. Следующая тема открыта.`,
                    variant: 'success',
                    secondaryLabel: 'Продолжить'
                });
                return;
            }

            const allCompleted = refreshedTopics.length > 0 && refreshedTopics.every((topic) => topic.isCompleted);
            if (allCompleted) {
                uiStore.showModal({
                    title: 'Курс завершен',
                    message: `Результат теста: ${data.scorePercent}%. Поздравляем, достижение начислено.`,
                    variant: 'success',
                    secondaryLabel: 'Отлично'
                });
                return;
            }

            uiStore.showModal({
                title: 'Тест завершен',
                message: `Результат: ${data.scorePercent}%`,
                variant: 'success',
                secondaryLabel: 'Закрыть'
            });
        } catch (e) {
            setError(e.response?.data?.message || 'Ошибка отправки теста');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className={styles.state}>Загрузка...</div>;
    if (error && !course) return <div className={styles.stateError}>{error}</div>;
    if (!course) return <div className={styles.stateError}>Курс не найден</div>;

    return (
        <div className={styles.page}>
            <Link to="/courses" className={styles.back}>← Назад к курсам</Link>
            <h1>{course.title}</h1>
            <p className={styles.description}>{course.description}</p>

            <div className={styles.layout}>
                <aside className={styles.sidebar}>
                    <h3>Темы</h3>
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
                                {topic.isCompleted ? '✓' : topic.isUnlocked ? 'Открыто' : 'Закрыто'}
                            </span>
                        </button>
                    ))}
                </aside>

                <main className={styles.content}>
                    {error && <p className={styles.inlineError}>{error}</p>}
                    {!topicPayload && <p>Выберите тему для просмотра</p>}

                    {topicPayload && (
                        <>
                            {!isQuizMode && (
                                <article className={styles.topicBlock}>
                                    <h2>{topicPayload.topic.title}</h2>
                                    <div className={styles.topicText}>{topicPayload.topic.content}</div>
                                    <div className={styles.topicActions}>
                                        {topicPayload?.quiz ? (
                                            <button
                                                type="button"
                                                className={styles.primaryBtn}
                                                onClick={() => setIsQuizMode(true)}
                                            >
                                                Перейти к тесту
                                            </button>
                                        ) : null}
                                    </div>
                                </article>
                            )}

                            {isQuizMode && topicPayload?.quiz && (
                                <>
                                    <h2>{topicPayload.topic.title}</h2>
                                    <form className={styles.quiz} onSubmit={submitQuiz}>
                                        <h3>Тест</h3>
                                        {(topicPayload.quiz.questions || []).map((question, index) => (
                                            <div key={question._id} className={styles.question}>
                                                <p>{index + 1}. {question.title}</p>
                                                {question.type === 'single_choice' ? (
                                                    <div className={styles.options}>
                                                        {(question.options || []).map((option, optionIndex) => (
                                                            <label key={`${question._id}-${optionIndex}`}>
                                                                <input
                                                                    type="radio"
                                                                    name={`q-${question._id}`}
                                                                    checked={answers[question._id]?.selectedOptionIndex === optionIndex}
                                                                    onChange={() => setAnswers((prev) => ({
                                                                        ...prev,
                                                                        [question._id]: { selectedOptionIndex: optionIndex, answerText: '' }
                                                                    }))}
                                                                />
                                                                {option.text}
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={answers[question._id]?.answerText || ''}
                                                        onChange={(e) => setAnswers((prev) => ({
                                                            ...prev,
                                                            [question._id]: { selectedOptionIndex: null, answerText: e.target.value }
                                                        }))}
                                                        placeholder="Введите ваш ответ"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                        <div className={styles.topicActions}>
                                            <button type="submit" className={styles.primaryBtn} disabled={submitting || !selectedTopicMeta?.isUnlocked}>
                                                {submitting ? 'Проверяем...' : 'Завершить тест'}
                                            </button>
                                            <button type="button" className={styles.secondaryBtn} onClick={() => setIsQuizMode(false)}>
                                                Вернуться к теме
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
