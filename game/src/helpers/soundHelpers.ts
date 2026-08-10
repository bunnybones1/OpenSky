import {
  AudioSpriteAssetName,
  baseSpriteForVariations,
  VariationAudioSpriteAssetName
} from '@opensky/shared/assets'
import { sfxVolume } from '@opensky/shared/userSettings'
import { audioLevelCurve } from '@opensky/shared/utils/math'
import { Howl } from 'howler'

import { getAssetsManager } from '~/assets'
import queryParams from '~/queryParams'
import { playRawAudioFx } from '~/userSettings'

import { getMusicPlayer } from './musicHelpers'

const __perSoundThrottleRegistry: Set<string> = new Set()
const __loopingSoundRegistry: Map<string, number> = new Map()
const __loopingSoundStopTimeoutRegistry: Map<string, NodeJS.Timeout> = new Map()
const __orderedVariationRegistry: Map<
  string,
  { lastPlayed: number; timeout: NodeJS.Timeout }
> = new Map()

type RawSoundCallbacks = Array<() => void>
const __rawSoundLibraryLoadingCallbacks = new Map<string, RawSoundCallbacks>()
const __rawSoundLibrary = new Map<string, Howl>()
const __rawVariationCounts = new Map<string, number>()
const RAW_AUDIO_FIRST_TIME_DELAY = 200

const THROTTLE_TIMEOUT = 10

export const playSound = (library: AudioSpriteAssetName, id: string) => {
  const key = `${library}:${id}`
  const audioSprite = getAssetsManager().maybeGetAsset(library)

  if (!audioSprite) {
    console.warn(
      `Tried to play sound ${id} from not-loaded audio library ${library}`
    )
    return
  }

  if (__perSoundThrottleRegistry.has(key)) {
    return
  }

  __perSoundThrottleRegistry.add(key)
  setTimeout(() => {
    __perSoundThrottleRegistry.delete(key)
  }, THROTTLE_TIMEOUT)

  if (playRawAudioFx.value) {
    if (!__rawSoundLibrary.has(key)) {
      if (!__rawSoundLibraryLoadingCallbacks.has(key)) {
        const loadingRawSound = getAssetsManager().load(
          'sound',
          `game/audio/fx/raw/${library
            .replace('audioFx', '')
            .toLowerCase()}/${id}.wav`
        )
        const callbacks: RawSoundCallbacks = [() => playSound(library, id)]
        loadingRawSound.then(rawSound => {
          rawSound.on('load', () => {
            setTimeout(() => {
              __rawSoundLibrary.set(key, rawSound)
              for (const cb of callbacks) {
                cb()
              }
            }, RAW_AUDIO_FIRST_TIME_DELAY)
          })
          rawSound.load()
        })
        __rawSoundLibraryLoadingCallbacks.set(key, callbacks)
        return
      } else {
        __rawSoundLibraryLoadingCallbacks
          .get(key)!
          .push(() => playSound(library, id))
        return
      }
    } else {
      __rawSoundLibrary.get(key)!.play()
    }
  } else {
    audioSprite.play(id)
  }

  if (queryParams.debugSound) {
    console.log(`Sound: ${key}`)
  }
}

export const changeLoopVolume = (
  library: AudioSpriteAssetName,
  id: string,
  newVolume: number
) => {
  const key = `${library}:${id}`
  const audioSprite = getAssetsManager().getAsset(library)

  const adjustedNewVolume = audioLevelCurve(sfxVolume.value * newVolume)

  if (!audioSprite) {
    return
  }

  if (!__loopingSoundRegistry.has(key)) {
    return
  }
  const audioId = __loopingSoundRegistry.get(key)!

  if (playRawAudioFx.value) {
    const audioLoop = __rawSoundLibrary.get(key)!
    const currentVolume = audioLoop.volume(audioId) as number
    audioLoop.fade(currentVolume, adjustedNewVolume, 500, audioId)
  } else {
    const currentVolume = audioSprite.volume(audioId) as number
    audioSprite.fade(currentVolume, adjustedNewVolume, 500, audioId)
  }

  if (queryParams.debugSound) {
    console.log(`ChangeLoopVolume: ${key}`)
  }
}

