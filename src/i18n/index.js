import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ru from './locales/ru.json';
import tt from './locales/tt.json';

export const INTERFACE_LANG_KEY = 'interface_lang';

const supported = ['ru', 'tt'];
const saved = typeof window !== 'undefined' ? String(localStorage.getItem(INTERFACE_LANG_KEY) || '').trim() : '';
const initialLang = supported.includes(saved) ? saved : 'ru';

if (typeof window !== 'undefined' && !saved) {
  localStorage.setItem(INTERFACE_LANG_KEY, initialLang);
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      tt: { translation: tt }
    },
    lng: initialLang,
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false
    },
    returnNull: false
  });

export default i18n;
