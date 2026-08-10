import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { ShaderMaterial } from 'three'

import { assignProps } from '~/utils/jsUtils'

import { FoilKitSettings } from './FoilKitSettings'
import FoilKitUniforms from './FoilKitUniforms'

export default class FoilKit {
  materials: ShaderMaterial[] = []
  settings: FoilKitSettings
  uniforms: FoilKitUniforms
  constructor(data?: any) {
    const settings = new FoilKitSettings()
    this.settings = settings
    if (data) {
      this.loadData(data)
    }
    const uniforms = new FoilKitUniforms()
    listenToProperty(
      settings,
      'foilBandWavelength',
      v => (uniforms.foilBandWavelength.value = v)
    )
    listenToProperty(
      settings,
      'foilOnArtFGOnly',
      v => (uniforms.foilOnArtOnly.value.x = v)
    )
    listenToProperty(
      settings,
      'foilOnArtBGOnly',
      v => (uniforms.foilOnArtOnly.value.y = v)
    )
    listenToProperty(
      settings,
      'foilOnFrameOnly',
      v => (uniforms.foilOnArtOnly.value.z = v)
    )
    listenToProperty(
      settings,
      'foilRGBSplit',
      v => (uniforms.foilRGBSplit.value = v)
    )
    listenToProperty(
      settings,
      'metalColorStrength',
      v => (uniforms.metalColorStrength.value = v)
    )
    listenToProperty(
      settings,
      'tiltShineSensitivity',
      v => (uniforms.tiltShineSensitivity.value = v)
    )
    this.uniforms = uniforms
  }
  loadData(data: any) {
    assignProps(this.settings, data)
  }
}
