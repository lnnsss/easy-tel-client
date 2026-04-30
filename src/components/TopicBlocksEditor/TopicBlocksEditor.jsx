import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createTopicBlock, getTopicAssetUrlCandidates } from '../../utils/topicContent';
import styles from './TopicBlocksEditor.module.css';

const BLOCK_LABELS = {
    h2: 'Заголовок',
    h3: 'Подзаголовок',
    text: 'Текст',
    image: 'Картинка',
    spacer: 'Отступ'
};

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
const getImageWidthPercent = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 50;
    return Math.max(10, Math.min(100, Math.round(numeric)));
};
const isDragInteractiveTarget = (target) => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('input, textarea, select, button, label, [contenteditable="true"]'));
};

const getImageValidationError = (file) => {
    if (!file) return 'Файл изображения не выбран';

    const name = String(file.name || '').toLowerCase();
    const hasAllowedExtension = ALLOWED_IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
    const hasAllowedType = ALLOWED_IMAGE_TYPES.has(String(file.type || '').toLowerCase());

    if (!hasAllowedType && !hasAllowedExtension) {
        return 'Поддерживаются PNG, JPG, JPEG, WEBP и GIF';
    }

    if (Number(file.size || 0) > MAX_IMAGE_SIZE_BYTES) {
        return 'Размер изображения не должен превышать 5MB';
    }

    return '';
};

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

    const updateBlock = (index, patch) => {
        const next = blocks.map((block, i) => (i === index ? { ...block, ...patch } : block));
        onChange(next);
    };

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

    const uploadBlockImage = async (file, blockIndex) => {
        if (!file || !onUploadImage) return;

        const validationError = getImageValidationError(file);
        if (validationError) {
            onUploadError?.(validationError);
            return;
        }

        try {
            setUploadingIndex(blockIndex);
            const url = await onUploadImage(file, blockIndex);
            if (!url) {
                onUploadError?.('Не удалось получить URL загруженного изображения');
                return;
            }

            const candidates = getTopicAssetUrlCandidates(url);
            const canLoad = await canLoadImageFromCandidates(candidates);
            if (!canLoad) {
                onUploadError?.('Изображение загружено, но браузер не смог его отобразить. Используйте PNG, JPG, WEBP или GIF.');
                return;
            }

            updateBlock(blockIndex, { url });
        } catch (error) {
            onUploadError?.(error?.message || 'Ошибка загрузки изображения');
        } finally {
            setUploadingIndex(-1);
        }
    };

    const handleImageFallback = (event, url) => {
        const candidates = getTopicAssetUrlCandidates(url);
        const currentIndex = Number(event.currentTarget.dataset.fallbackIndex || 0);
        const nextIndex = currentIndex + 1;
        if (nextIndex >= candidates.length) {
            if (event.currentTarget.dataset.fallbackFailed !== '1') {
                event.currentTarget.dataset.fallbackFailed = '1';
                onUploadError?.('Не удалось отобразить это изображение. Попробуйте другой формат (PNG, JPG, WEBP, GIF).');
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
                <p className={styles.empty}>Добавьте минимум один блок контента.</p>
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
                            <small className={styles.blockType}>{BLOCK_LABELS[block.type] || 'Блок'}</small>
                            {!disabled && (
                                <button
                                    type="button"
                                    className={styles.removeButton}
                                    onClick={() => requestRemoveBlock(index)}
                                    draggable={false}
                                    aria-label="Удалить блок"
                                    title="Удалить блок"
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
                                        placeholder="Введите заголовок"
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
                                        placeholder="Введите подзаголовок"
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
                                        placeholder="Введите текст"
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
                                                alt="Предпросмотр"
                                                className={styles.preview}
                                                data-fallback-index="0"
                                                onError={(event) => handleImageFallback(event, block.url)}
                                            />
                                        </div>
                                    ) : (
                                        <span className={styles.imagePlaceholder}>
                                            {uploadingIndex === index ? 'Загрузка...' : 'Нажмите, чтобы выбрать изображение'}
                                        </span>
                                    )}
                                </label>
                                <input
                                    value={block.url || ''}
                                    onChange={(e) => updateBlock(index, { url: e.target.value })}
                                    placeholder="Или вставьте URL изображения"
                                    disabled={disabled}
                                    className={styles.imageUrlInput}
                                />
                                <div className={styles.imageScaleRow}>
                                    <span className={styles.imageScaleLabel}>Масштаб</span>
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
                            <div className={styles.spacerBlock} aria-label="Пустой блок-отступ" />
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
                    Добавить
                </button>
                {isAddMenuOpen && !disabled && (
                    <div className={styles.addMenu} onClick={(event) => event.stopPropagation()}>
                        <button type="button" onClick={() => addBlock('h2')}>Заголовок</button>
                        <button type="button" onClick={() => addBlock('h3')}>Подзаголовок</button>
                        <button type="button" onClick={() => addBlock('text')}>Текст</button>
                        <button type="button" onClick={() => addBlock('image')}>Картинка</button>
                        <button type="button" onClick={() => addBlock('spacer')}>Отступ</button>
                    </div>
                )}
            </div>

            {pendingDeleteIndex >= 0 ? (
                <div className={styles.confirmOverlay} onClick={() => setPendingDeleteIndex(-1)}>
                    <div className={styles.confirmModal} onClick={(event) => event.stopPropagation()}>
                        <h4 className={styles.confirmTitle}>Удалить блок?</h4>
                        <p className={styles.confirmText}>Это действие нельзя отменить.</p>
                        <label className={styles.confirmCheckboxRow}>
                            <input
                                type="checkbox"
                                checked={dontAskAgainChecked}
                                onChange={(event) => setDontAskAgainChecked(event.target.checked)}
                            />
                            <span>Больше не показывать</span>
                        </label>
                        <div className={styles.confirmActions}>
                            <button type="button" className={styles.confirmDeleteBtn} onClick={confirmRemoveBlock}>
                                Удалить
                            </button>
                            <button type="button" className={styles.confirmCancelBtn} onClick={() => setPendingDeleteIndex(-1)}>
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default TopicBlocksEditor;
