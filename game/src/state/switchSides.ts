import { Player } from '@skyweaver/state-metadata'

import { gameMode, LocalGameMode } from '~/helpers/envGameModeHelpers'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import { __camSettings, cameraShaker } from '~/utils/cameraShaker'

import { store } from './index'
import StateRecorder from './StateRecorder'

export async function switchSides() {
  if (gameMode === LocalGameMode.SANDBOX) {
    await simpleTweener.to({
      description: 'island cam blend',
      target: { r: 0 },
      propertyGoals: { r: 1 },
      duration: 300,
      easing: Easing.Quadratic.InOut,
      onUpdate(_dt, progress) {
        cameraShaker.blendCamSettings(
          __camSettings.home,
          __camSettings.loading,
          progress
        )
      }
    }).finished

    await StateRecorder.quickSave()
      .then(s =>
        store.quickLoadSerializedGame(s, (1 - store.player!) as Player, -1)
      )
      .catch(() => {
        // no valid state to quicksave
      })

    await simpleTweener.to({
      description: 'island cam blend',
      target: { r: 0 },
      propertyGoals: { r: 1 },
      duration: 300,
      easing: Easing.Quadratic.Out,
      onUpdate(_dt, progress) {
        cameraShaker.blendCamSettings(
          __camSettings.loading,
          __camSettings.home,
          progress
        )
      }
    }).finished
  }
}
