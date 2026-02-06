import React, { useState, useEffect, useCallback } from 'react';
import AdminService from '../../services/AdminService';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
    const [words, setWords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWord, setEditingWord] = useState(null);

    const [formData, setFormData] = useState({
        nameRu: '', nameEn: '', nameTatar: '', transcription: '', descriptionRu: ''
    });

    // Дебаунс поиска
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchWords = useCallback(async () => {
        try {
            setLoading(true);
            const response = await AdminService.getWords(page, debouncedSearch);
            setWords(response.data.words || []);
            setTotalPages(response.data.totalPages || 1);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch]);

    useEffect(() => {
        fetchWords();
    }, [fetchWords]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await AdminService.createWord(formData);
            setFormData({ nameRu: '', nameEn: '', nameTatar: '', transcription: '', descriptionRu: '' });
            setPage(1);
            fetchWords();
        } catch (err) {
            alert(err.response?.data?.message || 'Ошибка');
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            await AdminService.updateWord(editingWord._id, editingWord);
            setIsModalOpen(false);
            fetchWords();
        } catch (err) {
            alert('Ошибка обновления');
        }
    };

    const handleDeleteFull = async (id) => {
        if (window.confirm('Удалить слово навсегда?')) {
            try {
                await AdminService.deleteWord(id);
                fetchWords();
            } catch {
                alert('Ошибка при удалении');
            }
        }
    };

    const openModal = (word) => {
        setEditingWord({ ...word });
        setIsModalOpen(true);
    };

    const renderPagination = () => {
        const btns = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
                btns.push(
                    <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={page === i ? styles.activePage : styles.pageBtn}
                    >
                        {i}
                    </button>
                );
            }
        }
        return btns;
    };

    return (
        <div className={styles.wrapper}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1>Admin<span>Panel</span></h1>
                    <p>Управление словарем системы</p>
                </div>
                <div className={styles.searchBar}>
                    <input
                        type="text"
                        placeholder="Поиск по RU / TAT / EN..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>
            </header>

            <div className={styles.mainLayout}>
                <aside className={styles.formContainer}>
                    <div className={styles.card}>
                        <h3>Новая запись</h3>
                        <form onSubmit={handleSubmit} className={styles.form}>
                            <input placeholder="Русский" value={formData.nameRu} onChange={e => setFormData({ ...formData, nameRu: e.target.value })} required />
                            <input placeholder="Татарский" value={formData.nameTatar} onChange={e => setFormData({ ...formData, nameTatar: e.target.value })} required />
                            <input placeholder="English" value={formData.nameEn} onChange={e => setFormData({ ...formData, nameEn: e.target.value })} required />
                            <input placeholder="Транскрипция" value={formData.transcription} onChange={e => setFormData({ ...formData, transcription: e.target.value })} />
                            <textarea placeholder="Описание" value={formData.descriptionRu} onChange={e => setFormData({ ...formData, descriptionRu: e.target.value })} />
                            <button type="submit" className={styles.addBtn}>Создать запись</button>
                        </form>
                    </div>
                </aside>

                <main className={styles.listContainer}>
                    <div className={styles.card}>
                        <div className={styles.listHeader}>
                            <h3>База слов</h3>
                        </div>

                        <div className={styles.wordGrid}>
                            {words.map(word => (
                                <div key={word._id} className={styles.wordRow}>
                                    <div className={styles.wordInfo}>
                                        <span className={styles.tatWord}>{word.nameTatar}</span>
                                        <span className={styles.ruWord}>{word.nameRu} / {word.nameEn}</span>
                                    </div>
                                    <div className={styles.rowActions}>
                                        <button onClick={() => openModal(word)} className={styles.editBtn}>✎</button>
                                        <button onClick={() => handleDeleteFull(word._id)} className={styles.actionBtnDel}>✕</button>
                                    </div>
                                </div>
                            ))}
                            {!loading && words.length === 0 && <div className={styles.empty}>Ничего не найдено</div>}
                        </div>

                        {totalPages > 1 && <div className={styles.pagination}>{renderPagination()}</div>}
                    </div>
                </main>
            </div>

            {isModalOpen && editingWord && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalCard}>
                        <h2>Редактировать слово</h2>
                        <form onSubmit={handleEditSubmit} className={styles.form}>
                            <input value={editingWord.nameRu} onChange={e => setEditingWord({...editingWord, nameRu: e.target.value})} required />
                            <input value={editingWord.nameTatar} onChange={e => setEditingWord({...editingWord, nameTatar: e.target.value})} required />
                            <input value={editingWord.nameEn} onChange={e => setEditingWord({...editingWord, nameEn: e.target.value})} required />
                            <input value={editingWord.transcription} onChange={e => setEditingWord({...editingWord, transcription: e.target.value})} />
                            <textarea value={editingWord.descriptionRu} onChange={e => setEditingWord({...editingWord, descriptionRu: e.target.value})} />
                            <div className={styles.modalButtons}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>Отмена</button>
                                <button type="submit" className={styles.addBtn}>Сохранить</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;