export const playSoundLoop = (
  library: AudioSpriteAssetName,
  id: string,
  fadeDuration = 1000,
  targetVolume = 1
) => {
  const key = `${library}:${id}`
  const audioSprite = getAssetsManager().getAsset(library)

  const adjustedTargetVolume = audioLevelCurve(sfxVolume.value * targetVolume)

  if (!audioSprite) {
    return
  }

  if (__loopingSoundRegistry.has(key)) {
    if (__loopingSoundStopTimeoutRegistry.has(key)) {
      const timeoutId = __loopingSoundStopTimeoutRegistry.get(key)!
      clearTimeout(timeoutId)
      __loopingSoundStopTimeoutRegistry.delete(key)

      const audioId = __loopingSoundRegistry.get(key)!
      if (playRawAudioFx.value) {
        const rawAudio = __rawSoundLibrary.get(key)!
        const currentVolume = rawAudio.volume(audioId) as number
        rawAudio.fade(
          currentVolume,
          adjustedTargetVolume,
          fadeDuration,
          audioId
        )
      } else {
        const currentVolume = audioSprite.volume(audioId) as number
        audioSprite.fade(
          currentVolume,
          adjustedTargetVolume,
          fadeDuration,
          audioId
        )
      }
    }
    return
  }

  if (playRawAudioFx.value) {
    if (!__rawSoundLibrary.has(key)) {
      if (!__rawSoundLibraryLoadingCallbacks.has(key)) {
        const loadingRawSound = getAssetsManager().load(
          'sound',
          `game/audio/fx/raw/${library
            .replace('audioFx', '')
            .toLowerCase()}/${id}.wav`
        )
        const callbacks: RawSoundCallbacks = [() => playSoundLoop(library, id)]
        loadingRawSound.then(rawSound => {
          rawSound.on('load', () => {
            setTimeout(() => {
              __rawSoundLibrary.set(key, rawSound)
              for (const cb of callbacks) {
                cb()
              }
            }, RAW_AUDIO_FIRST_TIME_DELAY)
          })
          rawSound.load()
        })
        __rawSoundLibraryLoadingCallbacks.set(key, callbacks)
      } else {
        __rawSoundLibraryLoadingCallbacks
          .get(key)!
          .push(() => playSoundLoop(library, id))
      }
    } else {
      const rawAudio = __rawSoundLibrary.get(key)!
      const audioId = rawAudio.play()
      rawAudio.loop(true, audioId)
      rawAudio.fade(0, adjustedTargetVolume, fadeDuration, audioId)

      __loopingSoundRegistry.set(key, audioId)
    }
  } else {
    const audioId = audioSprite.play(id)
    audioSprite.loop(true, audioId)
    audioSprite.fade(0, adjustedTargetVolume, fadeDuration, audioId)
    __loopingSoundRegistry.set(key, audioId)
  }
  if (queryParams.debugSound) {
    console.log(`StartSoundLoop: ${key}`)
  }
}

export const stopSoundLoop = (
  library: AudioSpriteAssetName,
  id: string,
  fadeDuration = 1000
) => {
  const key = `${library}:${id}`
  const audioSprite = getAssetsManager().getAsset(library)

  if (!audioSprite) {
    return
  }

  if (playRawAudioFx.value) {
    if (!__rawSoundLibrary.has(key)) {
      if (__rawSoundLibraryLoadingCallbacks.has(key)) {
        __rawSoundLibraryLoadingCallbacks.get(key)!.length = 0
      }
    } else {
      if (__loopingSoundRegistry.has(key)) {
        const audioLoop = __rawSoundLibrary.get(key)!
        const audioId = __loopingSoundRegistry.get(key)!
        const currentVolume = audioLoop.volume(audioId) as number
        audioLoop.fade(currentVolume, 0, 1000, audioId)
        const timeoutId = setTimeout(() => {
          audioLoop.stop(audioId)
          __loopingSoundStopTimeoutRegistry.delete(key)
          __loopingSoundRegistry.delete(key)
        }, fadeDuration)

        __loopingSoundStopTimeoutRegistry.set(key, timeoutId)

        if (queryParams.debugSound) {
          console.log(`StopSoundLoop: ${key}`)
        }
      }
    }
  } else {
    if (__loopingSoundRegistry.has(key)) {
      const audioId = __loopingSoundRegistry.get(key)!
      const currentVolume = audioSprite.volume(audioId) as number
      audioSprite.fade(currentVolume, 0, 1000, audioId)

      setTimeout(() => {
        audioSprite.stop(audioId)
      }, fadeDuration)

      __loopingSoundRegistry.delete(key)

      if (queryParams.debugSound) {
        console.log(`StopSoundLoop: ${key}`)
      }
    }
  }
}

export function changeMusicToMatchEndSong(
  musicType: 'musicVictory' | 'musicDefeat'
) {
  getMusicPlayer().desiredSongName = musicType
}

