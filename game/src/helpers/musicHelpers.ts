import { MusicAssetName } from '@opensky/shared/assets'
import { musicVolume } from '@opensky/shared/userSettings'
import { audioLevelCurve } from '@opensky/shared/utils/math'
import { Howl } from 'howler'

import { getAssetsManager } from '~/assets'

import { userInteraction } from './userInteraction'

class MusicPlayer {
  private _currentSongName: MusicAssetName | undefined
  private get currentSongName(): MusicAssetName | undefined {
    return this._currentSongName
  }
  private set currentSongName(value: MusicAssetName | undefined) {
    if (this._currentSongName === value) {
      return
    }
    this._currentSongName = value

    if (value) {
      getAssetsManager()
        .loadAsset(value)
        .then(() => {
          userInteraction.then(() => {
            if (this._currentSongName === value) {
              this.currentSong = getAssetsManager().getAsset(value) as Howl
            }
          })
        })
    } else {
      this.currentSong = undefined
    }
  }
  private updatePlayingBehaviour() {
    this.currentSongName = this._volume > 0 ? this._desiredSongName : undefined
  }
  private _desiredSongName: MusicAssetName
  get desiredSongName(): MusicAssetName {
    return this._desiredSongName
  }
  set desiredSongName(value: MusicAssetName) {
    if (this._desiredSongName === value) {
      return
    }
    this._desiredSongName = value
    this.updatePlayingBehaviour()
  }
  private _currentSong: Howl | undefined
  private get currentSong(): Howl | undefined {
    return this._currentSong
  }
  private set currentSong(value: Howl | undefined) {
    if (this._currentSong === value) {
      return
    }

    if (this._currentSong) {
      const song = this._currentSong
      song.once('fade', () => song.stop())
      song.fade(audioLevelCurve(musicVolume.value), 0, 3000)
    }

    this._currentSong = value

    if (this._currentSong) {
      this._currentSong.play()
      this._currentSong.fade(0, audioLevelCurve(musicVolume.value), 2000)
    }
  }
  private _volume = 0
  get volume(): number {
    return this._volume
  }
  set volume(value: number) {
    if (this._volume === value) {
      return
    }
    this._volume = value
    this.updatePlayingBehaviour()
  }
}

let __musicPlayer: MusicPlayer | undefined
export function getMusicPlayer() {
  if (!__musicPlayer) {
    __musicPlayer = new MusicPlayer()
    musicVolume.listen(v => {
      __musicPlayer!.volume = v
    }, true)
  }
  return __musicPlayer
}
