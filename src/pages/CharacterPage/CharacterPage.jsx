import React, { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '../../stores/StoreContext';
import {
    CHARACTER_ASSETS,
    CHARACTER_DEFAULTS,
    FREE_ITEMS_WHITELIST,
    ITEM_PRICE_COINS,
    PAID_CATEGORIES,
    getFileLabel
} from '../../constants/characterAssets';
import styles from './CharacterPage.module.css';

const CATEGORY_FIELD_MAP = {
    shoes: 'shoesFile',
    bottom: 'bottomFile',
    top: 'topFile',
    headdress: 'headdressFile'
};

const normalizeConfig = (raw = {}) => {
    const safe = { ...CHARACTER_DEFAULTS, ...(raw || {}) };

    const pickFromList = (value, list, fallback) => {
        const candidate = String(value || '').trim();
        if (list.includes(candidate)) return candidate;
        return fallback;
    };

    const gender = safe.gender === 'female' ? 'female' : 'male';
    const characterFile = pickFromList(safe.characterFile, CHARACTER_ASSETS.characters, CHARACTER_ASSETS.genderDefaults[gender]);

    return {
        gender,
        characterFile,
        shoesFile: pickFromList(safe.shoesFile, CHARACTER_ASSETS.shoes, CHARACTER_DEFAULTS.shoesFile),
        bottomFile: pickFromList(safe.bottomFile, CHARACTER_ASSETS.bottom, CHARACTER_DEFAULTS.bottomFile),
        topFile: pickFromList(safe.topFile, CHARACTER_ASSETS.top, CHARACTER_DEFAULTS.topFile),
        headdressFile: pickFromList(safe.headdressFile, CHARACTER_ASSETS.headdress, CHARACTER_DEFAULTS.headdressFile),
        backgroundFile: pickFromList(safe.backgroundFile, CHARACTER_ASSETS.backgrounds, CHARACTER_DEFAULTS.backgroundFile)
    };
};

const nextInList = (list, current, dir = 1) => {
    if (!Array.isArray(list) || list.length === 0) return current;
    const idx = Math.max(0, list.indexOf(current));
    const nextIdx = (idx + dir + list.length) % list.length;
    return list[nextIdx];
};

const CharacterPage = observer(() => {
    const { authStore, uiStore } = useStores();
    const [saving, setSaving] = useState(false);
    const [buyingCategory, setBuyingCategory] = useState('');

    const initialConfig = useMemo(
        () => normalizeConfig(authStore.user?.characterCustomization),
        [authStore.user?.characterCustomization]
    );

    const [config, setConfig] = useState(initialConfig);
    const [layerKeys, setLayerKeys] = useState({
        characterFile: 0,
        shoesFile: 0,
        bottomFile: 0,
        topFile: 0,
        headdressFile: 0,
        backgroundFile: 0
    });

    useEffect(() => {
        setConfig(initialConfig);
    }, [initialConfig]);

    const ownedCosmetics = authStore.user?.ownedCosmetics || {};
    const coins = Number(authStore.user?.coins) || 0;

    const isOwnedOrFree = (category, file) => {
        const free = new Set(FREE_ITEMS_WHITELIST[category] || []);
        if (free.has(file)) return true;
        const owned = new Set(Array.isArray(ownedCosmetics?.[category]) ? ownedCosmetics[category] : []);
        return owned.has(file);
    };

    const getStatusLabel = (category, file) => {
        if ((FREE_ITEMS_WHITELIST[category] || []).includes(file)) return 'Бесплатно';
        if (isOwnedOrFree(category, file)) return 'Куплено';
        return `${ITEM_PRICE_COINS} монет`;
    };

    const hasUnownedSelection = PAID_CATEGORIES.some((category) => {
        const field = CATEGORY_FIELD_MAP[category];
        return !isOwnedOrFree(category, config[field]);
    });

    const bodySrc = `/customize/characters/${config.characterFile}`;
    const shoesSrc = `/customize/shoes/${config.shoesFile}`;
    const bottomSrc = `/customize/bottom/${config.bottomFile}`;
    const topSrc = `/customize/top/${config.topFile}`;
    const headdressSrc = `/customize/headdress/${config.headdressFile}`;
    const backgroundSrc = config.backgroundFile === '__theme__'
        ? ''
        : `/customize/backgrounds/${config.backgroundFile}`;

    const onCycle = (field, list, dir) => {
        setConfig((prev) => ({
            ...prev,
            [field]: nextInList(list, prev[field], dir)
        }));
        setLayerKeys((prev) => ({ ...prev, [field]: prev[field] + 1 }));
    };

    const onToggleGender = () => {
        setConfig((prev) => {
            const nextGender = prev.gender === 'male' ? 'female' : 'male';
            const nextCharacter = CHARACTER_ASSETS.genderDefaults[nextGender];
            return {
                ...prev,
                gender: nextGender,
                characterFile: nextCharacter
            };
        });
        setLayerKeys((prev) => ({ ...prev, characterFile: prev.characterFile + 1 }));
    };

    const onPurchase = async (category, file) => {
        setBuyingCategory(category);
        const result = await authStore.purchaseCharacterItem(category, file);
        setBuyingCategory('');

        if (!result.success) {
            uiStore.showModal({
                title: 'Ошибка',
                message: result.message,
                variant: 'error',
                primaryLabel: 'Закрыть',
                secondaryLabel: 'Закрыть'
            });
            return;
        }

        uiStore.showModal({
            title: 'Покупка успешна',
            message: `Вы купили «${getFileLabel(file)}» за ${ITEM_PRICE_COINS} монет`,
            variant: 'success',
            primaryLabel: 'Закрыть',
            secondaryLabel: 'Закрыть'
        });
    };

    const onSave = async () => {
        setSaving(true);
        const result = await authStore.updateCharacterCustomization(config);
        setSaving(false);

        if (result.success) {
            uiStore.showModal({
                title: 'Готово',
                message: 'Образ персонажа сохранен',
                variant: 'success',
                primaryLabel: 'Закрыть',
                secondaryLabel: 'Закрыть'
            });
            return;
        }

        uiStore.showModal({
            title: 'Ошибка',
            message: result.message,
            variant: 'error',
            primaryLabel: 'Закрыть',
            secondaryLabel: 'Закрыть'
        });
    };

    const renderPaidControl = (category, title, field, list) => {
        const file = config[field];
        const owned = isOwnedOrFree(category, file);
        const canBuy = !owned && coins >= ITEM_PRICE_COINS && buyingCategory !== category;

        return (
            <div className={styles.group}>
                <div className={styles.groupLabel}>{title}: {getFileLabel(file)}</div>
                <div className={styles.controlsRow}>
                    <div className={styles.rowBtns}>
                        <button type="button" onClick={() => onCycle(field, list, -1)}>◀</button>
                        <button type="button" onClick={() => onCycle(field, list, 1)}>▶</button>
                    </div>
                    {!owned && (
                        <button
                            type="button"
                            className={styles.buyBtn}
                            onClick={() => onPurchase(category, file)}
                            disabled={!canBuy}
                        >
                            {buyingCategory === category ? 'Покупка...' : `Купить (${ITEM_PRICE_COINS})`}
                        </button>
                    )}
                </div>
                <div className={styles.metaRow}>
                    <span className={styles.statusBadge}>{getStatusLabel(category, file)}</span>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <div className={styles.previewWrap}>
                    <div className={styles.previewRect}>
                        {backgroundSrc && (
                            <img
                                key={`bg-${layerKeys.backgroundFile}-${config.backgroundFile}`}
                                src={backgroundSrc}
                                alt="Фон"
                                className={`${styles.backgroundLayer} ${styles.layerFade}`}
                            />
                        )}
                        <img key={`body-${layerKeys.characterFile}-${config.characterFile}`} src={bodySrc} alt="Тело" className={`${styles.layer} ${styles.layerFade}`} />
                        <img key={`shoes-${layerKeys.shoesFile}-${config.shoesFile}`} src={shoesSrc} alt="Обувь" className={`${styles.layer} ${styles.layerFade}`} />
                        <img key={`bottom-${layerKeys.bottomFile}-${config.bottomFile}`} src={bottomSrc} alt="Штаны" className={`${styles.layer} ${styles.layerFade}`} />
                        <img key={`top-${layerKeys.topFile}-${config.topFile}`} src={topSrc} alt="Верхняя одежда" className={`${styles.layer} ${styles.layerFade}`} />
                        <img key={`head-${layerKeys.headdressFile}-${config.headdressFile}`} src={headdressSrc} alt="Головной убор" className={`${styles.layer} ${styles.layerFade}`} />
                    </div>
                </div>

                <div className={styles.controls}>
                    <div className={styles.coinsLine}>Монеты: <strong>{coins}</strong></div>

                    <button type="button" className={styles.genderBtn} onClick={onToggleGender}>
                        Пол: {config.gender === 'male' ? 'Мужской' : 'Женский'}
                    </button>

                    <div className={styles.group}>
                        <div className={styles.groupLabel}>Фон: {getFileLabel(config.backgroundFile)}</div>
                        <div className={styles.rowBtns}>
                            <button type="button" onClick={() => onCycle('backgroundFile', CHARACTER_ASSETS.backgrounds, -1)}>◀</button>
                            <button type="button" onClick={() => onCycle('backgroundFile', CHARACTER_ASSETS.backgrounds, 1)}>▶</button>
                        </div>
                    </div>

                    {renderPaidControl('headdress', 'Головной убор', 'headdressFile', CHARACTER_ASSETS.headdress)}
                    {renderPaidControl('top', 'Верхняя одежда', 'topFile', CHARACTER_ASSETS.top)}
                    {renderPaidControl('bottom', 'Штаны', 'bottomFile', CHARACTER_ASSETS.bottom)}
                    {renderPaidControl('shoes', 'Обувь', 'shoesFile', CHARACTER_ASSETS.shoes)}

                    <button type="button" className={styles.saveBtn} onClick={onSave} disabled={saving || hasUnownedSelection}>
                        {saving ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                    {hasUnownedSelection && <div className={styles.hint}>Купите выбранные вещи, чтобы сохранить образ</div>}
                </div>
            </div>
        </div>
    );
});

export default CharacterPage;
