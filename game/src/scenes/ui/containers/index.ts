import { globalAccess } from '~/utils/globalAccess'

import { UI } from '..'
import ActionHistoryContainer from './actionHistory'
import CardFocusInspectionContainer from './cardFocusInspection'
import CardSelectionContainer from './cardSelection'
import CardSelectionDarkOverlayContainer from './cardSelectionDarkOverlay'
import CheatsContainer from './cheats'
import ConquestConclusionCoverContainer from './conquestConclusionCoverContainer'
import ConquestRewardCardContainer from './conquestRewardCard'
import ConquestSummaryContainer from './conquestSummary'
import ConquestVSCoverContainer from './conquestVSCoverContainer'
import DarkenCoverContainer from './darkenCover'
import DebugContainer from './debug'
import DeckSidebarsContainer from './deckSidebars'
import DialogContainer from './dialog'
import DraftMockupContainer from './draftMockup'
import EmoteRingContainer from './emoteRing'
import EndMatchContinueButtonContainer from './endMatchContinueButton'
import EndTurnButtonContainer from './endTurnButton'
import ErrorsContainer from './errors'
import FireworksContainer from './fireworks'
import GameContainer from './game'
import GameOptionsContainer from './gameOptions'
import GraphicsOptionsContainer from './graphicsOptions'
import HUDContainer from './hud'
import InteractionCoverContainer from './interactionCover'
import MatchEndContinueContainer from './matchEndContinue'
import MatchEndDefeatContainer from './matchEndDefeat'
import MatchEndReviewContainer from './matchEndReview'
import MatchEndTieContainer from './matchEndTie'
import MatchEndVictoryContainer from './matchEndVictory'
import OptionsContainer from './options'
import PlayerActionErrorContainer from './playerActionError'
import PreloadContainer from './preload'
import QuestsContainer from './quests'
import RandomTestsContainer from './randomTests'
import ReplayContainer from './replay'
import ReportContainer from './report'
import RewardCardContainer from './rewardCard'
import RewardConquestPointsContainer from './rewardConquestPoints'
import RewardHeroContainer from './rewardHero'
import RewardRankContainer from './rewardRank'
import RewardXPContainer from './rewardXP'
import SettingsContainer from './settings'
import ShareSpectateContainer from './shareSpectateContainer'
import SkyTagsContainer from './skyTags'
import SoundOptionsContainer from './soundOptions'
import SpecialMessageContainer from './SpecialMessage'
import SpectatorCountContainer from './spectatorCount'
import SpectatorStickersContainer from './spectatorStickers'
import SplashContainer from './splash'
import StarsAtNightCoverContainer from './starsAtNightCoverContainer'
import StatusIndicatorsContainer from './statusIndicators'
import TutorialContainer from './tutorial'
import TutorialChallengeFailContainer from './tutorialChallengeFail'
import TutorialPlayButtonContainer from './tutorialPlayButton'
import TutorialTitleContainer from './tutorialTitle'
import UIOptionsContainer from './uiOptions'
import VSContainer from './vs'
import WaitingForMatchContainer from './waitingForMatch'
import WhoseTurnContainer from './whoseTurn'

