import { defaultLocale, type Locale } from './config'
import en from './messages/en.json'
import es from './messages/es.json'
import zh from './messages/zh.json'
import hi from './messages/hi.json'
import ar from './messages/ar.json'
import pt from './messages/pt.json'
import fr from './messages/fr.json'
import ja from './messages/ja.json'
import de from './messages/de.json'
import ru from './messages/ru.json'
import { clientMessagesForLocale } from './client-catalog.mjs'

export type Messages = Record<string, string>

const CATALOGS: Record<Locale, Messages> = { en, es, zh, hi, ar, pt, fr, ja, de, ru }

/** The message catalog for a locale (en is the source + fallback). */
export function getMessages(locale: Locale): Messages {
  return CATALOGS[locale] ?? CATALOGS[defaultLocale]
}

/** English source strings are already the translation keys, so serializing the
 * complete English catalog into every client payload is redundant. */
export function getClientMessages(locale: Locale): Messages {
  return clientMessagesForLocale(locale, defaultLocale, getMessages(locale))
}

/** Translate a source (English) string via the active catalog; falls back to the source. */
export function translate(messages: Messages, source: string): string {
  return messages[source] ?? source
}
