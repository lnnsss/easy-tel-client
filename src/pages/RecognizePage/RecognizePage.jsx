import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '../../stores/StoreContext';
import styles from './RecognizePage.module.css';

const RecognizePage = observer(() => {
    const { recognizeStore, authStore } = useStores();

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            recognizeStore.setPreview(file);
            recognizeStore.recognize(file);
            e.target.value = null;
        }
    };

    // ПРОВЕРКА: есть ли уже это слово у пользователя
    // Проверяем по ID слова в массиве словаря пользователя
    const isAlreadyInDictionary = authStore.user?.dictionary?.some(item => {
        // Если словарь содержит объекты (после populate) или просто ID UserWord
        // Обычно мы проверяем wordId, полученный от ИИ, со списком слов пользователя
        // Если бэкенд возвращает в профиле массив объектов { word: 'id' }, то:
        const wordIdInDict = typeof item.word === 'object' ? item.word._id : item.word;
        return wordIdInDict === recognizeStore.result?.id;
    });

    return (
        <div className={styles.container}>
            <div className={styles.instructionBlock}>
                <h2 className={styles.pageTitle}>Интеллектуальный сканер</h2>
                <p className={styles.pageSubtitle}>
                    Загрузите фотографию для мгновенного распознавания.
                </p>
            </div>

            <div className={styles.uploadCard}>
                <label className={styles.dropzone}>
                    <input type="file" onChange={handleFileChange} hidden accept="image/*" />
                    {recognizeStore.preview ? (
                        <img src={recognizeStore.preview} alt="Preview" className={styles.imagePreview} />
                    ) : (
                        <div className={styles.placeholder}>
                            <span className={styles.placeholderText}>Нажмите, чтобы выбрать фото</span>
                        </div>
                    )}
                </label>

                {recognizeStore.loading && <div className={styles.loader}>Анализ изображения...</div>}
                {recognizeStore.error && <div className={styles.error}>{recognizeStore.error}</div>}

                {recognizeStore.result && (
                    <div className={styles.resultCard}>
                        <div className={styles.resultMain}>
                            <h2 className={styles.tatarWord}>{recognizeStore.result.nameTatar}</h2>
                            <span className={styles.transcription}>[{recognizeStore.result.transcription}]</span>
                        </div>

                        <div className={styles.details}>
                            <p><strong>Русский:</strong> {recognizeStore.result.nameRu}</p>
                            <p className={styles.descriptionText}>{recognizeStore.result.description}</p>
                        </div>

                        <div className={styles.btnGroup}>
                            {authStore.isAuth ? (
                                isAlreadyInDictionary ? (
                                    <button className={styles.alreadyBtn} disabled>
                                        Уже в словаре
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => recognizeStore.addToDictionary()}
                                        className={styles.addBtn}
                                        disabled={recognizeStore.isSaving}
                                    >
                                        {recognizeStore.isSaving ? "Сохранение..." : "Добавить в словарь"}
                                    </button>
                                )
                            ) : (
                                <p className={styles.authAlert}>Войдите, чтобы сохранить слово</p>
                            )}

                            <button onClick={() => recognizeStore.reset()} className={styles.resetBtn}>
                                Заново
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export default RecognizePage;