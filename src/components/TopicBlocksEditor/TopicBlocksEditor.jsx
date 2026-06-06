import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createTopicBlock, getTopicAssetUrlCandidates } from '../../utils/topicContent';
import styles from './TopicBlocksEditor.module.css';

const BLOCK_LABELS = {
    h2: 'editor.blocks.h2',
    h3: 'editor.blocks.h3',
    text: 'editor.blocks.text',
    image: 'editor.blocks.image',
    spacer: 'editor.blocks.spacer'
};

// Переставляет элемент списка при ручной сортировке или drag-and-drop.
const moveItem = (items, fromIndex, toIndex) => {
    if (fromIndex === toIndex) return items;
    const next = [...items];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    return next;
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif'
]);
const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
const SKIP_DELETE_CONFIRM_KEY = 'topicBlocksSkipDeleteConfirm';
// Возвращает нужные данные или вычисленное значение.
const getImageWidthPercent = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 50;
    return Math.max(10, Math.min(100, Math.round(numeric)));
};
// Проверяет условие и возвращает логический результат.
const isDragInteractiveTarget = (target) => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('input, textarea, select, button, label, [contenteditable="true"]'));
};

// Возвращает нужные данные или вычисленное значение.
const getImageValidationError = (file, t) => {
    if (!file) return t('editor.topic_blocks.file_required');

    const name = String(file.name || '').toLowerCase();
    const hasAllowedExtension = ALLOWED_IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
    const hasAllowedType = ALLOWED_IMAGE_TYPES.has(String(file.type || '').toLowerCase());

    if (!hasAllowedType && !hasAllowedExtension) {
        return t('editor.topic_blocks.file_type');
    }

    if (Number(file.size || 0) > MAX_IMAGE_SIZE_BYTES) {
        return t('editor.topic_blocks.file_size');
    }

    return '';
};

// Проверяет, разрешено ли выполнить действие.
const canLoadImageFromCandidates = (candidates) => new Promise((resolve) => {
    if (!Array.isArray(candidates) || candidates.length === 0) {
        resolve(false);
        return;
    }

    let currentIndex = 0;
    const tryLoad = () => {
        if (currentIndex >= candidates.length) {
            resolve(false);
            return;
        }

        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => {
            currentIndex += 1;
            tryLoad();
        };
        img.src = candidates[currentIndex];
    };

    tryLoad();
});

const EditableBlock = ({
    tagName,
    value,
    className,
    placeholder,
    disabled,
    singleLine = false,
    onChange
}) => {
    const ref = useRef(null);
    const isFocusedRef = useRef(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        if (isFocusedRef.current) return;
        const nextValue = String(value || '');
        if (node.textContent !== nextValue) {
            node.textContent = nextValue;
        }
    }, [value]);

    const Tag = tagName;

    return (
        <Tag
            ref={ref}
            className={className}
            contentEditable={!disabled}
            suppressContentEditableWarning
            onFocus={() => {
                isFocusedRef.current = true;
            }}
            onBlur={(event) => {
                isFocusedRef.current = false;
                onChange(event.currentTarget.textContent || '');
            }}
            onInput={(event) => onChange(event.currentTarget.textContent || '')}
            onPaste={(event) => {
                event.preventDefault();
                const text = event.clipboardData?.getData('text/plain') || '';
                if (document.queryCommandSupported?.('insertText')) {
                    document.execCommand('insertText', false, text);
                    return;
                }
                const selection = window.getSelection();
                if (!selection || !selection.rangeCount) return;
                selection.deleteFromDocument();
                selection.getRangeAt(0).insertNode(document.createTextNode(text));
            }}
            onKeyDown={(event) => {
                if (singleLine && event.key === 'Enter') {
                    event.preventDefault();
                }
            }}
            data-placeholder={placeholder}
        />
    );
};

