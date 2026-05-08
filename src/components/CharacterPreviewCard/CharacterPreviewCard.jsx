import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CHARACTER_DEFAULTS } from '../../constants/characterAssets';
import styles from './CharacterPreviewCard.module.css';

const normalizeConfig = (raw = {}) => {
    const safe = { ...CHARACTER_DEFAULTS, ...(raw || {}) };

    return {
        gender: safe.gender === 'female' ? 'female' : 'male',
        characterFile: String(safe.characterFile || CHARACTER_DEFAULTS.characterFile).trim(),
        shoesFile: String(safe.shoesFile || CHARACTER_DEFAULTS.shoesFile).trim(),
        bottomFile: String(safe.bottomFile || CHARACTER_DEFAULTS.bottomFile).trim(),
        topFile: String(safe.topFile || CHARACTER_DEFAULTS.topFile).trim(),
        headdressFile: String(safe.headdressFile || CHARACTER_DEFAULTS.headdressFile).trim(),
        backgroundFile: String(safe.backgroundFile || CHARACTER_DEFAULTS.backgroundFile).trim()
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
                <img src={headdressSrc} alt="Головной убор" className={styles.layer} />
            </div>
        </div>
    );
};

export default CharacterPreviewCard;
