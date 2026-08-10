import { Mesh } from 'three'

import { buildParameters } from '~/utils/jsUtils'

import Geometry from './Geometry'
import { GeometryLibKeys, getGeometry } from './geometryLib'
import Material, { QuadraticRibbonMaterialParameters } from './Material'

interface QuadraticRibbonMeshOptions {
  name: string
  matOptions: Partial<QuadraticRibbonMaterialParameters>
  geomOptionsKey: GeometryLibKeys
}

const __defaultOptions: QuadraticRibbonMeshOptions = {
  name: 'ribbon',
  geomOptionsKey: 'attributionLine',
  matOptions: {}
}

export default class QuadraticRibbonMesh extends Mesh<Geometry, Material> {
  constructor(meshOptions?: Partial<QuadraticRibbonMeshOptions>) {
    const params = buildParameters(__defaultOptions, meshOptions || {})

    const mat = new Material(params.matOptions)
    const geo = getGeometry(params.geomOptionsKey)
    super(geo, mat)
    this.name = params.name
    this.frustumCulled = false
  }
}
