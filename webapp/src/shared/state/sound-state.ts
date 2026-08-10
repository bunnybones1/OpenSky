import { proxy } from 'valtio'

const DEFAULT_VOLUME = 50

import { SoundClient } from '../clients'

export interface SoundState {
  interfaceVolume: number
  musicVolume: number
  queueVolume: number
}

const DEFAULT_SOUND_STATE: SoundState = {
  interfaceVolume: DEFAULT_VOLUME,
  musicVolume: DEFAULT_VOLUME,
  queueVolume: DEFAULT_VOLUME
}

export const soundState = proxy<SoundState>(DEFAULT_SOUND_STATE)

export const updateSoundState = <T extends keyof SoundState>(
  key: T,
  value: SoundState[T]
) => {
  soundState[key] = value
  SoundClient.updateVolume(key, value)
}
