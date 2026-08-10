import {
  i18nInit,
  isSupportedLanguage,
  LOCALE_LOCAL_STORAGE_KEY
} from '@opensky/language-manager'
import { questsI18nNamespaces } from '@opensky/quests'
import { initReactI18next } from 'react-i18next'

import env from '~/env'
import { getTimeAgoString } from '~/shared/helpers/get-time-ago-string'

const format: (value: any, format?: string, lng?: string) => string = (
  value,
  _format
) => {
  if (_format === 'timeAgo') {
    return getTimeAgoString(value)
  }

  if (_format === 'htmlTagStrong') {
    return `<strong>${value}</strong>`
  }

  if (_format === 'htmlTagSpanHighlight') {
    return `<span class="highlight">${value}</span>`
  }

  return value
}

const lang = localStorage.getItem(LOCALE_LOCAL_STORAGE_KEY) ?? 'en'

i18nInit({
  defaultNS: 'webapp',
  use: [initReactI18next],
  lng: isSupportedLanguage(lang) ? lang : 'en',
  format,
  version: env.GITCOMMIT,
  extraNS: [...questsI18nNamespaces]
})
