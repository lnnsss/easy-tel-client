import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CHARACTER_ASSETS, CHARACTER_DEFAULTS, CHARACTER_FILE_ALIASES } from '../../constants/characterAssets';
import styles from './CharacterPreviewCard.module.css';

// Приводит входные данные к единому безопасному формату.
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

// Отрисовывает экран или компонент CharacterPreviewCard и связывает его с данными приложения.
const CharacterPreviewCard = ({ customization, editable = false }) => {
    const { t } = useTranslation();
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
                <h3 className={styles.title}>{t('pages.character.title')}</h3>
                {editable && (
                    <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => navigate('/character')}
                        aria-label={t('pages.character.edit')}
                        title={t('pages.character.edit')}
                    >
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M4 20h4l10-10-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="m12 6 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                )}
            </div>

            <div className={styles.previewRect}>
                {backgroundSrc && <img src={backgroundSrc} alt={t('pages.character.background_alt')} className={styles.backgroundLayer} />}
                <img src={bodySrc} alt={t('pages.character.body_alt')} className={styles.layer} />
                <img src={shoesSrc} alt={t('pages.character.shoes_alt')} className={styles.layer} />
                <img src={bottomSrc} alt={t('pages.character.bottom_alt')} className={styles.layer} />
                <img src={topSrc} alt={t('pages.character.top_alt')} className={styles.layer} />
                {config.headdressFile && <img src={headdressSrc} alt={t('pages.character.headdress_alt')} className={styles.layer} />}
            </div>
        </div>
    );
};

export default CharacterPreviewCard;
