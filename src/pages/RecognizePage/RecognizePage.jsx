import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '../../stores/StoreContext';
import styles from './RecognizePage.module.css';

const RecognizePage = observer(() => {
    const { recognizeStore } = useStores();

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            recognizeStore.setPreview(file);
            recognizeStore.recognize(file);
            // Сбрасываем input, чтобы событие onChange срабатывало даже на тот же файл
            e.target.value = null;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.instructionBlock}>
                <h2 className={styles.pageTitle}>Интеллектуальный сканер</h2>
                <p className={styles.pageSubtitle}>
                    Загрузите фотографию объекта для автоматического распознавания, получения перевода и подробного описания на татарском языке.
                </p>
            </div>

            <div className={styles.uploadCard}>
                <label className={styles.dropzone}>
                    <input
                        type="file"
                        onChange={handleFileChange}
                        hidden
                        accept="image/*"
                    />
                    {recognizeStore.preview ? (
                        <img src={recognizeStore.preview} alt="Preview" className={styles.imagePreview} />
                    ) : (
                        <div className={styles.placeholder}>
                            <span className={styles.placeholderText}>Нажмите для выбора изображения или сделайте снимок</span>
                        </div>
                    )}
                </label>

                {recognizeStore.loading && (
                    <div className={styles.loader}>Идет процесс идентификации...</div>
                )}

                {/* Вывод ошибки, если она есть */}
                {recognizeStore.error && (
                    <div className={styles.error}>{recognizeStore.error}</div>
                )}

                {recognizeStore.result && (
                    <div className={styles.resultCard}>
                        <div className={styles.resultMain}>
                            <h2 className={styles.tatarWord}>{recognizeStore.result.nameTatar}</h2>
                            <span className={styles.transcription}>[{recognizeStore.result.transcription}]</span>
                        </div>
                        <div className={styles.details}>
                            <p className={styles.translateRow}>
                                <strong>Русский эквивалент:</strong> {recognizeStore.result.nameRu}
                            </p>
                            <p className={styles.descriptionText}>{recognizeStore.result.description}</p>
                        </div>
                        <button onClick={() => recognizeStore.reset()} className={styles.resetBtn}>Начать заново</button>
                    </div>
                )}
            </div>
        </div>
    );
});

export default RecognizePage;