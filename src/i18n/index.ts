import { translations, Language, TranslationKey } from './translations';

export function t(key: TranslationKey, lang: Language = 'pt-BR'): string {
  const table = translations[lang] || translations['pt-BR'];
  return (table as Record<string, string>)[key] || (translations['pt-BR'] as Record<string, string>)[key] || key;
}

export * from './translations';
