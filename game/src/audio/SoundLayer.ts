import {
  changeLoopVolume,
  playSound,
  playSoundLoop,
  stopSoundLoop
} from '~/helpers/soundHelpers'

export default class SoundLayer {
  private _isPlayingCallbacks: Array<(isPlaying: boolean) => void> = []
  listenForPlaying(callback: (isPlaying: boolean) => void) {
    this._isPlayingCallbacks.push(callback)
  }
  private _wantsToPlayCallbacks: Array<(isPlaying: boolean) => void> = []
  listenForWantsToPlay(callback: (wantsToPlay: boolean) => void) {
    this._wantsToPlayCallbacks.push(callback)
  }
  private _playing: boolean
  private get playing(): boolean {
    return this._playing
  }
  private set playing(value: boolean) {
    if (this._playing === value) {
      return
    }
    if (value) {
      playSoundLoop('audioFxCommon', this._loopName)
    } else {
      stopSoundLoop('audioFxCommon', this._loopName)
    }

    this._playing = value

    for (const cb of this._isPlayingCallbacks) {
      cb(value)
    }
  }
  private _updatePlaying() {
    this.playing = this.shouldPlay && !this.muted
  }
  private _muted: boolean
  private _shouldPlay: boolean
  private get shouldPlay(): boolean {
    return this._shouldPlay
  }
  private set shouldPlay(value: boolean) {
    if (this._shouldPlay === value) {
      return
    }
    for (const cb of this._wantsToPlayCallbacks) {
      cb(value)
    }
    this._shouldPlay = value
    if (!this._muted) {
      if (value && this._startName) {
        playSound('audioFxCommon', this._startName)
      } else if (!value && this._endName) {
        playSound('audioFxCommon', this._endName)
      }
    }
    this._updatePlaying()
  }
  private get muted(): boolean {
    return this._muted
  }
  private set muted(value: boolean) {
    this._muted = value
    this._updatePlaying()
  }
  constructor(
    private _loopName: string,
    private _startName?: string,
    private _endName?: string
  ) {
    //
  }
  private _soundLoopRequesters = 0
  private _muters: Set<any> = new Set()
  addMuter(val: any) {
    this._muters.add(val)
    this.muted = this._muters.size > 0
  }
  removeMuter(val: any) {
    this._muters.delete(val)
    this.muted = this._muters.size > 0
  }
  private get soundLoopRequesters() {
    return this._soundLoopRequesters
  }
  private set soundLoopRequesters(value) {
    if (value > 0 && this._soundLoopRequesters === 0) {
      this.shouldPlay = true
    } else if (value === 0) {
      this.shouldPlay = false
    }
    this._soundLoopRequesters = value
  }
  getController() {
    let shouldBePlaying = false
    let lastAmt = 0
    return (amt: number) => {
      if (amt === lastAmt) {
        return
      }
      const goingUp = lastAmt < amt
      lastAmt = amt

      if (shouldBePlaying && amt < 1 && !goingUp) {
        shouldBePlaying = false
        this.soundLoopRequesters--
      } else if (!shouldBePlaying && amt > 0 && goingUp) {
        this.soundLoopRequesters++
        shouldBePlaying = true
      }
    }
  }
}

void changeLoopVolume
