import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import $api from '../../api/instance';
import { useStores } from '../../stores/StoreContext';
import styles from './DictionaryAssessmentPage.module.css';

// Отрисовывает экран или компонент DictionaryAssessmentPage и связывает его с данными приложения.
const DictionaryAssessmentPage = () => {
    const { t } = useTranslation();
    const { uiStore } = useStores();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [session, setSession] = useState({ sessionId: '', questions: [] });
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const start = async () => {
            setLoading(true);
            setError('');
            try {
                const { data } = await $api.post('/dictionary/weekly-assessment/start');
                setSession({
                    sessionId: String(data?.sessionId || ''),
                    questions: Array.isArray(data?.questions) ? data.questions : []
                });
            } catch (e) {
                const message = e?.response?.data?.message || t('pages.dictionary.assessment.start_error');
                if (String(message).includes('уже пройден')) {
                    uiStore.showModal({
                        title: t('pages.dictionary.modals.weekly_locked_title'),
                        message: t('pages.dictionary.modals.weekly_locked_message'),
                        variant: 'info',
                        secondaryLabel: t('common.close'),
                        onSecondary: () => {
                            uiStore.closeModal();
                            navigate('/dictionary');
                        }
                    });
                }
                setError(message);
            } finally {
                setLoading(false);
            }
        };
        start();
    }, [navigate, t, uiStore]);

    const currentQuestion = session.questions[step] || null;
    const selectedOption = answers[step];
    const isLast = step >= (session.questions.length - 1);
    const progressLabel = useMemo(() => `${Math.min(step + 1, session.questions.length)}/${session.questions.length || 20}`, [step, session.questions.length]);

    // Обрабатывает событие интерфейса пользователя.
    const onSelect = (idx) => {
        setAnswers((prev) => ({ ...prev, [step]: idx }));
    };

    // Обрабатывает событие интерфейса пользователя.
    const onNext = async () => {
        if (selectedOption === undefined || selectedOption === null) return;
        if (!isLast) {
            setStep((prev) => prev + 1);
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                sessionId: session.sessionId,
                answers: session.questions.map((q, idx) => ({
                    questionIndex: idx,
                    optionIndex: Number(answers[idx])
                }))
            };
            const { data } = await $api.post('/dictionary/weekly-assessment/submit', payload);
            setResult(data?.result || null);
        } catch (e) {
            setError(e?.response?.data?.message || t('pages.dictionary.assessment.submit_error'));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className={styles.center}>{t('pages.dictionary.assessment.loading')}</div>;
    }

    if (error && !session.questions.length && !result) {
        return (
            <div className={styles.center}>
                <p>{error}</p>
                <button type="button" className={styles.actionBtn} onClick={() => navigate('/dictionary')}>{t('common.actions.return_to_dictionary')}</button>
            </div>
        );
    }

    if (result) {
        return (
            <div className={styles.page}>
                <div className={`${styles.card} ${styles.resultCard}`}>
                    <h1>{t('pages.dictionary.assessment.done_title')}</h1>
                    <p>{t('pages.dictionary.assessment.correct')} <strong>{result.correctAnswers}/{result.totalQuestions}</strong></p>
                    <p>{t('pages.dictionary.assessment.weekly_level')} <strong>{result.level}</strong></p>
                    <button type="button" className={styles.actionBtn} onClick={() => navigate('/dictionary')}>{t('common.actions.return_to_dictionary')}</button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.topRow}>
                    <h1>{t('pages.dictionary.assessment.title')}</h1>
                    <span>{progressLabel}</span>
                </div>
                {error && <p className={styles.error}>{error}</p>}
                {currentQuestion && (
                    <>
                        <p className={styles.prompt}>{currentQuestion.promptTatar}</p>
                        <div className={styles.options}>
                            {(currentQuestion.optionsRu || []).map((option, idx) => {
                                const active = Number(selectedOption) === idx;
                                return (
                                    <button
                                        key={`${step}-${idx}`}
                                        type="button"
                                        className={`${styles.optionBtn} ${active ? styles.optionBtnActive : ''}`}
                                        onClick={() => onSelect(idx)}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                        <div className={styles.actions}>
                            <button type="button" className={styles.secondaryBtn} onClick={() => navigate('/dictionary')}>{t('common.actions.exit')}</button>
                            <button
                                type="button"
                                className={styles.actionBtn}
                                disabled={selectedOption === undefined || submitting}
                                onClick={onNext}
                            >
                                {submitting ? t('common.actions.checking') : (isLast ? t('common.actions.finish_test') : t('common.actions.next_word'))}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default DictionaryAssessmentPage;
