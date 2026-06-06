import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import AdminService from '../../services/AdminService';
import { useStores } from '../../stores/StoreContext';
import styles from './AdminDashboard.module.css';

// Отрисовывает стартовую панель администратора с основными разделами.
const AdminDashboard = () => {
    const { t } = useTranslation();
    const { uiStore } = useStores();
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

    // Обрабатывает пользовательское или системное событие.
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await AdminService.createWord(formData);
            setFormData({ nameRu: '', nameEn: '', nameTatar: '', transcription: '', descriptionRu: '' });
            setPage(1);
            fetchWords();
        } catch (err) {
            uiStore.showModal({
                title: t('modals.error'),
                message: err.response?.data?.message || t('modals.error'),
                variant: 'error',
                secondaryLabel: t('common.close')
            });
        }
    };

    // Обрабатывает пользовательское или системное событие.
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            await AdminService.updateWord(editingWord._id, editingWord);
            setIsModalOpen(false);
            fetchWords();
        } catch {
            uiStore.showModal({
                title: t('modals.error'),
                message: t('pages.admin.dictionary.update_error'),
                variant: 'error',
                secondaryLabel: t('common.close')
            });
        }
    };

    // Обрабатывает пользовательское или системное событие.
    const handleDeleteFull = async (id) => {
        uiStore.showModal({
            title: t('pages.admin.dictionary.delete_title'),
            message: t('pages.admin.dictionary.delete_message'),
            variant: 'error',
            primaryLabel: t('common.actions.delete'),
            secondaryLabel: t('common.actions.cancel'),
            onPrimary: async () => {
                try {
                    await AdminService.deleteWord(id);
                    uiStore.closeModal();
                    fetchWords();
                } catch {
                    uiStore.showModal({
                        title: t('modals.error'),
                        message: t('pages.admin.dictionary.delete_error'),
                        variant: 'error',
                        secondaryLabel: t('common.close')
                    });
                }
            }
        });
    };

    // Открывает локальное состояние интерфейса или модального окна.
    const openModal = (word) => {
        setEditingWord({ ...word });
        setIsModalOpen(true);
    };

    // Формирует повторяемый фрагмент интерфейса.
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
        <div className={`${styles.wrapper} app-page-shell`}>
            <header className={`${styles.header} app-page-top`}>
                <div className={styles.titleArea}>
                    <h1 className="app-page-title">{t('pages.admin.dictionary_title')}</h1>
                    <p className="app-page-subtitle">{t('pages.admin.dictionary_subtitle')}</p>
                </div>
                <div className={styles.searchBar}>
                    <input
                        type="text"
                        placeholder={t('pages.admin.dictionary.search_placeholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>
            </header>

            <div className={styles.mainLayout}>
                <aside className={styles.formContainer}>
                    <div className={styles.card}>
                        <h3>{t('pages.admin.dictionary.new_word')}</h3>
                        <form onSubmit={handleSubmit} className={styles.form}>
                            <input placeholder={t('pages.admin.dictionary.russian')} value={formData.nameRu} onChange={e => setFormData({ ...formData, nameRu: e.target.value })} required />
                            <input placeholder={t('pages.admin.dictionary.tatar')} value={formData.nameTatar} onChange={e => setFormData({ ...formData, nameTatar: e.target.value })} required />
                            <input placeholder="English" value={formData.nameEn} onChange={e => setFormData({ ...formData, nameEn: e.target.value })} required />
                            <input placeholder={t('pages.admin.dictionary.transcription')} value={formData.transcription} onChange={e => setFormData({ ...formData, transcription: e.target.value })} />
                            <textarea placeholder={t('pages.admin.dictionary.description')} value={formData.descriptionRu} onChange={e => setFormData({ ...formData, descriptionRu: e.target.value })} />
                            <button type="submit" className={styles.addBtn}>{t('common.actions.create')}</button>
                        </form>
                    </div>
                </aside>

                <main className={styles.listContainer}>
                    <div className={styles.card}>
                        <div className={styles.listHeader}>
                            <h3>{t('pages.admin.dictionary.word_base')}</h3>
                        </div>

                        <div className={styles.wordGrid}>
                            {words.map(word => (
                                <div key={word._id} className={styles.wordRow}>
                                    <div className={styles.wordInfo}>
                                        <span className={styles.tatWord}>
                                            {word.nameTatar}
                                        </span>
                                        <span className={styles.ruWord}>{word.nameRu} / {word.nameEn}</span>
                                    </div>
                                    <div className={styles.rowActions}>
                                        <button onClick={() => openModal(word)} className={styles.editBtn}>✎</button>
                                        <button onClick={() => handleDeleteFull(word._id)} className={styles.actionBtnDel}>✕</button>
                                    </div>
                                </div>
                            ))}
                            {!loading && words.length === 0 && <div className={styles.empty}>{t('pages.admin.dictionary.empty')}</div>}
                        </div>

                        {totalPages > 1 && <div className={styles.pagination}>{renderPagination()}</div>}
                    </div>
                </main>
            </div>

            {isModalOpen && editingWord && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalCard}>
                        <h2>{t('pages.admin.dictionary.edit_word')}</h2>
                        <form onSubmit={handleEditSubmit} className={styles.form}>
                            <input placeholder={t('pages.admin.dictionary.russian')} value={editingWord.nameRu} onChange={e => setEditingWord({...editingWord, nameRu: e.target.value})} required />
                            <input placeholder={t('pages.admin.dictionary.tatar')} value={editingWord.nameTatar} onChange={e => setEditingWord({...editingWord, nameTatar: e.target.value})} required />
                            <input placeholder="English" value={editingWord.nameEn} onChange={e => setEditingWord({...editingWord, nameEn: e.target.value})} required />
                            <input placeholder={t('pages.admin.dictionary.transcription')} value={editingWord.transcription} onChange={e => setEditingWord({...editingWord, transcription: e.target.value})} />
                            <textarea placeholder={t('pages.admin.dictionary.description')} value={editingWord.descriptionRu} onChange={e => setEditingWord({...editingWord, descriptionRu: e.target.value})} />
                            <div className={styles.modalButtons}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>{t('common.actions.cancel')}</button>
                                <button type="submit" className={`${styles.addBtn} ${styles.modalSubmitBtn}`}>{t('common.actions.save')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
