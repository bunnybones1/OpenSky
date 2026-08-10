import { getUrlFlag } from '@opensky/shared/utils/location'
import {
  AdditiveBlending,
  Color,
  Material,
  Mesh,
  Object3D,
  Points,
  ShaderMaterialParameters
} from 'three'

import { makeHSL } from '~/colors/utils'
import OverdrawOpaqueMeshMaterial from '~/materials/OverdrawOpaqueMeshMaterial'
import ShinePointMaterial from '~/materials/ShinePointMaterial'
import { globalAccess } from '~/utils/globalAccess'

import testOverdrawFragmentShader from '../materials/OverdrawOpaqueMeshMaterial/frag.glsl'
import testOverdrawVertexShader from '../materials/OverdrawOpaqueMeshMaterial/vert.glsl'
import { getMeshMaterial } from './getMeshMaterial'
import { transformAllMaterialInstancesOfMesh } from './threeUtils'

export function convertAllOfOneTypeToOverdrawTests(
  base: Object3D,
  MatClass: any
) {
  base.traverse(object => {
    // Convert arena lambert materials to overdraw test
    if (object instanceof Mesh && object.material instanceof MatClass) {
      transformAllMaterialInstancesOfMesh(base, object.name, oldMat => {
        const newMat = createOverdrawOpaqueMeshMaterial()
        newMat.depthWrite = oldMat.depthWrite
        newMat.depthTest = oldMat.depthTest
        newMat.side = oldMat.side
        newMat.visible = oldMat.visible
        return newMat
      })
    }
  })
}
const u = getUrlFlag('unique-overdraw-colors')
export function createOverdrawOpaqueMeshMaterial() {
  const c = u ? makeHSL(Math.random(), 1.0, 0.2) : new Color(0.2, 0.2, 0)
  return new OverdrawOpaqueMeshMaterial(c)
}

export function convertMaterialParamsToOverdrawTest(
  params: ShaderMaterialParameters
) {
  params.fragmentShader = testOverdrawFragmentShader
  params.vertexShader = testOverdrawVertexShader
  params.blending = AdditiveBlending
}

export function registerMeshesToLCMaterials(base: Object3D) {
  base.traverse(obj => {
    if (obj instanceof Points) {
      const mat = obj.material as Material
      if (mat instanceof ShinePointMaterial) {
        mat.lightPosition = globalAccess.sunPosition
        mat.lightColor = globalAccess.sunColor
        mat.lightBrightness = globalAccess.sunBrightness
      }
    }
  })
}

export function inlineCloneFirstMeshMaterial(node: Object3D) {
  const mp = findFirstChildMeshOrPoints(node)
  if (mp) {
    mp.material = getMeshMaterial(mp).clone()
    return mp.material
  }
  return undefined
}
function findFirstChildMeshOrPoints(node: Object3D) {
  let mesh: Mesh | Points | undefined
  node.traverse(child => {
    if (!mesh && (child instanceof Mesh || child instanceof Points)) {
      mesh = child
    }
  })
  return mesh
}
