import { Material, Mesh, Object3D, Vector2 } from 'three'

import { PALETTE_ROW } from '~/constants'
import materialLibrary from '~/materials/library'
import PaletteMappedVertexColorMeshMaterial from '~/materials/PaletteMappedVertexColorMeshMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import { migrateAttributeFromMorph } from '~/utils/geometry'
import { exchangeMesh } from '~/utils/meshUtils'
import {
  findAllMeshesUsingMaterial,
  getMaterialFromMesh,
  maybeFindMeshByName,
  maybeFindObject3DByName
} from '~/utils/threeUtils'

import { AssetsManager } from '../index'

const originalAssetSizes: { [K: string]: Vector2 } = {
  speech: new Vector2(127, 51),
  'vs-lines': new Vector2(497, 256),
  'panel-w-gems': new Vector2(100, 36),
  'rectangle-double-outline-shadowed': new Vector2(36, 36),
  'info-box-title': new Vector2(0, 36),
  'timer-bar-normal-button': new Vector2(27, 3.2),
  'timer-bar-end-turn': new Vector2(28, 5.5),
  'progression-tick': new Vector2(14.5, 14.5),
  'victory-wings': new Vector2(38, 10.8),
  'glow-lines': new Vector2(36, 28),
  'icon-bubble': new Vector2(120, 75),
  'titles-3-slice': new Vector2(376, 128)
} as const

const paletteRows: { [K: string]: number } = {
  'progression-tick-pass-lilac': 0,
  'progression-tick-fail': 1,
  'progression-tick-pass-blue': 2,
  'progression-tick-current': 2,
  'progression-tick-next': PALETTE_ROW.PURPLE_TRANSLUCENT,
  'icon-card-glow': PALETTE_ROW.WHITE_GRADIENT,
  'icon-card': PALETTE_ROW.CARD_SILVER,
  'vs-lines': PALETTE_ROW.WHITE_GRADIENT,
  gradient: PALETTE_ROW.WHITE_GRADIENT,
  'timer-bar': PALETTE_ROW.BLACK_AND_WHITE,
  'icon-stickers': PALETTE_ROW.BLACK_AND_WHITE,
  'icon-back': PALETTE_ROW.BLACK_AND_WHITE,
  'ui-icon': PALETTE_ROW.BLACK_AND_WHITE,
  'trigger-icon': PALETTE_ROW.BLACK_AND_WHITE,
  '-bubble': PALETTE_ROW.BLACK_AND_WHITE,
  'circle-filled': PALETTE_ROW.BLACK_AND_WHITE,
  'circle-filled-outline': PALETTE_ROW.BLACK_AND_WHITE,
  'glow-lines': PALETTE_ROW.WHITE_GRADIENT,
  'panel-w-gems': 20,
  'mana-gem': 21,
  'trigger-holder': 22,
  'rectangle-double-outline-shadowed': PALETTE_ROW.PURPLE,
  rectangle: 23,
  'rectangle-soft-square': 23,
  'rectangle-soft-round': 23,
  'turn-group-box': PALETTE_ROW.WHITE_GRADIENT,
  line: 23,
  'victory-wings': 27,
  'defeat-background': 28,
  'new-card-glow': 29,
  'panel-slanted-shadow': PALETTE_ROW.BLACK_AND_WHITE,
  'preview-icon-dust': 30,
  'preview-icon-death': 31
} as const

const sizeSubNames: string[] = Object.keys(originalAssetSizes)
const paletteRowSubNames: string[] = Object.keys(paletteRows)

function findSize(name: string) {
  for (const subName of sizeSubNames) {
    if (name.includes(subName)) {
      return originalAssetSizes[subName]
    }
  }
  return undefined
}

function findPaletteRow(name: string) {
  for (const subName of paletteRowSubNames) {
    if (name.includes(subName)) {
      return paletteRows[subName]
    }
  }
  return 0
}

export default function UISmallPostProcessor(
  assetsManager: AssetsManager,
  assetName: string,
  scene: Object3D
) {
  const lilacCheck = maybeFindObject3DByName<Mesh>(
    scene,
    'progression-tick-pass-blue'
  )
  if (lilacCheck) {
    const lilacCheckClone = lilacCheck.clone()
    lilacCheckClone.material = (lilacCheckClone.material as Material).clone()
    scene.add(lilacCheckClone)
    lilacCheckClone.name = 'progression-tick-pass-lilac'
  }
  const mat = getMaterialFromMesh(scene, 'rectangle-rounded-exterior')
  const meshesToExchange = findAllMeshesUsingMaterial(scene, mat).map(mesh => {
    return [
      mesh,
      new Mesh2D(
        mesh.geometry,
        new PaletteMappedVertexColorMeshMaterial(
          assetsManager,
          {
            originalAssetSize: findSize(mesh.name),
            paletteMapRow: findPaletteRow(mesh.name)
          },
          {
            // side: DoubleSide
          }
        )
      )
    ]
  })
  for (const pair of meshesToExchange) {
    exchangeMesh(pair[0], pair[1])
  }
  for (const mesh of scene.children) {
    mesh.frustumCulled = false
    mesh.position.set(0, 0, 0)
    if (mesh instanceof Mesh2D) {
      if (mesh.name.startsWith('gradient-')) {
        ;(mesh.material as PaletteMappedVertexColorMeshMaterial).paletteRow =
          PALETTE_ROW.WHITE_GRADIENT
      }
      if (mesh.name.includes('collider')) {
        mesh.material = materialLibrary.getCollider2d(assetsManager)
      }
    }
  }
  const highlightMesh = maybeFindMeshByName(scene, 'button-end-turn-highlight')
  if (highlightMesh) {
    for (const mesh of findAllMeshesUsingMaterial(
      scene,
      highlightMesh.material
    )) {
      migrateAttributeFromMorph(mesh.geometry, 0, 'antiposition')
    }
  }
}
