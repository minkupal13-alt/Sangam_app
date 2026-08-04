import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { hi } from './locales/hi';
import { en } from './locales/en';
import { bn } from './locales/bn';
import { ta } from './locales/ta';
import { te } from './locales/te';
import { mr } from './locales/mr';
import { gu } from './locales/gu';
import { kn } from './locales/kn';
import { pa } from './locales/pa';
import { ur } from './locales/ur';
import { es } from './locales/es';
import { ar } from './locales/ar';
import { fr } from './locales/fr';
import { de } from './locales/de';
import { ja } from './locales/ja';
import { ko } from './locales/ko';
import { zh } from './locales/zh';
import { pt } from './locales/pt';
import { ru } from './locales/ru';
import { it } from './locales/it';

export const LANGUAGES = [
  { code: 'hi', name: 'हिन्दी', englishName: 'Hindi', flag: '🇮🇳', dir: 'ltr' },
  { code: 'en', name: 'English', englishName: 'English', flag: '🇺🇸', dir: 'ltr' },
  { code: 'bn', name: 'বাংলা', englishName: 'Bengali', flag: '🇧🇩', dir: 'ltr' },
  { code: 'ta', name: 'தமிழ்', englishName: 'Tamil', flag: '🇮🇳', dir: 'ltr' },
  { code: 'te', name: 'తెలుగు', englishName: 'Telugu', flag: '🇮🇳', dir: 'ltr' },
  { code: 'mr', name: 'मराठी', englishName: 'Marathi', flag: '🇮🇳', dir: 'ltr' },
  { code: 'gu', name: 'ગુજરાતી', englishName: 'Gujarati', flag: '🇮🇳', dir: 'ltr' },
  { code: 'kn', name: 'ಕನ್ನಡ', englishName: 'Kannada', flag: '🇮🇳', dir: 'ltr' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', englishName: 'Punjabi', flag: '🇮🇳', dir: 'ltr' },
  { code: 'ur', name: 'اردو', englishName: 'Urdu', flag: '🇵🇰', dir: 'rtl' },
  { code: 'ar', name: 'العربية', englishName: 'Arabic', flag: '🇸🇦', dir: 'rtl' },
  { code: 'es', name: 'Español', englishName: 'Spanish', flag: '🇪🇸', dir: 'ltr' },
  { code: 'fr', name: 'Français', englishName: 'French', flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', englishName: 'German', flag: '🇩🇪', dir: 'ltr' },
  { code: 'ja', name: '日本語', englishName: 'Japanese', flag: '🇯🇵', dir: 'ltr' },
  { code: 'ko', name: '한국어', englishName: 'Korean', flag: '🇰🇷', dir: 'ltr' },
  { code: 'zh', name: '中文', englishName: 'Chinese', flag: '🇨🇳', dir: 'ltr' },
  { code: 'pt', name: 'Português', englishName: 'Portuguese', flag: '🇧🇷', dir: 'ltr' },
  { code: 'ru', name: 'Русский', englishName: 'Russian', flag: '🇷🇺', dir: 'ltr' },
  { code: 'it', name: 'Italiano', englishName: 'Italian', flag: '🇮🇹', dir: 'ltr' },
];

export function getLangDir(lang: string): 'ltr' | 'rtl' {
  const found = LANGUAGES.find((l) => l.code === lang);
  return (found?.dir as 'ltr' | 'rtl') || 'ltr';
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      hi: { translation: hi },
      en: { translation: en },
      bn: { translation: bn },
      ta: { translation: ta },
      te: { translation: te },
      mr: { translation: mr },
      gu: { translation: gu },
      kn: { translation: kn },
      pa: { translation: pa },
      ur: { translation: ur },
      es: { translation: es },
      ar: { translation: ar },
      fr: { translation: fr },
      de: { translation: de },
      ja: { translation: ja },
      ko: { translation: ko },
      zh: { translation: zh },
      pt: { translation: pt },
      ru: { translation: ru },
      it: { translation: it },
    },
    fallbackLng: 'hi',
    supportedLngs: LANGUAGES.map((l) => l.code),
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'sangam_lang',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export function setLanguage(lang: string) {
  i18n.changeLanguage(lang);
  const dir = getLangDir(lang);
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
  localStorage.setItem('sangam_lang', lang);
}

const currentLang = i18n.language || 'hi';
document.documentElement.dir = getLangDir(currentLang);
document.documentElement.lang = currentLang;

export default i18n;
