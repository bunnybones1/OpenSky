import { DeckClass } from '@opensky/proto'
import { MatchmakerErrorReason } from '@opensky/shared/matchmaker-message-types'
import { proxy } from 'valtio'

import { MatchMakerStatus } from '~/clients/MatchMakerClient/shared/types'

export interface PlayState {
  selectedDeck?: string
  selectedHero?: DeckClass
  selectedConquestDeck?: string
  matchMakerStatus?: MatchMakerStatus
  matchMakerErrorReason?: MatchmakerErrorReason
  matchMakerCountDown?: number
}

const DEFAULT_PLAY_STATE: PlayState = {
  selectedDeck: undefined,
  selectedHero: undefined,
  matchMakerStatus: undefined,
  matchMakerErrorReason: undefined,
  matchMakerCountDown: undefined
}

export const playState = proxy<PlayState>(DEFAULT_PLAY_STATE)

export const updatePlayState = <T extends keyof PlayState>(
  key: T,
  value: PlayState[T]
) => {
  playState[key] = value
}

export const resetMatchMakerState = () => {
  playState.matchMakerStatus = undefined
  playState.matchMakerErrorReason = undefined
  playState.matchMakerCountDown = undefined
}