if (import.meta.hot) {
  function handleHMR(mod: any) {
    const newClass =
      mod.default as UIContainerConstructable<SupportedUIContainerNames>
    const oldClass = uiOrder.find(
      c => c.prototype.constructor.name === newClass.prototype.constructor.name
    )!
    let cName: SupportedUIContainerNames | undefined
    for (const key of Object.keys(
      UIContainerConstructors
    ) as SupportedUIContainerNames[]) {
      if (UIContainerConstructors[key] === oldClass) {
        cName = key
      }
    }
    if (cName) {
      //@ts-ignore
      UIContainerConstructors[cName] = newClass
      const shouldReopen = globalAccess.ui?.isContainerActive(cName)
      globalAccess.ui?.disposeContainer(cName)
      const i = uiOrder.indexOf(oldClass)
      if (i !== -1) {
        uiOrder.splice(i, 1, newClass)
      }
      if (shouldReopen) {
        const c = globalAccess.ui?.getContainer(cName)
        if (c) {
          c.ready.then(() => c.fadeIn())
        }
      }
    }
  }
  import.meta.hot.accept('./actionHistory', handleHMR)
  import.meta.hot.accept('./cardFocusInspection', handleHMR)
  import.meta.hot.accept('./cardSelection', handleHMR)
  import.meta.hot.accept('./cardSelectionDarkOverlay', handleHMR)
  import.meta.hot.accept('./cheats', handleHMR)
  import.meta.hot.accept('./conquestConclusionCoverContainer', handleHMR)
  import.meta.hot.accept('./conquestRewardCard', handleHMR)
  import.meta.hot.accept('./conquestSummary', handleHMR)
  import.meta.hot.accept('./conquestVSCoverContainer', handleHMR)
  import.meta.hot.accept('./darkenCover', handleHMR)
  import.meta.hot.accept('./debug', handleHMR)
  import.meta.hot.accept('./deckSidebars', handleHMR)
  import.meta.hot.accept('./dialog', handleHMR)
  import.meta.hot.accept('./draftMockup', handleHMR)
  import.meta.hot.accept('./emoteRing', handleHMR)
  import.meta.hot.accept('./endMatchContinueButton', handleHMR)
  import.meta.hot.accept('./endTurnButton', handleHMR)
  import.meta.hot.accept('./errors', handleHMR)
  import.meta.hot.accept('./fireworks', handleHMR)
  import.meta.hot.accept('./game', handleHMR)
  import.meta.hot.accept('./gameOptions', handleHMR)
  import.meta.hot.accept('./graphicsOptions', handleHMR)
  import.meta.hot.accept('./hud', handleHMR)
  import.meta.hot.accept('./interactionCover', handleHMR)
  import.meta.hot.accept('./matchEndContinue', handleHMR)
  import.meta.hot.accept('./matchEndDefeat', handleHMR)
  import.meta.hot.accept('./matchEndReview', handleHMR)
  import.meta.hot.accept('./matchEndTie', handleHMR)
  import.meta.hot.accept('./matchEndVictory', handleHMR)
  import.meta.hot.accept('./options', handleHMR)
  import.meta.hot.accept('./playerActionError', handleHMR)
  import.meta.hot.accept('./preload', handleHMR)
  import.meta.hot.accept('./quests', handleHMR)
  import.meta.hot.accept('./randomTests', handleHMR)
  import.meta.hot.accept('./replay', handleHMR)
  import.meta.hot.accept('./report', handleHMR)
  import.meta.hot.accept('./rewardCard', handleHMR)
  import.meta.hot.accept('./rewardConquestPoints', handleHMR)
  import.meta.hot.accept('./rewardHero', handleHMR)
  import.meta.hot.accept('./rewardRank', handleHMR)
  import.meta.hot.accept('./rewardXP', handleHMR)
  import.meta.hot.accept('./settings', handleHMR)
  import.meta.hot.accept('./shareSpectateContainer', handleHMR)
  import.meta.hot.accept('./skyTags', handleHMR)
  import.meta.hot.accept('./soundOptions', handleHMR)
  import.meta.hot.accept('./SpecialMessage', handleHMR)
  import.meta.hot.accept('./spectatorCount', handleHMR)
  import.meta.hot.accept('./spectatorStickers', handleHMR)
  import.meta.hot.accept('./splash', handleHMR)
  import.meta.hot.accept('./starsAtNightCoverContainer', handleHMR)
  import.meta.hot.accept('./statusIndicators', handleHMR)
  import.meta.hot.accept('./tutorial', handleHMR)
  import.meta.hot.accept('./tutorialChallengeFail', handleHMR)
  import.meta.hot.accept('./tutorialPlayButton', handleHMR)
  import.meta.hot.accept('./tutorialTitle', handleHMR)
  import.meta.hot.accept('./uiOptions', handleHMR)
  import.meta.hot.accept('./vs', handleHMR)
  import.meta.hot.accept('./waitingForMatch', handleHMR)
  import.meta.hot.accept('./whoseTurn', handleHMR)
}

type UIContainerConstructable<T extends SupportedUIContainerNames> = new (
  ui: UI,
  priority: number
) => UIContainerTypes[T]

