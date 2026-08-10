import { artSheetDescription } from './art'
import { cardBacksSheetDescription } from './cardBacks'
import { cardsSheetDescription } from './cards'
import { crystalsSheetDescription } from './crystals'
import { heroSkinsSheetDescription } from './heroSkins'
import { questsSheetDescription } from './quests'
import { SheetDescription } from './types'
import { vocabSheetDescription } from './vocab'

export const sheets = {
  cards: cardsSheetDescription,
  art: artSheetDescription,
  vocab: vocabSheetDescription,
  quests: questsSheetDescription,
  crystals: crystalsSheetDescription,
  heroSkins: heroSkinsSheetDescription,
  cardBacks: cardBacksSheetDescription
} as const satisfies {
  [index: string]: SheetDescription<any, any>
}
