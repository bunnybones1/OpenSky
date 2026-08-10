/* eslint-disable no-console */
import { Howl } from 'howler'
import { sample } from 'lodash-es'

import { AssetClient } from '~/shared/clients'
import { captureError } from '~/shared/helpers/sentry'
import { soundState } from '~/shared/state/sound-state'

import {
  InterfaceKeyArray,
  MusicKeyArray,
  MusicKeys,
  QueueKeys,
  SpriteKeys
} from './types'

export class _SoundClient_DONT_USE_DIRECTLY {
  private InterfaceHowl: Howl | undefined = undefined
  private QueueHowl: Howl | undefined = undefined
  private MusicHowl: Howl | undefined = undefined

  isReady: boolean = false

  public init = async () => {
    if (this.isReady) return
    try {
      if (!AssetClient.manifest) {
        throw new Error(
          'Tried to get sprite config before asset manifest was loaded.'
        )
      }
      const configUrl = AssetClient.getAssetUrl('webapp/audio/webapp.json')

      const config = await fetch(configUrl)
        .then((res) => res.json())
        .catch(() => null)

      if (!config) {
        throw new Error('Unable to fetch webapp sprite config.')
      }

      const urls = config.urls.map((url) => AssetClient.getAssetUrl(url))

      const musicHowl = new Howl({
        sprite: {
          Music2: config.sprite.Music2,
          Music1A: config.sprite.Music1A,
          Music1B: config.sprite.Music1B,
          Music5: config.sprite.Music5
        },
        src: urls,
        volume: soundState.musicVolume / 100
      })

      // Only await loading the music files, since subsequent
      // request to them should be served from the cache.
      const urlsLoaded = await new Promise((resolve) => {
        musicHowl.on('load', () => resolve(true))
        musicHowl.on('loaderror', () => resolve(false))
      })

      if (urlsLoaded) {
        this.MusicHowl = musicHowl

        this.QueueHowl = new Howl({
          sprite: {
            MatchFound: config.sprite.MatchFound
          },
          src: urls,
          volume: soundState.queueVolume / 100
        })

        delete config.sprite.MatchFound
        delete config.sprite.Music2
        delete config.sprite.Music1A
        delete config.sprite.Music1B
        delete config.sprite.Music5

        this.InterfaceHowl = new Howl({
          sprite: config.sprite,
          src: urls,
          volume: soundState.interfaceVolume / 100
        })

        this.isReady = true

        const musicKeyToPlay = sample(MusicKeyArray)

        if (!!musicKeyToPlay) {
          this.MusicHowl.play(musicKeyToPlay)
        }
        console.log('Sound initialized!')
      } else {
        throw new Error('Unable to load howl urls.')
      }
    } catch (error) {
      console.log('Unable to initialize sound.')
      captureError(error, 'Failed to initialize audio.', false, true)
    }
  }

  public playSound = (key: SpriteKeys) => {
    if (!this.isReady) return

    if (key === 'MatchFound') {
      if (!!this.QueueHowl) {
        this.QueueHowl.play(key)
      }
    } else if (MusicKeyArray.includes(key as MusicKeys)) {
      if (!!this.MusicHowl) {
        this.MusicHowl.stop()
        this.MusicHowl.play(key)
      }
    } else if (
      InterfaceKeyArray.includes(key as Exclude<SpriteKeys, MusicKeys | QueueKeys>)
    ) {
      if (!!this.InterfaceHowl) {
        this.InterfaceHowl.play(key)
      }
    }
  }

  public updateVolume = (
    key: 'queueVolume' | 'musicVolume' | 'interfaceVolume',
    value: number
  ) => {
    const volumeValue = value / 100
    if (key === 'interfaceVolume' && !!this.InterfaceHowl) {
      this.InterfaceHowl.volume(volumeValue)
    }
    if (key === 'musicVolume' && !!this.MusicHowl) {
      this.MusicHowl.volume(volumeValue)
    }
    if (key === 'queueVolume' && !!this.QueueHowl) {
      this.QueueHowl.volume(volumeValue)
    }
  }
}
