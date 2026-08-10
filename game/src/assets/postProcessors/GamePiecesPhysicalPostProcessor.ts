import {
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Object3D
} from 'three'

import { atmosphereColorForCards, COLOR_BLACK } from '~/colors/colorLibrary'
import { RENDER_ORDERS } from '~/constants'
import { applyBlendMode, blendModeParams } from '~/helpers/blendModeHelpers'
import { getFireHighlightOptionOverridesUnsafe } from '~/helpers/fireHighlightMaterialFactory'
import BasicMapMeshMaterial from '~/materials/BasicMapMeshMaterial'
import materialLibrary from '~/materials/library'
import MagicFireHighlightMeshMaterial from '~/materials/MagicFireHighlightMeshMaterial'
import PortalMeshMaterial from '~/materials/PortalMeshMateiral'
import queryParams from '~/queryParams'
import { testOverdraw } from '~/renderSettings'
import { experimentalGltfCleanup } from '~/utils/experimentalGltfCleanup'
import { migrateAttributeFromMorph } from '~/utils/geometry'
import { convertAllOfOneTypeToOverdrawTests } from '~/utils/materials'
import {
  findObject3DByName,
  modify3DObjects,
  modify3DObjectsWhoseNamesInclude,
  transformAllMaterialInstancesOfMesh,
  transformAllMeshesSharingMaterial
} from '~/utils/threeUtils'

import { AssetsManager } from '../index'

export default function GamePiecesPhysicalPostProcessor(
  assetsManager: AssetsManager,
  assetName: string,
  scene: Object3D
) {
  experimentalGltfCleanup(scene)

  scene.traverse(obj => (obj.frustumCulled = false))

  for (const child of scene.children) {
    child.position.set(0, 0, 0)
  }

  modify3DObjectsWhoseNamesInclude<Mesh>(scene, '-frame', mesh => {
    mesh.renderOrder = RENDER_ORDERS.frame
    if (mesh.material instanceof MeshBasicMaterial) {
      if (mesh.name.includes('holograph')) {
        const mat = mesh.material.clone()
        applyBlendMode(mat, 'screen')
        mesh.material = mat
      } else {
        const mat = new BasicMapMeshMaterial({
          map: mesh.material.map!,
          overlayColor: atmosphereColorForCards
        })
        mesh.material = mat
      }
    }
  })

  modify3DObjectsWhoseNamesInclude<Mesh>(scene, '-frame-none', mesh => {
    if (mesh.material instanceof Material) {
      mesh.material.transparent = true
    }
  })

  modify3DObjectsWhoseNamesInclude<Mesh>(scene, '-gem', mesh => {
    mesh.renderOrder = RENDER_ORDERS.frame
  })

  const liquidContainer = findObject3DByName<Mesh>(scene, 'mana-vial')
  const waterline = findObject3DByName<Mesh>(scene, 'waterline')
  if (liquidContainer && waterline) {
    liquidContainer.renderOrder = RENDER_ORDERS.manaVial
    waterline.renderOrder = RENDER_ORDERS.manaVial
  }

  transformAllMaterialInstancesOfMesh<MeshStandardMaterial, MeshBasicMaterial>(
    scene,
    'card-collider',
    () => materialLibrary.collider
  )

  modify3DObjectsWhoseNamesInclude<Mesh>(scene, '-art', mesh => {
    mesh.renderOrder = RENDER_ORDERS.cardArt
    if (mesh.name.includes('spell')) {
      return
    }
    if (mesh.material instanceof MeshLambertMaterial && mesh.material.map) {
      const newMat = new MeshBasicMaterial({
        map: mesh.material.map
      })
      newMat.name = mesh.material.name
      mesh.material = newMat
    }
  })

  //offset different prefixed mesh renderOrders to further optimize render performance
  const prefixesToRenderOrderOffset: string[] = [
    'card-',
    'heroCard-',
    'hero-',
    'unit-',
    'guard-',
    'spell-',
    'enchantment-'
  ]

  prefixesToRenderOrderOffset.forEach((prefix, offset) => {
    modify3DObjectsWhoseNamesInclude(
      scene,
      prefix,
      mesh => (mesh.renderOrder += offset)
    )
  })

  transformAllMeshesSharingMaterial(scene, 'card-highlight', mesh => {
    const material = new MagicFireHighlightMeshMaterial(assetsManager, {
      color: COLOR_BLACK.clone(),
      ...getFireHighlightOptionOverridesUnsafe(
        mesh.name.replace('-highlight', '')
      )
    })

    mesh.renderOrder = RENDER_ORDERS.highlight
    mesh.material = material
    if (queryParams.mode === 'sandbox') {
      mesh.visible = false
    }
    migrateAttributeFromMorph(mesh.geometry, 0, 'antiposition')
  })

  const portal = findObject3DByName<Mesh>(scene, 'spiral')
  if (portal) {
    portal.material = new PortalMeshMaterial({
      map: assetsManager.getLazyTextureAssetUniform('fireEffectSourceMap'),
      blendMode: 'multiply',
      useInnerDetails: false,
      useOuterDetails: true
    })
    const portal2 = portal.clone()
    portal.add(portal2)
    portal2.name = 'spiral2'
    portal2.position.set(0, 0, 0)
    // portal2.position.z = 0.03
    portal2.material = new PortalMeshMaterial({
      map: assetsManager.getLazyTextureAssetUniform('fireEffectSourceMap'),
      blendMode: 'screen',
      useInnerDetails: true,
      useOuterDetails: false
    })
    portal2.renderOrder++
  }

  modify3DObjects<Mesh>(scene, 'card-frame-flash', obj => {
    if (obj.material instanceof BasicMapMeshMaterial) {
      const newMat = new BasicMapMeshMaterial(
        {
          map: obj.material.texture,
          supportOpacity: true
        },
        blendModeParams.screenAlpha
      )
      newMat.opacity = 2
      obj.material = newMat
    }
  })

  modify3DObjectsWhoseNamesInclude<Mesh>(scene, 'mana-vial', obj => {
    const attrs = obj.geometry.attributes
    if (!attrs.uv) {
      delete attrs.uv
    }
    if (!attrs.uv2) {
      delete attrs.uv2
    }
  })

  if (testOverdraw.value) {
    convertAllOfOneTypeToOverdrawTests(scene, MeshLambertMaterial)
    convertAllOfOneTypeToOverdrawTests(scene, MeshStandardMaterial)
  }
}
