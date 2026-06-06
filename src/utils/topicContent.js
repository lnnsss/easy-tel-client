export const TOPIC_BLOCK_TYPES = ['h2', 'h3', 'text', 'image', 'spacer'];

// Приводит входные данные к единому безопасному формату.
const normalizeImageWidthPercent = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 50;
    return Math.max(10, Math.min(100, Math.round(numeric)));
};

// Создает сущность и возвращает результат клиенту.
export const createTopicBlock = (type = 'text') => {
    if (type === 'image') return { type: 'image', url: '', text: '', widthPercent: 50 };
    if (type === 'spacer') return { type: 'spacer', text: '', url: '' };
    if (type === 'h2') return { type: 'h2', text: '', url: '' };
    if (type === 'h3') return { type: 'h3', text: '', url: '' };
    return { type: 'text', text: '', url: '' };
};

// Приводит входные данные к единому безопасному формату.
const normalizeBlock = (block) => {
    const type = String(block?.type || '').trim().toLowerCase();
    if (!TOPIC_BLOCK_TYPES.includes(type)) return null;

    if (type === 'image') {
        return {
            type,
            url: String(block?.url || '').trim(),
            text: '',
            widthPercent: normalizeImageWidthPercent(block?.widthPercent)
        };
    }

    if (type === 'spacer') {
        return {
            type,
            text: '',
            url: ''
        };
    }

    return {
        type,
        text: String(block?.text || ''),
        url: ''
    };
};

// Возвращает нужные данные или вычисленное значение.
export const getTopicBlocksForEditor = (topicLike) => {
    const blocks = Array.isArray(topicLike?.contentBlocks)
        ? topicLike.contentBlocks
        : (Array.isArray(topicLike) ? topicLike : []);

    const normalized = blocks
        .map(normalizeBlock)
        .filter(Boolean);

    if (normalized.length > 0) return normalized;

    const legacy = String(topicLike?.content || '').trim();
    if (!legacy) return [];
    return [{ type: 'text', text: String(topicLike?.content || ''), url: '' }];
};

// Возвращает нужные данные или вычисленное значение.
export const getTopicBlockValidationErrors = (topicLike) => {
    const blocks = getTopicBlocksForEditor(topicLike);
    return blocks.map((block) => {
        if (block.type === 'spacer') return '';
        if (block.type === 'image') {
            return String(block.url || '').trim() ? '' : 'Добавьте изображение';
        }
        return String(block.text || '').trim() ? '' : 'Поле обязательно';
    });
};

// Проверяет наличие нужного состояния или признака.
export const hasTopicBlockValidationErrors = (topicLike) => {
    const errors = getTopicBlockValidationErrors(topicLike);
    return errors.some(Boolean);
};

// Определяет итоговое значение на основе входных данных.
export const resolveTopicAssetUrl = (url) => {
    const normalizedUrl = String(url || '').trim();
    if (!normalizedUrl) return '';
    if (
        normalizedUrl.startsWith('http://')
        || normalizedUrl.startsWith('https://')
        || normalizedUrl.startsWith('data:')
        || normalizedUrl.startsWith('blob:')
    ) {
        return normalizedUrl;
    }

    const apiBase = String(import.meta.env.VITE_API_URL || '');
    const serverBase = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
    return `${serverBase}${normalizedUrl}`;
};

// Возвращает нужные данные или вычисленное значение.
export const getTopicAssetUrlCandidates = (url) => {
    const normalizedUrl = String(url || '').trim();
    if (!normalizedUrl) return [];
    const candidates = [resolveTopicAssetUrl(normalizedUrl), normalizedUrl];

    const apiBase = String(import.meta.env.VITE_API_URL || '');
    const serverBase = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
    if (serverBase && normalizedUrl.startsWith('/')) {
        candidates.push(`${serverBase}${normalizedUrl}`);
    }

    return [...new Set(candidates.filter(Boolean))];
};
