import { Device } from '@capacitor/device';

export let translationsDictionary: any = {};
export let dynamicTranslationsDictionary: any = {};

export let translationsLanguage: string;

export class Translations {
  static SUPPORTED_LANGUAGES = ['en', 'es'];
  static DEFAULT_LANGUAGE = 'es';

  constructor() {
    translationsLanguage = Translations.DEFAULT_LANGUAGE;
  }

  async initialize(): Promise<void> {
    try {
      const languageCode = (await Device.getLanguageCode()).value;
      if (languageCode) {
        const lang = languageCode.split('-')[0];
        const langSuffix = Translations.SUPPORTED_LANGUAGES.includes(lang)
          ? lang
          : Translations.DEFAULT_LANGUAGE;

        const { translations: localTranslations } = await import(
          `src/translations/translations.${langSuffix}`
        );

        const { dynamicTranslations: localDynamicTranslations } = await import(
          `src/translations/dynamic-translations.${langSuffix}`
        );

        translationsLanguage = langSuffix;
        translationsDictionary = { ...localTranslations };
        dynamicTranslationsDictionary = { ...localDynamicTranslations };
      }
    } catch (e) {
      console.error('Error initializing translations:', e);
    }
  }
}

export const translations = new Proxy<{ [key: string]: string }>({}, {
  get: (obj, prop) => {
    if (prop in translationsDictionary) return translationsDictionary[prop];

    setTimeout(() => {
      throw new Error(`Translation not found ${String(prop)}`);
    });

    return '';
  },
});

export const getDynamicTranslation = (text: string): string => {
  return dynamicTranslationsDictionary[text] || text;
};

export const getTranslationsLanguage = () => translationsLanguage;
