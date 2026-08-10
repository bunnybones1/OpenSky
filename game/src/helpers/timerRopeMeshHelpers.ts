import { BufferGeometry, Mesh, MeshBasicMaterial, Scene } from 'three'

import { getAssetsManager } from '~/assets/index'
import { COLOR_FIRE_RED } from '~/colors/colorLibrary'
import MagicFireHighlightMeshMaterial from '~/materials/MagicFireHighlightMeshMaterial'
import { findObject3DByName } from '~/utils/threeUtils'

import { getFireHighlightOptionOverrides } from './fireHighlightMaterialFactory'

let initd = false
export function getTimerRopeMeshes(scene: Scene) {
  if (initd) {
    throw new Error('Rope already initd')
  }
  initd = true
  const rope = findObject3DByName(scene, 'field-rope', true) as Mesh<
    BufferGeometry,
    MagicFireHighlightMeshMaterial
  >
  rope.material = new MagicFireHighlightMeshMaterial(getAssetsManager(), {
    color: COLOR_FIRE_RED,
    useProgress: true,
    ...getFireHighlightOptionOverrides('field-rope')
  })

  const ropeBeams = findObject3DByName(scene, 'field-rope-beams', true) as Mesh<
    BufferGeometry,
    MagicFireHighlightMeshMaterial
  >
  ropeBeams.material = new MagicFireHighlightMeshMaterial(getAssetsManager(), {
    color: COLOR_FIRE_RED,
    useProgress: true,
    ...getFireHighlightOptionOverrides('field-rope-beams')
  })
  ropeBeams.visible = true

  ropeBeams.material.uniforms.progress = rope.material.uniforms.progress
  ropeBeams.material.uniforms.opacity = rope.material.uniforms.opacity
  rope.visible = false
  rope.attach(ropeBeams)

  const ropeShadow = findObject3DByName(
    scene,
    'field-rope-shadow',
    true
  ) as Mesh<BufferGeometry, MeshBasicMaterial>

  return { rope, ropeShadow }
}
