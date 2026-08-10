import { GameMode } from '@opensky/proto'
import { useLayoutEffect } from 'react'

import { useStoredMatchInfo } from '~/shared/queries/play/useStoredMatchInfo'
import { playState, updatePlayState } from '~/shared/state/play-state'

export const useHandleStoredMatchInfo = () => {
  const { data: storedMatchInfo } = useStoredMatchInfo()

  useLayoutEffect(() => {
    if (!!storedMatchInfo?.lastPlayedDeckId) {
      if (
        storedMatchInfo?.gameMode === GameMode.CONQUEST_CONSTRUCTED &&
        playState.selectedConquestDeck !== storedMatchInfo.lastPlayedDeckId
      ) {
        updatePlayState('selectedConquestDeck', storedMatchInfo.lastPlayedDeckId)
      } else if (
        storedMatchInfo?.gameMode !== GameMode.CONQUEST_CONSTRUCTED &&
        playState.selectedDeck !== storedMatchInfo.lastPlayedDeckId
      ) {
        updatePlayState('selectedDeck', storedMatchInfo.lastPlayedDeckId)
      }
    }
    if (
      !!storedMatchInfo?.lastPlayedPrismClass &&
      playState.selectedHero !== storedMatchInfo.lastPlayedPrismClass
    ) {
      updatePlayState('selectedHero', storedMatchInfo.lastPlayedPrismClass)
    }
  }, [storedMatchInfo])
}
