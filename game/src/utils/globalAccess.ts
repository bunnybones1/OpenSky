import { delayPromise } from '@opensky/shared/utils/async'
import { getUrlFlag } from '@opensky/shared/utils/location'
import { Color, Uniform, Vector3 } from 'three'

import SkySystem from '../scenes/arena/Sky'
import { UI } from '../scenes/ui'

interface GlobalAccess {
  sky: SkySystem | undefined
  uiSkip: boolean
  ui: UI | undefined
  sunPosition: Uniform
  sunColor: Uniform
  sunBrightness: Uniform
  compositeMode?: 'streamer' | undefined
  hideShine: boolean
  overrideAndLockMetalShine: boolean
  useTrueArtistColorsOnCardArt: boolean
}

export const globalAccess: GlobalAccess = {
  sky: undefined,
  uiSkip: false,
  ui: undefined,
  sunPosition: new Uniform(new Vector3()),
  sunColor: new Uniform(new Color()),
  sunBrightness: new Uniform(5),
  hideShine: getUrlFlag('hideShine'),
  overrideAndLockMetalShine: false,
  useTrueArtistColorsOnCardArt: false
}

export async function onGlobalUiAccessReady() {
  while (!globalAccess.ui && !globalAccess.uiSkip) {
    await delayPromise(100)
  }
  return globalAccess.ui!
}
