import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Mesh } from 'three'

import { buildParameters } from '~/utils/jsUtils'

import Geometry, { QuadraticRibbonGeometryParameters } from './Geometry'
import Material, { QuadraticRibbonsMaterialParameters } from './Material'

export interface QuadraticRibbonsMeshOptions {
  name: string
  total: number
  speed: number
  trianglesPerRibbon: number
  matOptions: Partial<QuadraticRibbonsMaterialParameters>
  geomOptions: Partial<QuadraticRibbonGeometryParameters>
}

const __defaultOptions: QuadraticRibbonsMeshOptions = {
  name: 'ribbons',
  total: 800,
  speed: 1,
  trianglesPerRibbon: 2,
  geomOptions: {},
  matOptions: {}
}

export default class QuadraticRibbonsMesh extends Mesh<Geometry, [Material]> {
  constructor(meshOptions: Partial<QuadraticRibbonsMeshOptions>) {
    const params = buildParameters(__defaultOptions, meshOptions)

    params.geomOptions.speed = params.matOptions.speed = params.speed //important that they stay the same across geometry and material
    params.geomOptions.trianglesPerRibbonShared =
      params.matOptions.trianglesPerRibbonShared = params.trianglesPerRibbon //important that they stay the same across geometry and material

    const mat = new Material(params.matOptions)
    const geo = new Geometry(params.geomOptions)
    super(geo, [mat])
    geo.mesh = this
    this.geometry.name = params.name
    this.name = params.name
    this.frustumCulled = false
    listenToProperty(this.geometry, 'visible', v => {
      this.visible = v
    })
  }
}
