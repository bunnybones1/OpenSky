import { SUBKEY_CERT_KEY, SUBKEY_KEY } from '@opensky/shared/subkey'

import { gameMode, isOnlineGame } from '~/helpers/envGameModeHelpers'
import queryParams from '~/queryParams'
import { store } from '~/state'
import StateRecorder from '~/state/StateRecorder'
import { takeAction } from '~/systems/input/StateInteractions'

import { NamedJob } from './jsUtils'
import {
  changeUrlParamAndReload,
  changeUrlParamWithoutReload
} from './location'
import { quickLoadFromQueryParams } from './quickSaves'

export const stateUtils: NamedJob[] = [
  new NamedJob('Save this game state', StateRecorder.download),
  new NamedJob('Load a game state', () => {
    try {
      const url = window.prompt('Enter the URL to the game JSON') || ''
      new URL(url)
      changeUrlParamWithoutReload('mode', '')
      changeUrlParamAndReload('serializedGameURL', url)
    } catch {
      window.alert('Invalid URL!')
    }
  }),
  new NamedJob('Switch Sides (RESET TO LAST LOAD)', () => {
    changeUrlParamWithoutReload(
      'serializedGamePlayer',
      queryParams.serializedGamePlayer() === '0' ? '1' : '0'
    )
    quickLoadFromQueryParams()
  }),
  new NamedJob('crash the game >:)', () => {
    takeAction({
      type: 'Cheat',
      cheats: [{ type: 'CrashGame' }]
    })
  }),
  new NamedJob('Force sync ECS with worker state', () => {
    store.connectECSToState()
  }),
  new NamedJob('Force multiplayer reconnect', () => {
    store.forceReconnect()
  }),
  new NamedJob('Load current match as replay', () => {
    if (!isOnlineGame) {
      console.warn(
        "Tried to load current game as replay, but we're in game mode",
        gameMode
      )
      return
    }
    if (!store.isGameOver) {
      console.warn(
        "Tried to load current game as replay, but game isn't over, so we shouldn't redirect yet."
      )
      return
    }
    window.location.href = `${window.location.hostname}${window.location.pathname}?mode=REPLAY&replayMatchID=${store.matchID}&replayID=${store.replayID}`
  }),
  new NamedJob('Load an arbitrary replay', () => {
    const matchID = prompt('Enter a match ID')
    if (matchID === null) {
      return
    }
    const replayID = prompt('Enter its replay code')
    if (replayID === null) {
      return
    }

    window.location.href = `${window.location.hostname}${
      window.location.pathname
    }?mode=REPLAY&replayMatchID=${matchID.trim()}&replayID=${replayID.trim()}`
  }),
  new NamedJob('Set JWT (will break your login session)', () => {
    const jwt = prompt(
      'Enter OpenSky JWT',
      window.localStorage.getItem('_opensky.api.jwt') ?? ''
    )
    if (jwt !== null) {
      window.localStorage.setItem('_opensky.api.jwt', jwt)
    }
  }),
  new NamedJob('wipe subkey', () => {
    localStorage.removeItem(SUBKEY_CERT_KEY)
    localStorage.removeItem(SUBKEY_KEY)
  })
]