function playSoundVariation(
  library: VariationAudioSpriteAssetName,
  id: string,
  number: number
) {
  const key = `${library}:${id}_${number}`
  const audioSprite = getAssetsManager().maybeGetAsset(library)

  if (__perSoundThrottleRegistry.has(key)) {
    return
  }

  __perSoundThrottleRegistry.add(key)
  setTimeout(() => {
    __perSoundThrottleRegistry.delete(key)
  }, THROTTLE_TIMEOUT)

  if (number === 0 || !audioSprite) {
    // if we haven't loaded variations yet, start loading them,
    // and play the non-variation version
    if (!audioSprite) {
      getAssetsManager().loadAsset(library)
    }
    const baseSpriteName = baseSpriteForVariations(library)
    playSound(baseSpriteName, id)
    return
  }

  const name = `${id}_${`${number}`.padStart(2, '0')}`

  if (playRawAudioFx.value) {
    if (!__rawSoundLibrary.has(key)) {
      if (!__rawSoundLibraryLoadingCallbacks.has(key)) {
        const loadingRawSound = getAssetsManager().load(
          'sound',
          `game/audio/fx/raw/${baseSpriteForVariations(library)
            .replace('audioFx', '')
            .toLowerCase()}/${id}/${name}.wav`
        )
        const callbacks: RawSoundCallbacks = [() => playSound(library, id)]
        loadingRawSound.then(rawSound => {
          rawSound.on('load', () => {
            setTimeout(() => {
              __rawSoundLibrary.set(key, rawSound)
              for (const cb of callbacks) {
                cb()
              }
            }, RAW_AUDIO_FIRST_TIME_DELAY)
          })
          rawSound.load()
        })
        __rawSoundLibraryLoadingCallbacks.set(key, callbacks)
        return
      } else {
        __rawSoundLibraryLoadingCallbacks
          .get(key)!
          .push(() => playSound(library, id))
        return
      }
    } else {
      __rawSoundLibrary.get(key)!.play()
    }
    return
  }

  audioSprite.play(name)

  if (queryParams.debugSound) {
    console.log(`Sound: ${key}`)
  }
}

async function getRawSoundVariationCount(
  library: VariationAudioSpriteAssetName,
  id: string
): Promise<number> {
  const baseKey = `${library}:${id}`
  const rawCounts = __rawVariationCounts.get(baseKey)
  if (rawCounts !== undefined) {
    return rawCounts
  }
  let number = 0
  let loadedSuccessfully = true
  while (loadedSuccessfully) {
    number += 1
    const key = `${baseKey}_${number}`
    if (
      !__rawSoundLibrary.has(key) &&
      !__rawSoundLibraryLoadingCallbacks.has(key)
    ) {
      const name = `${id}_${`${number}`.padStart(2, '0')}`

      let failRes: (x: false) => void
      const fail = new Promise<false>(resolve => {
        failRes = resolve
      })
      const loadingRawSound = getAssetsManager().load(
        'sound',
        `game/audio/fx/raw/${baseSpriteForVariations(library)
          .replace('audioFx', '')
          .toLowerCase()}/${id}/${name}.wav`,
        undefined,
        undefined,
        () => failRes(false),
        1
      )
      const finish = loadingRawSound.then(
        (rawSound: Howl) =>
          new Promise<boolean>(resolve => {
            rawSound.on('load', () => {
              __rawSoundLibrary.set(key, rawSound)
              resolve(true)
            })
            rawSound.on('loaderror', () => resolve(false))
            rawSound.load()
          })
      )
      loadedSuccessfully = await Promise.race([fail, finish])
      if (!loadedSuccessfully) {
        number -= 1
      }
    }
  }
  __rawVariationCounts.set(baseKey, number)
  return number
}

export async function playRandomSoundVariation(
  library: VariationAudioSpriteAssetName,
  id: string
) {
  let number = 0
  let variations = 0
  const audioSprite = getAssetsManager().maybeGetAsset(library)
  if (playRawAudioFx.value) {
    variations = await getRawSoundVariationCount(library, id)
    if (variations === 0) {
      console.error(`No variations in audio library ${library} for id ${id}.`)
      return
    }
  } else if (audioSprite) {
    variations = audioSprite.variations[id]
    if (variations === 0) {
      console.error(`No variations in audio library ${library} for id ${id}.`)
      return
    }
  }

  number = Math.floor(Math.random() * (variations + 1))
  playSoundVariation(library, id, number)
}

export async function playOrderedSoundVariation(
  library: VariationAudioSpriteAssetName,
  id: string,
  timeout: number = 3000,
  restartAfterLast: boolean = false
) {
  const key = `${library}:${id}`
  let number = 0
  let variations = 0
  const audioSprite = getAssetsManager().maybeGetAsset(library)
  if (audioSprite) {
    variations = audioSprite.variations[id]
    if (variations === 0) {
      console.error(`No variations in audio library ${library} for id ${id}.`)
      return
    }
  } else if (playRawAudioFx.value) {
    variations = await getRawSoundVariationCount(library, id)
    if (variations === 0) {
      console.error(`No variations in audio library ${library} for id ${id}.`)
      return
    }
  }

  const registry = __orderedVariationRegistry.get(key)
  if (registry) {
    clearTimeout(registry.timeout)
    number = registry.lastPlayed + 1
    if (restartAfterLast) {
      number %= variations + 1
    } else {
      number = Math.min(number, variations)
    }
  }
  const newRegistry = {
    lastPlayed: number,
    timeout: setTimeout(() => {
      __orderedVariationRegistry.delete(key)
    }, timeout)
  }
  __orderedVariationRegistry.set(key, newRegistry)
  playSoundVariation(library, id, number)
}

export function resetOrderedSoundVariation(
  library: VariationAudioSpriteAssetName,
  id: string
) {
  const key = `${library}:${id}`
  const registry = __orderedVariationRegistry.get(key)
  if (registry) {
    clearTimeout(registry.timeout)
    __orderedVariationRegistry.delete(key)
  }
}
