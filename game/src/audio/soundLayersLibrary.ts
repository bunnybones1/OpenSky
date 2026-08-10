import SoundLayer from './SoundLayer'

type SoundLayerSettings = {
  loop: string
  start: string
  end: string
}

const magicGlowBase: SoundLayerSettings = {
  loop: 'HoverTarget',
  start: '',
  end: ''
}

const magicGlowHarm: SoundLayerSettings = {
  loop: 'HighlightHov',
  start: '',
  end: ''
}

let __magicGlowBaseSoundLayer: SoundLayer | undefined
export function getMagicGlowBaseSoundLayer() {
  if (!__magicGlowBaseSoundLayer) {
    __magicGlowBaseSoundLayer = new SoundLayer(
      magicGlowBase.loop,
      magicGlowBase.start,
      magicGlowBase.end
    )
  }
  return __magicGlowBaseSoundLayer
}

let __magicExtraSound: SoundLayer | undefined
export function getExtraMagicSoundLayer() {
  if (!__magicExtraSound) {
    __magicExtraSound = new SoundLayer(
      magicGlowHarm.loop,
      magicGlowHarm.start,
      magicGlowHarm.end
    )
    __magicExtraSound.listenForPlaying((isPlaying: boolean) => {
      if (isPlaying) {
        __magicGlowBaseSoundLayer!.addMuter(__magicExtraSound)
      } else {
        __magicGlowBaseSoundLayer!.removeMuter(__magicExtraSound)
      }
    })
  }

  return __magicExtraSound
}
