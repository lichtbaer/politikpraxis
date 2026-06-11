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
    // escapeValue: false ist korrekt für React — JSX escaped alle Werte automatisch.
    // WICHTIG: Niemals User-Input direkt in Übersetzungskeys interpolieren;
    // bei dangerouslySetInnerHTML mit t()-Werten muss DOMPurify verwendet werden.
    interpolation: { escapeValue: false },
    /**
     * Fehlende Keys: in Produktion leerer String statt Roh-Key
     * (z. B. "charEvents.mi_mi_wm_ee.title"). Im Dev-Modus loggen und den
     * Key anzeigen, damit fehlende Übersetzungen nicht unbemerkt bleiben.
     */
    parseMissingKeyHandler: import.meta.env.DEV
      ? (key: string) => {
          console.warn(`i18n: fehlender Übersetzungskey "${key}"`);
          return key;
        }
      : () => '',
  });

export default i18n;
