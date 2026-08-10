import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Points } from 'three'

import { buildParameters } from '~/utils/jsUtils'

import Geometry, { QuadraticPointGeometryParameters } from './Geometry'
import Material, { QuadraticPointMaterialParameters } from './Material'

export interface QuadraticPointsParameters {
  name: string
  speed: number
  geomOptions: Partial<QuadraticPointGeometryParameters>
  matOptions: Partial<QuadraticPointMaterialParameters>
}

const __defaultParams: QuadraticPointsParameters = {
  name: 'quadraticPoints',
  speed: 1,
  geomOptions: {},
  matOptions: {}
}

export default class QuadraticPoints extends Points<Geometry, [Material]> {
  params: QuadraticPointsParameters
  constructor(options: Partial<QuadraticPointsParameters>) {
    const params = buildParameters(__defaultParams, options)
    params.geomOptions.speed = params.matOptions.speed = params.speed //important that they stay the same across geometry and material
    const mat = new Material(params.matOptions)
    super(new Geometry(params.geomOptions), [mat])
    this.name = params.name
    this.geometry.name = params.name
    this.params = params
    this.frustumCulled = false
    listenToProperty(this.geometry, 'visible', v => {
      this.visible = v
    })
  }
}
