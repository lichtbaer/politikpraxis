import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: localStorage.getItem('politikpraxis_lang') || 'de',
    fallbackLng: 'de',
    ns: ['common', 'game'],
    defaultNS: 'common',
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
    interpolation: { escapeValue: false },
    /** Bei fehlendem Key keinen Roh-Key anzeigen (z. B. "charEvents.mi_mi_wm_ee.title"), sondern leeren String. */
    parseMissingKeyHandler: () => '',
  });

export default i18n;
