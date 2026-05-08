import React, { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '../../stores/StoreContext';
import $api from '../../api/instance';
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
    headdress: 'headdressFile',
    background: 'backgroundFile'
};

const normalizeConfig = (raw = {}, assets = CHARACTER_ASSETS, defaults = CHARACTER_DEFAULTS) => {
    const safe = { ...defaults, ...(raw || {}) };

    const pickFromList = (value, list, fallback) => {
        const candidate = String(value || '').trim();
        if (list.includes(candidate)) return candidate;
        return fallback;
    };

    const gender = safe.gender === 'female' ? 'female' : 'male';
    const characterFile = pickFromList(safe.characterFile, assets.characters, assets.genderDefaults[gender]);

    return {
        gender,
        characterFile,
        shoesFile: pickFromList(safe.shoesFile, assets.shoes, defaults.shoesFile),
        bottomFile: pickFromList(safe.bottomFile, assets.bottom, defaults.bottomFile),
        topFile: pickFromList(safe.topFile, assets.top, defaults.topFile),
        headdressFile: pickFromList(safe.headdressFile, assets.headdress, defaults.headdressFile),
        backgroundFile: pickFromList(safe.backgroundFile, assets.backgrounds, defaults.backgroundFile)
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
    const [actionCategory, setActionCategory] = useState('');
    const [runtimeAssets, setRuntimeAssets] = useState(CHARACTER_ASSETS);
    const [runtimeDefaults, setRuntimeDefaults] = useState(CHARACTER_DEFAULTS);
    const [runtimeFreeItems, setRuntimeFreeItems] = useState(FREE_ITEMS_WHITELIST);
    const [runtimePrice, setRuntimePrice] = useState(ITEM_PRICE_COINS);
    const [runtimePaidCategories, setRuntimePaidCategories] = useState(PAID_CATEGORIES);

    const initialConfig = useMemo(
        () => normalizeConfig(authStore.user?.characterCustomization, runtimeAssets, runtimeDefaults),
        [authStore.user?.characterCustomization, runtimeAssets, runtimeDefaults]
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

    useEffect(() => {
        const loadAssets = async () => {
            try {
                const { data } = await $api.get('/auth/character-assets');
                if (data?.assets) setRuntimeAssets(data.assets);
                if (data?.defaults) setRuntimeDefaults(data.defaults);
                if (data?.freeItemsWhitelist) setRuntimeFreeItems(data.freeItemsWhitelist);
                if (Number.isFinite(Number(data?.itemPriceCoins))) setRuntimePrice(Number(data.itemPriceCoins));
                if (Array.isArray(data?.paidCategories)) setRuntimePaidCategories(data.paidCategories);
            } catch (_e) {
                // Fallback остается на статических значениях.
            }
        };
        loadAssets();
    }, []);

    const ownedCosmetics = authStore.user?.ownedCosmetics || {};
    const coins = Number(authStore.user?.coins) || 0;

    const equippedConfig = useMemo(
        () => normalizeConfig(authStore.user?.characterCustomization, runtimeAssets, runtimeDefaults),
        [authStore.user?.characterCustomization, runtimeAssets, runtimeDefaults]
    );

    const isOwnedOrFree = (category, file) => {
        const free = new Set(runtimeFreeItems[category] || []);
        if (free.has(file)) return true;
        const owned = new Set(Array.isArray(ownedCosmetics?.[category]) ? ownedCosmetics[category] : []);
        return owned.has(file);
    };

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

    const onToggleGender = async () => {
        let nextConfig = null;
        setConfig((prev) => {
            const nextGender = prev.gender === 'male' ? 'female' : 'male';
            const nextCharacter = runtimeAssets.genderDefaults[nextGender];
            nextConfig = {
                ...prev,
                gender: nextGender,
                characterFile: nextCharacter
            };
            return nextConfig;
        });
        setLayerKeys((prev) => ({ ...prev, characterFile: prev.characterFile + 1 }));
        if (!nextConfig) return;
        await authStore.updateCharacterCustomization(nextConfig);
    };

    const onPurchase = async (category, file) => {
        setActionCategory(category);
        const result = await authStore.purchaseCharacterItem(category, file);
        setActionCategory('');

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
            message: `Вы купили «${getFileLabel(file)}» за ${runtimePrice} монет`,
            variant: 'success',
            primaryLabel: 'Закрыть',
            secondaryLabel: 'Закрыть'
        });
    };

    const onWear = async (category) => {
        setActionCategory(category);
        const result = await authStore.updateCharacterCustomization(config);
        setActionCategory('');

        if (result.success) return;

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
        const isEquipped = equippedConfig[field] === file;
        const busy = actionCategory === category;

        const actionLabel = !owned ? `${runtimePrice} монет` : (isEquipped ? 'Надето' : 'Надеть');
        const actionDisabled = busy || (!owned && coins < runtimePrice) || (owned && isEquipped);
        const onAction = !owned
            ? () => onPurchase(category, file)
            : () => onWear(category);

        return (
            <div className={styles.group}>
                <div className={styles.groupLabel}>{title}: {getFileLabel(file)}</div>
                <div className={styles.controlsRow}>
                    <div className={styles.rowBtns}>
                        <button type="button" onClick={() => onCycle(field, list, -1)}>◀</button>
                        <button type="button" onClick={() => onCycle(field, list, 1)}>▶</button>
                    </div>
                    <button
                        type="button"
                        className={styles.buyBtn}
                        onClick={onAction}
                        disabled={actionDisabled}
                    >
                        {busy ? '...' : actionLabel}
                    </button>
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

                    {runtimePaidCategories.includes('background') && renderPaidControl('background', 'Фон', 'backgroundFile', runtimeAssets.backgrounds)}

                    {runtimePaidCategories.includes('headdress') && renderPaidControl('headdress', 'Головной убор', 'headdressFile', runtimeAssets.headdress)}
                    {runtimePaidCategories.includes('top') && renderPaidControl('top', 'Верхняя одежда', 'topFile', runtimeAssets.top)}
                    {runtimePaidCategories.includes('bottom') && renderPaidControl('bottom', 'Штаны', 'bottomFile', runtimeAssets.bottom)}
                    {runtimePaidCategories.includes('shoes') && renderPaidControl('shoes', 'Обувь', 'shoesFile', runtimeAssets.shoes)}
                </div>
            </div>
        </div>
    );
});

export default CharacterPage;
