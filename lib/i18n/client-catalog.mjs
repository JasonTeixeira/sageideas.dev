export function clientMessagesForLocale(locale, defaultLocale, messages) {
  return locale === defaultLocale ? {} : messages
}
