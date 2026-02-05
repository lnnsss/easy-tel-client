import React, { useState, useEffect } from 'react';
import AdminService from '../../services/AdminService';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
    const [words, setWords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nameRu: '',
        nameEn: '',
        nameTatar: '',
        transcription: '',
        descriptionRu: ''
    });

    useEffect(() => {
        fetchWords();
    }, []);

    const fetchWords = async () => {
        try {
            const response = await AdminService.getWords();
            setWords(response.data);
        } catch (e) {
            console.error("Ошибка при получении слов:", e);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await AdminService.createWord(formData);
            setFormData({ nameRu: '', nameEn: '', nameTatar: '', transcription: '', descriptionRu: '' });
            fetchWords();
        } catch (err) {
            alert(err.response?.data?.message || "Ошибка при создании слова");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (id, currentStatus) => {
        try {
            await AdminService.updateWord(id, { isActive: !currentStatus });
            fetchWords();
        } catch (e) {
            alert("Не удалось изменить статус");
        }
    };

    const handleDeleteFull = async (id) => {
        if (window.confirm("ВНИМАНИЕ! Слово будет удалено из базы навсегда. Продолжить?")) {
            try {
                await AdminService.deleteWord(id);
                fetchWords();
            } catch (e) {
                alert("Ошибка при удалении");
            }
        }
    };

    return (
        <div className={styles.wrapper}>
            <header className={styles.header}>
                <h1>Панель управления словами</h1>
            </header>

            <div className={styles.mainLayout}>
                <aside className={styles.formContainer}>
                    <div className={styles.card}>
                        <h3>Добавить слово</h3>
                        <form onSubmit={handleSubmit} className={styles.form}>
                            <input
                                placeholder="Русский"
                                value={formData.nameRu}
                                onChange={e => setFormData({...formData, nameRu: e.target.value})}
                                required
                            />
                            <input
                                placeholder="Татарский"
                                value={formData.nameTatar}
                                onChange={e => setFormData({...formData, nameTatar: e.target.value})}
                                required
                            />
                            <input
                                placeholder="English"
                                value={formData.nameEn}
                                onChange={e => setFormData({...formData, nameEn: e.target.value})}
                                required
                            />
                            <input
                                placeholder="Транскрипция"
                                value={formData.transcription}
                                onChange={e => setFormData({...formData, transcription: e.target.value})}
                            />
                            <textarea
                                placeholder="Описание (RU)"
                                value={formData.descriptionRu}
                                onChange={e => setFormData({...formData, descriptionRu: e.target.value})}
                                className={styles.textAreaFixed}
                            />
                            <button type="submit" disabled={loading} className={styles.addBtn}>
                                {loading ? 'Загрузка...' : 'Создать запись'}
                            </button>
                        </form>
                    </div>
                </aside>

                <main className={styles.listContainer}>
                    <div className={styles.card}>
                        <h3>Всего слов: {words.length}</h3>
                        <div className={styles.scrollArea}>
                            {words.map(word => (
                                <div key={word._id} className={`${styles.wordRow} ${!word.isActive ? styles.rowDisabled : ''}`}>
                                    <div className={styles.wordMain}>
                                        <span className={styles.tatarText}>{word.nameTatar}</span>
                                        <span className={styles.ruText}>{word.nameRu}</span>
                                    </div>
                                    <div className={styles.actions}>
                                        <button
                                            onClick={() => handleToggleActive(word._id, word.isActive)}
                                            className={word.isActive ? styles.btnWarn : styles.btnSuccess}
                                        >
                                            {word.isActive ? 'Отключить' : 'Включить'}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteFull(word._id)}
                                            className={styles.btnDanger}
                                        >
                                            Удалить навсегда
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;