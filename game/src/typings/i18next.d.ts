import '@opensky/language-manager'

import { CommonI18nResources } from '@opensky/language-manager'
import { QuestsI18nResources } from '@opensky/quests'

import * as game from '../../locales/en/game.json'

declare module '@opensky/language-manager' {
  interface CustomTypeOptions {
    defaultNS: 'game'
    resources: {
      game: typeof game
    } & CommonI18nResources &
      QuestsI18nResources
  }
}
