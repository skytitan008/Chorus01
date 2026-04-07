import en from './translations/en.json';
import zh from './translations/zh.json';

export type Lang = 'en' | 'zh';

const translations: Record<Lang, Record<string, unknown>> = { en, zh };

export function getLangFromUrl(url: URL): Lang {
  const seg = url.pathname.split('/')[1];
  if (seg === 'zh') return 'zh';
  return 'en';
}

export function t(lang: Lang, key: string): string {
  const parts = key.split('.');
  let current: unknown = translations[lang];
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return key;
    current = (current as Record<string, unknown>)[part];
  }
  if (typeof current === 'string') return current;
  return key;
}

export function tRaw(lang: Lang, key: string): unknown {
  const parts = key.split('.');
  let current: unknown = translations[lang];
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/** URL prefix for a given lang: '' for en, '/zh' for zh */
export function langPrefix(lang: Lang): string {
  return lang === 'zh' ? '/zh' : '';
}

/** Build the alternate-language URL */
export function getAlternateUrl(url: URL): string {
  const lang = getLangFromUrl(url);
  const path = url.pathname;
  if (lang === 'zh') {
    // /zh/blog/slug/ → /blog/slug/
    return path.replace(/^\/zh(\/|$)/, '/$1').replace(/^\/\//, '/');
  }
  // /blog/slug/ → /zh/blog/slug/
  return '/zh' + (path.startsWith('/') ? path : '/' + path);
}

export function getAlternateLang(lang: Lang): Lang {
  return lang === 'en' ? 'zh' : 'en';
}