const uiOrder: Array<UIContainerConstructable<SupportedUIContainerNames>> = [
  InteractionCoverContainer,
  DarkenCoverContainer,
  SplashContainer,
  DraftMockupContainer,
  GameContainer,
  EmoteRingContainer,
  CardSelectionDarkOverlayContainer,
  StarsAtNightCoverContainer,
  ConquestConclusionCoverContainer,
  ReplayContainer,
  ConquestVSCoverContainer,
  VSContainer,
  WhoseTurnContainer,
  TutorialTitleContainer,
  ActionHistoryContainer,
  SkyTagsContainer,
  DeckSidebarsContainer,
  CardSelectionContainer,
  PlayerActionErrorContainer,
  CardFocusInspectionContainer,
  EndTurnButtonContainer,
  QuestsContainer,
  CheatsContainer,
  SpectatorCountContainer,
  SpectatorStickersContainer,
  TutorialPlayButtonContainer,
  MatchEndReviewContainer,
  TutorialChallengeFailContainer,
  MatchEndDefeatContainer,
  MatchEndTieContainer,
  MatchEndVictoryContainer,
  ConquestSummaryContainer,
  RewardRankContainer,
  RewardConquestPointsContainer,
  FireworksContainer,
  RewardXPContainer,
  RewardCardContainer,
  ConquestRewardCardContainer,
  RewardHeroContainer,
  HUDContainer,
  TutorialContainer,
  MatchEndContinueContainer,
  RandomTestsContainer,
  SettingsContainer,
  OptionsContainer,
  GameOptionsContainer,
  SoundOptionsContainer,
  GraphicsOptionsContainer,
  UIOptionsContainer,
  ShareSpectateContainer,
  ReportContainer,
  DialogContainer,
  DebugContainer,
  EndMatchContinueButtonContainer,
  PreloadContainer,
  SpecialMessageContainer,
  WaitingForMatchContainer,
  StatusIndicatorsContainer,
  ErrorsContainer
]

export function getUIContainerOrder(
  klass: UIContainerConstructable<SupportedUIContainerNames>
) {
  const i = uiOrder.indexOf(klass)
  if (i === -1) {
    console.warn(
      `UIContainer Order Warning: ${klass.name} not found in uiOrder array! Using -1 by default`
    )
  }
  return i
}

// interface ContainerTypes {
//   [key: string]: UIContainer
// }

export interface UIContainerTypes {
  actionHistory: ActionHistoryContainer
  cardFocusInspection: CardFocusInspectionContainer
  cardSelection: CardSelectionContainer
  starsAtNightCover: StarsAtNightCoverContainer
  conquestConclusionCover: ConquestConclusionCoverContainer
  conquestRewardCard: ConquestRewardCardContainer
  conquestSummary: ConquestSummaryContainer
  conquestVSCover: ConquestVSCoverContainer
  darkenCover: DarkenCoverContainer
  draftMockup: DraftMockupContainer
  cardSelectionDarkOverlay: CardSelectionDarkOverlayContainer
  cheats: CheatsContainer
  debug: DebugContainer
  deckSidebars: DeckSidebarsContainer
  dialog: DialogContainer
  emoteRing: EmoteRingContainer
  endMatchContinueButton: EndMatchContinueButtonContainer
  endTurnButton: EndTurnButtonContainer
  spectatorCount: SpectatorCountContainer
  spectatorStickers: SpectatorStickersContainer
  tutorialPlayButton: TutorialPlayButtonContainer
  errors: ErrorsContainer
  fireworks: FireworksContainer
  game: GameContainer
  hud: HUDContainer
  interactionCover: InteractionCoverContainer
  matchEndContinue: MatchEndContinueContainer
  matchEndDefeat: MatchEndDefeatContainer
  matchEndReview: MatchEndReviewContainer
  matchEndVictory: MatchEndVictoryContainer
  matchEndTie: MatchEndTieContainer
  options: OptionsContainer
  soundOptions: SoundOptionsContainer
  gameOptions: GameOptionsContainer
  graphicsOptions: GraphicsOptionsContainer
  uiOptions: UIOptionsContainer
  report: ReportContainer
  preload: PreloadContainer
  playerActionError: PlayerActionErrorContainer
  quests: QuestsContainer
  randomTests: RandomTestsContainer
  replay: ReplayContainer
  rewardCard: RewardCardContainer
  rewardHero: RewardHeroContainer
  rewardRank: RewardRankContainer
  rewardConquestPoints: RewardConquestPointsContainer
  rewardXp: RewardXPContainer
  settings: SettingsContainer
  splash: SplashContainer
  shareSpectate: ShareSpectateContainer
  statusIndicators: StatusIndicatorsContainer
  tutorial: TutorialContainer
  tutorialTitle: TutorialTitleContainer
  tutorialChallengeFail: TutorialChallengeFailContainer
  vs: VSContainer
  whoseTurn: WhoseTurnContainer
  waitingForMatch: WaitingForMatchContainer
  skyTags: SkyTagsContainer
  specialMessage: SpecialMessageContainer
}

