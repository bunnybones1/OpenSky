import '@opensky/language-manager'

import { CommonI18nResources, i18n, TFunction } from '@opensky/language-manager'
import { QuestsI18nResources } from '@opensky/quests'

import * as webapp from '../locales/en/webapp.json'

declare module '@opensky/language-manager' {
  interface CustomTypeOptions {
    defaultNS: 'webapp'
    resources: {
      webapp: typeof webapp
    } & CommonI18nResources &
      QuestsI18nResources
  }
}

declare module 'react-i18next' {
  function useTranslation(): {
    t: TFunction
    i18n: typeof i18n
  }
}
