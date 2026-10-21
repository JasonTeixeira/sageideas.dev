'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { defaultLocale, type Locale } from '@/lib/i18n/config'
import type { Messages } from '@/lib/i18n/messages'

interface LocaleContextValue {
  locale: Locale
  messages: Messages
}

const LocaleContext = createContext<LocaleContextValue>({ locale: defaultLocale, messages: {} })

export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale
  messages: Messages
  children: ReactNode
}) {
  return <LocaleContext.Provider value={{ locale, messages }}>{children}</LocaleContext.Provider>
}

/** The active locale, available to any client component under the provider. */
export function useLocale(): Locale {
  return useContext(LocaleContext).locale
}

/** Translate a source (English) string in the active locale; falls back to the source. */
export function useT(): (source: string) => string {
  const { messages } = useContext(LocaleContext)
  return (source: string) => messages[source] ?? source
}
