import { getLast } from '@opensky/shared/utils/arrayUtils'
import { Color, Mesh, Object3D } from 'three'

import { COLOR_WHITE } from '~/colors/colorLibrary'
import { RENDER_ORDERS, traitColors, traitsByName } from '~/constants'
import { getAdditiveFillerMaterial } from '~/helpers/getAdditiveFillerMaterial'
import { getAdditiveProgressBarMaterial } from '~/helpers/getAdditiveProgressBarMaterial'
import BasicColorMeshMaterial from '~/materials/BasicColorMeshMaterial'
import BasicVertexColorMeshMaterial from '~/materials/BasicVertexColorMeshMaterial'
import BasicWidthBrightnessMeshMaterial from '~/materials/BasicWidthBrightnessMeshMaterial'
import CardTokenMaterial from '~/materials/CardArtMeshMaterial'
import ContactShadowMeshMaterial from '~/materials/ContactShadowMeshMaterial'
import materialLibrary from '~/materials/library'
import RGBAVertexColorMeshMaterial from '~/materials/RGBAVertexColorMeshMaterial'
import RowArtMeshMaterial from '~/materials/RowArtMeshMaterial'
import ZShadowMeshMaterial from '~/materials/ZShadowMeshMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import { experimentalGltfCleanup } from '~/utils/experimentalGltfCleanup'
import { exchangeMesh } from '~/utils/meshUtils'
import { getTempTexture } from '~/utils/tempTexture'

import { AssetsManager } from '../index'

const attributeRouting = {
  colorMaskVertexAttribute: 'color.r',
  pretintVertexAttribute: 'color.g',
  bgMaskVertexAttribute: 'color.b',
  fgMaskVertexAttribute: 'color.a'
}

const attributeRoutingSimple = {
  colorMaskVertexAttribute: 'color.r',
  pretintVertexAttribute: 'color.g'
}

export default function GamePiecesGraphicalPostProcessor(
  assetsManager: AssetsManager,
  assetName: string,
  scene: Object3D
) {
  experimentalGltfCleanup(scene)
  scene.traverse(obj => {
    obj.frustumCulled = false
    obj.renderOrder = RENDER_ORDERS.cardArt
    if (
      (obj.name.includes('card') || obj.name.includes('token')) &&
      !obj.name.includes('shadow') &&
      !obj.name.includes('progress-bar') &&
      !obj.name.includes('filler')
    ) {
      obj.name += '-art'
    }
  })
  const meshesToExchange: [Mesh, Mesh2D][] = []
  for (const mesh of scene.children) {
    mesh.frustumCulled = false
    mesh.position.set(0, 0, 0)
    if (mesh instanceof Mesh2D && mesh.name.includes('collider')) {
      mesh.material = materialLibrary.getCollider2d(assetsManager)
    }
  }

  for (const mesh of scene.children) {
    if (mesh instanceof Mesh) {
      // mesh origins need to be reset
      mesh.position.set(0, 0, 0)
      if (mesh.name.includes('zShadow-')) {
        mesh.material = new ZShadowMeshMaterial({
          zScale: 38
        })
      } else if (mesh.name.includes('shadow-')) {
        mesh.material = new ContactShadowMeshMaterial({
          //
        })
      } else if (mesh.name.includes('ui-icon')) {
        if (mesh.name.includes('dust')) {
          mesh.material = new RGBAVertexColorMeshMaterial({})
        } else {
          mesh.material = new BasicVertexColorMeshMaterial({
            color: COLOR_WHITE,
            colorVertexAttribute: 'color.rgb'
          })
        }
      } else if (mesh.name.includes('trigger-icon')) {
        mesh.material = new BasicColorMeshMaterial({
          color: COLOR_WHITE
        })
      } else if (mesh.name.includes('trait-badge-')) {
        const traitName = getLast(mesh.name.split('-'))
        const trait = traitsByName[traitName]
        if (trait) {
          mesh.material = new BasicWidthBrightnessMeshMaterial({
            color: traitColors[trait]
          })
        }
      } else if (mesh.name.includes('skytag') || mesh.name.includes('row')) {
        meshesToExchange.push([
          mesh,
          new Mesh2D(
            mesh.geometry,
            new RowArtMeshMaterial({
              texture: getTempTexture(),
              ...attributeRoutingSimple
            })
          )
        ])
      } else if (mesh.name.includes('shattered')) {
        mesh.material = new CardTokenMaterial({
          rarity: 'base',
          foilContext: 'inspecting',
          fgTexture: getTempTexture(),
          bgTexture: getTempTexture(),
          ...attributeRouting,
          useCentroids: true
        })
      } else if (mesh.name.includes('filler')) {
        mesh.material = getAdditiveFillerMaterial(new Color(0.5, 0, 0.5))
      } else if (mesh.name.includes('progress-bar')) {
        mesh.material = getAdditiveProgressBarMaterial(new Color('#74fbef'))
      } else {
        mesh.material = new CardTokenMaterial({
          rarity: 'base',
          foilContext: 'inspecting',
          fgTexture: getTempTexture(),
          bgTexture: getTempTexture(),
          ...attributeRouting
        })
      }
    }
  }

  for (const pair of meshesToExchange) {
    exchangeMesh(pair[0], pair[1])
  }
}
