import { Mesh } from 'three'

import BasicMapMeshMaterial from '~/materials/BasicMapMeshMaterial/index'
import PaletteMappedVertexColorMeshMaterial from '~/materials/PaletteMappedVertexColorMeshMaterial/index'
import Mesh2D from '~/meshes/Mesh2D'

export type PaletteMesh2D = Omit<Mesh2D, 'material'> & {
  material: PaletteMappedVertexColorMeshMaterial
}

export type BasicMapMesh = Omit<Mesh, 'material'> & {
  material: BasicMapMeshMaterial
}