const TopicBlocksEditor = ({
    value = [],
    onChange,
    onUploadImage,
    onUploadError,
    disabled = false,
    validationErrors = []
}) => {
    const { t } = useTranslation();
    const [dragIndex, setDragIndex] = useState(-1);
    const [dragOverIndex, setDragOverIndex] = useState(-1);
    const [dragLocked, setDragLocked] = useState(false);
    const [uploadingIndex, setUploadingIndex] = useState(-1);
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [pendingDeleteIndex, setPendingDeleteIndex] = useState(-1);
    const [skipDeleteConfirm, setSkipDeleteConfirm] = useState(
        () => window.localStorage.getItem(SKIP_DELETE_CONFIRM_KEY) === '1'
    );
    const [dontAskAgainChecked, setDontAskAgainChecked] = useState(false);

    const blocks = useMemo(() => (Array.isArray(value) ? value : []), [value]);

    const addBlock = (type) => {
        const next = [...blocks, createTopicBlock(type)];
        onChange(next);
        setIsAddMenuOpen(false);
    };

    // Обновляет сущность по данным из запроса.
    const updateBlock = (index, patch) => {
        const next = blocks.map((block, i) => (i === index ? { ...block, ...patch } : block));
        onChange(next);
    };

    // Удаляет связь или сущность по запросу пользователя.
    const removeBlock = (index) => {
        onChange(blocks.filter((_, i) => i !== index));
    };

    const requestRemoveBlock = (index) => {
        if (skipDeleteConfirm) {
            removeBlock(index);
            return;
        }
        setDontAskAgainChecked(false);
        setPendingDeleteIndex(index);
    };

    // Показывает подтверждение перед необратимым действием.
    const confirmRemoveBlock = () => {
        if (pendingDeleteIndex < 0 || pendingDeleteIndex >= blocks.length) {
            setPendingDeleteIndex(-1);
            return;
        }

        if (dontAskAgainChecked) {
            window.localStorage.setItem(SKIP_DELETE_CONFIRM_KEY, '1');
            setSkipDeleteConfirm(true);
        }

        removeBlock(pendingDeleteIndex);
        setPendingDeleteIndex(-1);
        setDontAskAgainChecked(false);
    };

    // Обрабатывает событие интерфейса пользователя.
    const onDropBlock = (dropIndex) => {
        if (dragIndex < 0 || dropIndex < 0 || dragIndex >= blocks.length || dropIndex >= blocks.length) {
            setDragIndex(-1);
            setDragOverIndex(-1);
            return;
        }

        const next = moveItem(blocks, dragIndex, dropIndex);
        onChange(next);
        setDragIndex(-1);
        setDragOverIndex(-1);
    };

    // Принимает загруженный файл и возвращает информацию для дальнейшей работы.
    const uploadBlockImage = async (file, blockIndex) => {
        if (!file || !onUploadImage) return;

        const validationError = getImageValidationError(file, t);
        if (validationError) {
            onUploadError?.(validationError);
            return;
        }

        try {
            setUploadingIndex(blockIndex);
            const url = await onUploadImage(file, blockIndex);
            if (!url) {
                onUploadError?.(t('editor.topic_blocks.upload_url_missing'));
                return;
            }

            const candidates = getTopicAssetUrlCandidates(url);
            const canLoad = await canLoadImageFromCandidates(candidates);
            if (!canLoad) {
                onUploadError?.(t('editor.topic_blocks.upload_display_failed'));
                return;
            }

            updateBlock(blockIndex, { url });
        } catch (error) {
            onUploadError?.(error?.message || t('editor.topic_blocks.upload_failed'));
        } finally {
            setUploadingIndex(-1);
        }
    };

    // Обрабатывает пользовательское или системное событие.
    const handleImageFallback = (event, url) => {
        const candidates = getTopicAssetUrlCandidates(url);
        const currentIndex = Number(event.currentTarget.dataset.fallbackIndex || 0);
        const nextIndex = currentIndex + 1;
        if (nextIndex >= candidates.length) {
            if (event.currentTarget.dataset.fallbackFailed !== '1') {
                event.currentTarget.dataset.fallbackFailed = '1';
                onUploadError?.(t('editor.topic_blocks.image_display_failed'));
            }
            return;
        }
        event.currentTarget.dataset.fallbackIndex = String(nextIndex);
        event.currentTarget.src = candidates[nextIndex];
    };

    useEffect(() => {
        const closeMenus = () => setIsAddMenuOpen(false);

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                closeMenus();
            }
        };

        window.addEventListener('click', closeMenus);
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('click', closeMenus);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, []);

    useEffect(() => {
        const unlockDrag = () => setDragLocked(false);
        window.addEventListener('pointerup', unlockDrag);
        window.addEventListener('touchend', unlockDrag);
        window.addEventListener('mouseup', unlockDrag);
        return () => {
            window.removeEventListener('pointerup', unlockDrag);
            window.removeEventListener('touchend', unlockDrag);
            window.removeEventListener('mouseup', unlockDrag);
        };
    }, []);

    return (
        <div className={styles.editor}>
            {blocks.length === 0 && (
                <p className={styles.empty}>{t('editor.topic_blocks.empty')}</p>
            )}

            <div className={styles.blocks}>
                {blocks.map((block, index) => (
                    <div
                        key={`${block.type}-${index}`}
                        className={`${styles.block} ${dragOverIndex === index ? styles.blockDragOver : ''}`}
                        draggable={!disabled && !dragLocked}
                        onDragStart={(event) => {
                            if (isDragInteractiveTarget(event.target)) {
                                event.preventDefault();
                                return;
                            }
                            setDragIndex(index);
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverIndex(index);
                        }}
                        onDrop={() => onDropBlock(index)}
                        onDragEnd={() => {
                            setDragIndex(-1);
                            setDragOverIndex(-1);
                        }}
                    >
                        <div className={styles.blockTop}>
                            <small className={styles.blockType}>{t(BLOCK_LABELS[block.type] || 'editor.blocks.block')}</small>
                            {!disabled && (
                                <button
                                    type="button"
                                    className={styles.removeButton}
                                    onClick={() => requestRemoveBlock(index)}
                                    draggable={false}
                                    aria-label={t('editor.topic_blocks.delete_block')}
                                    title={t('editor.topic_blocks.delete_block')}
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        {(block.type === 'h2' || block.type === 'h3' || block.type === 'text') && (
                            <>
                                {block.type === 'h2' && (
                                    <EditableBlock
                                        tagName="h2"
                                        className={`${styles.editableH2} ${validationErrors[index] ? styles.fieldInvalid : ''}`}
                                        value={block.text || ''}
                                        onChange={(text) => updateBlock(index, { text })}
                                        placeholder={t('editor.topic_blocks.h2_placeholder')}
                                        disabled={disabled}
                                        singleLine
                                    />
                                )}
                                {block.type === 'h3' && (
                                    <EditableBlock
                                        tagName="h3"
                                        className={`${styles.editableH3} ${validationErrors[index] ? styles.fieldInvalid : ''}`}
                                        value={block.text || ''}
                                        onChange={(text) => updateBlock(index, { text })}
                                        placeholder={t('editor.topic_blocks.h3_placeholder')}
                                        disabled={disabled}
                                        singleLine
                                    />
                                )}
                                {block.type === 'text' && (
                                    <EditableBlock
                                        tagName="p"
                                        className={`${styles.editableText} ${validationErrors[index] ? styles.fieldInvalid : ''}`}
                                        value={block.text || ''}
                                        onChange={(text) => updateBlock(index, { text })}
                                        placeholder={t('editor.topic_blocks.text_placeholder')}
                                        disabled={disabled}
                                    />
                                )}
                                {validationErrors[index] ? <p className={styles.errorText}>{validationErrors[index]}</p> : null}
                            </>
                        )}

                        {block.type === 'image' && (
                            <div className={styles.imageBlock}>
                                <label
                                    className={`${styles.imageCanvas} ${validationErrors[index] ? styles.fieldInvalid : ''}`}
                                >
                                    <input
                                        type="file"
                                        accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
                                        disabled={disabled || uploadingIndex === index}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) uploadBlockImage(file, index);
                                            e.target.value = '';
                                        }}
                                    />
                                    {block.url ? (
                                        <div className={styles.previewFrame} style={{ width: `${getImageWidthPercent(block.widthPercent)}%` }}>
                                            <img
                                                src={getTopicAssetUrlCandidates(block.url)[0]}
                                                alt={t('editor.topic_blocks.preview_alt')}
                                                className={styles.preview}
                                                data-fallback-index="0"
                                                onError={(event) => handleImageFallback(event, block.url)}
                                            />
                                        </div>
                                    ) : (
                                        <span className={styles.imagePlaceholder}>
                                            {uploadingIndex === index ? t('editor.topic_blocks.uploading') : t('editor.topic_blocks.choose_image')}
                                        </span>
                                    )}
                                </label>
                                <input
                                    value={block.url || ''}
                                    onChange={(e) => updateBlock(index, { url: e.target.value })}
                                    placeholder={t('editor.topic_blocks.image_url_placeholder')}
                                    disabled={disabled}
                                    className={styles.imageUrlInput}
                                />
                                <div className={styles.imageScaleRow}>
                                    <span className={styles.imageScaleLabel}>{t('editor.topic_blocks.scale')}</span>
                                    <input
                                        type="range"
                                        min="10"
                                        max="100"
                                        step="1"
                                        value={getImageWidthPercent(block.widthPercent)}
                                        disabled={disabled}
                                        onPointerDown={(event) => {
                                            event.stopPropagation();
                                            setDragLocked(true);
                                        }}
                                        onMouseDown={(event) => {
                                            event.stopPropagation();
                                            setDragLocked(true);
                                        }}
                                        onTouchStart={(event) => {
                                            event.stopPropagation();
                                            setDragLocked(true);
                                        }}
                                        onBlur={() => setDragLocked(false)}
                                        onChange={(e) => updateBlock(index, { widthPercent: Number(e.target.value) })}
                                    />
                                    <span className={styles.imageScaleValue}>
                                        {getImageWidthPercent(block.widthPercent)}%
                                    </span>
                                </div>
                                {validationErrors[index] ? <p className={styles.errorText}>{validationErrors[index]}</p> : null}
                            </div>
                        )}

                        {block.type === 'spacer' && (
                            <div className={styles.spacerBlock} aria-label={t('editor.topic_blocks.spacer_aria')} />
                        )}
                    </div>
                ))}
            </div>

            <div className={styles.toolbar}>
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        if (disabled) return;
                        setIsAddMenuOpen((prev) => !prev);
                    }}
                    disabled={disabled}
                    className={styles.addButton}
                >
                    {t('common.actions.add')}
                </button>
                {isAddMenuOpen && !disabled && (
                    <div className={styles.addMenu} onClick={(event) => event.stopPropagation()}>
                        <button type="button" onClick={() => addBlock('h2')}>{t('editor.blocks.h2')}</button>
                        <button type="button" onClick={() => addBlock('h3')}>{t('editor.blocks.h3')}</button>
                        <button type="button" onClick={() => addBlock('text')}>{t('editor.blocks.text')}</button>
                        <button type="button" onClick={() => addBlock('image')}>{t('editor.blocks.image')}</button>
                        <button type="button" onClick={() => addBlock('spacer')}>{t('editor.blocks.spacer')}</button>
                    </div>
                )}
            </div>

            {pendingDeleteIndex >= 0 ? (
                <div className={styles.confirmOverlay} onClick={() => setPendingDeleteIndex(-1)}>
                    <div className={styles.confirmModal} onClick={(event) => event.stopPropagation()}>
                        <h4 className={styles.confirmTitle}>{t('editor.topic_blocks.delete_title')}</h4>
                        <p className={styles.confirmText}>{t('editor.topic_blocks.delete_text')}</p>
                        <label className={styles.confirmCheckboxRow}>
                            <input
                                type="checkbox"
                                checked={dontAskAgainChecked}
                                onChange={(event) => setDontAskAgainChecked(event.target.checked)}
                            />
                            <span>{t('editor.topic_blocks.dont_show_again')}</span>
                        </label>
                        <div className={styles.confirmActions}>
                            <button type="button" className={styles.confirmDeleteBtn} onClick={confirmRemoveBlock}>
                                {t('common.actions.delete')}
                            </button>
                            <button type="button" className={styles.confirmCancelBtn} onClick={() => setPendingDeleteIndex(-1)}>
                                {t('common.actions.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default TopicBlocksEditor;
