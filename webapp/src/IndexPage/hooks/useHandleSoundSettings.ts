import { UserStorageKeys } from '@opensky/shared/constants'
import { useEffect } from 'react'
import { useSnapshot } from 'valtio'

import { SoundClient } from '~/shared/clients'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useUserStorage } from '~/shared/queries/useUserStorage'
import { soundState, updateSoundState } from '~/shared/state/sound-state'
import { uiState } from '~/shared/state/ui/ui-state'

export const useHandleSoundSettings = () => {
  const { data: authedAccount } = useAuthedAccount()
  const { data: soundSettings } = useUserStorage(UserStorageKeys.SOUND_SETTINGS)
  const { isManifestLoaded } = useSnapshot(uiState)

  useEffect(() => {
    if (!!soundSettings) {
      if (
        soundSettings.queue !== undefined &&
        soundSettings.queue !== soundState.queueVolume
      ) {
        updateSoundState('queueVolume', soundSettings.queue)
      }
      if (
        soundSettings.music !== undefined &&
        soundSettings.music !== soundState.musicVolume
      ) {
        updateSoundState('musicVolume', soundSettings.music)
      }
      if (
        soundSettings.interface !== undefined &&
        soundSettings.interface !== soundState.interfaceVolume
      ) {
        updateSoundState('interfaceVolume', soundSettings.interface)
      }
    }

    if (!!authedAccount?.address && !!isManifestLoaded && !SoundClient.isReady) {
      // eslint-disable-next-line no-console
      console.log('Initializing sound.')
      SoundClient.init()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManifestLoaded, soundSettings])
}