export type SupportedUIContainerNames = keyof UIContainerTypes

export const UIContainerConstructors: {
  [K in SupportedUIContainerNames]: UIContainerConstructable<K>
} = {
  actionHistory: ActionHistoryContainer,
  cardFocusInspection: CardFocusInspectionContainer,
  cardSelection: CardSelectionContainer,
  starsAtNightCover: StarsAtNightCoverContainer,
  conquestConclusionCover: ConquestConclusionCoverContainer,
  conquestRewardCard: ConquestRewardCardContainer,
  conquestSummary: ConquestSummaryContainer,
  conquestVSCover: ConquestVSCoverContainer,
  darkenCover: DarkenCoverContainer,
  draftMockup: DraftMockupContainer,
  cardSelectionDarkOverlay: CardSelectionDarkOverlayContainer,
  cheats: CheatsContainer,
  debug: DebugContainer,
  deckSidebars: DeckSidebarsContainer,
  dialog: DialogContainer,
  emoteRing: EmoteRingContainer,
  endMatchContinueButton: EndMatchContinueButtonContainer,
  endTurnButton: EndTurnButtonContainer,
  spectatorCount: SpectatorCountContainer,
  spectatorStickers: SpectatorStickersContainer,
  tutorialPlayButton: TutorialPlayButtonContainer,
  errors: ErrorsContainer,
  fireworks: FireworksContainer,
  game: GameContainer,
  hud: HUDContainer,
  interactionCover: InteractionCoverContainer,
  matchEndContinue: MatchEndContinueContainer,
  matchEndDefeat: MatchEndDefeatContainer,
  matchEndReview: MatchEndReviewContainer,
  matchEndVictory: MatchEndVictoryContainer,
  matchEndTie: MatchEndTieContainer,
  options: OptionsContainer,
  soundOptions: SoundOptionsContainer,
  gameOptions: GameOptionsContainer,
  graphicsOptions: GraphicsOptionsContainer,
  uiOptions: UIOptionsContainer,
  report: ReportContainer,
  preload: PreloadContainer,
  playerActionError: PlayerActionErrorContainer,
  quests: QuestsContainer,
  randomTests: RandomTestsContainer,
  replay: ReplayContainer,
  rewardCard: RewardCardContainer,
  rewardHero: RewardHeroContainer,
  rewardRank: RewardRankContainer,
  rewardConquestPoints: RewardConquestPointsContainer,
  rewardXp: RewardXPContainer,
  settings: SettingsContainer,
  shareSpectate: ShareSpectateContainer,
  splash: SplashContainer,
  statusIndicators: StatusIndicatorsContainer,
  tutorial: TutorialContainer,
  tutorialChallengeFail: TutorialChallengeFailContainer,
  tutorialTitle: TutorialTitleContainer,
  vs: VSContainer,
  whoseTurn: WhoseTurnContainer,
  waitingForMatch: WaitingForMatchContainer,
  skyTags: SkyTagsContainer,
  specialMessage: SpecialMessageContainer
}

for (const [key, val] of Object.entries(UIContainerConstructors) as Array<
  [
    string,
    (typeof UIContainerConstructors)[keyof typeof UIContainerConstructors]
  ]
>) {
  if (getUIContainerOrder(val) === -1) {
    throw new Error('Missing in uiOrder: ' + key)
  }
}
