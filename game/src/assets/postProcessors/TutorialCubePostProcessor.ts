import { DoubleSide, Mesh, Object3D } from 'three'

import { RENDER_ORDERS } from '~/constants'
import { blendModeParams } from '~/helpers/blendModeHelpers'
import BasicVertexColorMeshMaterial from '~/materials/BasicVertexColorMeshMaterial'
import { modify3DObjectsWhoseNamesInclude } from '~/utils/threeUtils'

import { AssetsManager } from '../index'

export default function TutorialCubePostProcessor(
  assetsManager: AssetsManager,
  assetName: string,
  scene: Object3D
) {
  scene.traverse(obj => (obj.frustumCulled = false))

  modify3DObjectsWhoseNamesInclude<Mesh>(scene, '-cube', mesh => {
    mesh.renderOrder = RENDER_ORDERS.highlight
    mesh.material = new BasicVertexColorMeshMaterial(
      {
        colorVertexAttribute: 'color.rgb'
      },
      {
        side: DoubleSide,
        transparent: true,
        depthWrite: false,
        ...blendModeParams.screen
      }
    )
  })
}
