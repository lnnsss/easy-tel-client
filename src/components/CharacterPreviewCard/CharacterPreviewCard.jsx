import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CHARACTER_ASSETS, CHARACTER_DEFAULTS, CHARACTER_FILE_ALIASES } from '../../constants/characterAssets';
import styles from './CharacterPreviewCard.module.css';

const normalizeConfig = (raw = {}) => {
    const safe = { ...CHARACTER_DEFAULTS, ...(raw || {}) };

    const normalizeFile = (value, allowed, fallback) => {
        const candidateRaw = String(value || '').trim();
        const candidate = CHARACTER_FILE_ALIASES[candidateRaw] || candidateRaw;
        if (allowed.includes(candidate)) return candidate;
        return fallback;
    };

    return {
        gender: safe.gender === 'female' ? 'female' : 'male',
        characterFile: normalizeFile(safe.characterFile, CHARACTER_ASSETS.characters, CHARACTER_DEFAULTS.characterFile),
        shoesFile: normalizeFile(safe.shoesFile, CHARACTER_ASSETS.shoes, CHARACTER_DEFAULTS.shoesFile),
        bottomFile: normalizeFile(safe.bottomFile, CHARACTER_ASSETS.bottom, CHARACTER_DEFAULTS.bottomFile),
        topFile: normalizeFile(safe.topFile, CHARACTER_ASSETS.top, CHARACTER_DEFAULTS.topFile),
        headdressFile: normalizeFile(safe.headdressFile, CHARACTER_ASSETS.headdress, CHARACTER_DEFAULTS.headdressFile),
        backgroundFile: normalizeFile(safe.backgroundFile, CHARACTER_ASSETS.backgrounds, CHARACTER_DEFAULTS.backgroundFile)
    };
};

const CharacterPreviewCard = ({ customization, editable = false }) => {
    const navigate = useNavigate();
    const config = useMemo(() => normalizeConfig(customization), [customization]);

    const backgroundSrc = config.backgroundFile === '__theme__' ? '' : `/customize/backgrounds/${config.backgroundFile}`;
    const bodySrc = `/customize/characters/${config.characterFile}`;
    const shoesSrc = `/customize/shoes/${config.shoesFile}`;
    const bottomSrc = `/customize/bottom/${config.bottomFile}`;
    const topSrc = `/customize/top/${config.topFile}`;
    const headdressSrc = `/customize/headdress/${config.headdressFile}`;

    return (
        <div className={styles.card}>
            <div className={styles.headRow}>
                <h3 className={styles.title}>Персонаж</h3>
                {editable && (
                    <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => navigate('/character')}
                        aria-label="Редактировать персонажа"
                        title="Редактировать персонажа"
                    >
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M4 20h4l10-10-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="m12 6 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                )}
            </div>

            <div className={styles.previewRect}>
                {backgroundSrc && <img src={backgroundSrc} alt="Фон" className={styles.backgroundLayer} />}
                <img src={bodySrc} alt="Тело" className={styles.layer} />
                <img src={shoesSrc} alt="Обувь" className={styles.layer} />
                <img src={bottomSrc} alt="Штаны" className={styles.layer} />
                <img src={topSrc} alt="Верхняя одежда" className={styles.layer} />
                {config.headdressFile && <img src={headdressSrc} alt="Головной убор" className={styles.layer} />}
            </div>
        </div>
    );
};

export default CharacterPreviewCard;
