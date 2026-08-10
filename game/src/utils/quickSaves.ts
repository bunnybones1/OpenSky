import {
  getLocalStorageInt,
  setLocalStorageInt
} from '@opensky/shared/utils/localStorage'
import { Player } from '@skyweaver/state-metadata'

import { tutorialIntroductionPause } from '~/helpers/tutorialIntroductionPause'
import queryParams from '~/queryParams'
import { store } from '~/state'
import { setTutorial, Tutorial } from '~/tutorial/Tutorial'

import { globalAccess } from './globalAccess'

const slotBaseKey = 'serializedGameQuickSlot'

interface QuickSaveState {
  botDifficulty: number
  stateData: string
  gameMode: string
}

export function quickSave(slot: number, stateData: string, gameMode: string) {
  localStorage.setItem(
    slotBaseKey + slot,
    JSON.stringify({ stateData, gameMode })
  )
}

function quickLoad(slot: number) {
  const data = localStorage.getItem(slotBaseKey + slot)
  if (data) {
    return JSON.parse(data) as QuickSaveState
  } else {
    return null
  }
}

export function quickLoadFromQueryParams() {
  const player = Number.parseInt(queryParams.serializedGamePlayer() || '', 10)
  const maybeGame = quickLoad(queryParams.serializedGameQuickSlotSelector())
  if (maybeGame) {
    store.quickLoadSerializedGame(
      maybeGame.stateData,
      Number.isNaN(player) ? 0 : (player as Player),
      maybeGame.botDifficulty
    )
  } else {
    alert(
      'No quicksave data found in slot ' +
        queryParams.serializedGameQuickSlotSelector()
    )
  }
}
export async function quickStartTutorialFromQueryParams() {
  if (store.state) {
    store.state.state.status.type = 'WaitingForGameToStart'
  }
  if (queryParams.lethalPuzzleURL) {
    setTutorial(await Tutorial.loadLethalPuzzle(queryParams.lethalPuzzleURL))
    tutorialIntroductionPause.resolve()
  } else if (queryParams.tutorialLevel) {
    setTutorial(Tutorial.load(queryParams.tutorialLevel))
  } else {
    throw new Error('No lethal puzzle URL or tutorial level passed.')
  }
  if (globalAccess.ui!.hasContainer('tutorial')) {
    const tut = globalAccess.ui!.getContainer('tutorial')

    await tut.ready
    tut.helperCube.reset()
  }
  await store.startTutorialMatch(
    queryParams.lethalPuzzleURL
      ? {
          lethalPuzzleURL: queryParams.lethalPuzzleURL
        }
      : {
          level: queryParams.tutorialLevel!
        }
  )

  if (queryParams.lethalPuzzleURL) {
    const key = 'puzzle-tries-' + queryParams.lethalPuzzleURL
    const tries = getLocalStorageInt(key, 0)
    setLocalStorageInt(key, tries + 1)
  }
}
