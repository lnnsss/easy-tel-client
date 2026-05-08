export const CHARACTER_ASSETS = {
    genderDefaults: {
        male: 'Алмаз.png',
        female: 'Алсу.png'
    },
    characters: ['Алмаз.png', 'Алсу.png'],
    shoes: ['Найки.png', 'Тимбы.png', 'Баленси XXL.png', 'Доктор Мартинс.png', 'Базовая.png', 'Базовые.png'],
    bottom: ['Спортивки.png', 'Как у фараона.png', 'Милашки треники.png', 'Свага джинсы.png', 'Рваные джинсы.png', 'Карго дефолт.png', 'Базовые.png'],
    top: ['Худи.png', 'Бомбер.png', 'Мамин свитер.png', 'Тишка Казань.png', 'Тишка йорик.png', 'Линейный свитер.png', 'Базовый.png', 'Базовая.png', 'Зелёнка.png'],
    headdress: ['Ушанка.png', 'Ай мачо хед.png', 'Кепка XXL.png', 'Тубетейка.png', 'Базовый.png'],
    backgrounds: ['__theme__', 'Шаляпин.png', 'Очпочмак.png', 'Сююмбике.png', 'Чаша.png', 'Кулшариф.png', 'Чак-чак.png']
};

export const ITEM_PRICE_COINS = 5;
export const PAID_CATEGORIES = ['shoes', 'bottom', 'top', 'headdress', 'background'];
export const FREE_ITEMS_WHITELIST = {
    shoes: ['Базовая.png'],
    bottom: ['Базовые.png'],
    top: ['Базовая.png'],
    headdress: ['Базовый.png'],
    background: ['__theme__']
};

export const CHARACTER_DEFAULTS = {
    gender: 'male',
    characterFile: 'Алмаз.png',
    shoesFile: 'Базовая.png',
    bottomFile: 'Базовые.png',
    topFile: 'Базовая.png',
    headdressFile: 'Базовый.png',
    backgroundFile: '__theme__'
};

export const getFileLabel = (fileName = '') => (
    String(fileName) === '__theme__'
        ? 'Базовый'
        : String(fileName).replace(/\.[^.]+$/, '')
);
