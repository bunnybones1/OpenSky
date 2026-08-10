import { unlerpClamped } from '@opensky/shared/utils/math'
import { BufferGeometry, Color, Mesh, Object3D } from 'three'

import { getAssetsManager } from '~/assets/index'
import { COLOR_BLACK } from '~/colors/colorLibrary'
import MagicFireHighlightMeshMaterial from '~/materials/MagicFireHighlightMeshMaterial'
import { AnimatedBool } from '~/utils/AnimatedBool'
import { NOOP } from '~/utils/jsUtils'
import { copyTransform } from '~/utils/transformUtils'

import { Easing } from './animation/Easing'

const __colorDashNoTargets = new Color(0.25, 0.25, 0.25)
const __customTraitAnimLib = {
  Dash() {
    const proto = getAssetsManager().fetchMeshDeepClone(
      'gamePiecesPhysical',
      'dash-highlight',
      true
    ) as Mesh
    const pivot = new Object3D()
    const total = 5
    const meshes: Mesh<BufferGeometry, MagicFireHighlightMeshMaterial>[] = []
    for (let i = 0; i < total; i++) {
      const material = (
        proto.material as MagicFireHighlightMeshMaterial
      ).clone()
      const mesh = new Mesh(proto.geometry, material)
      mesh.name = proto.name
      pivot.add(mesh)
      meshes.push(mesh)
      copyTransform(mesh, proto)
    }
    const workingColor = new Color()
    for (const mesh of meshes) {
      mesh.material.color = workingColor
    }
    let externalColor = COLOR_BLACK
    function setColor(color: Color) {
      externalColor = color
    }

    const active = new AnimatedBool(NOOP, false, 500, undefined, 1000)
    const originalScaleX = proto.scale.x

    return {
      mesh: pivot,
      active,
      setColor,
      update(time: number) {
        const ecv = Math.max(
          Math.max(externalColor.r, externalColor.g),
          externalColor.b
        )
        const necv = unlerpClamped(0.2, 0.6, ecv)
        workingColor.lerpColors(__colorDashNoTargets, externalColor, necv)
        for (let i = 0; i < total; i++) {
          const mesh = meshes[i]
          const mat = mesh.material
          const ratio = (time * 0.25 + i / total) % 1
          const str = 1 - Easing.Cubic.In(ratio)
          mat.opacity = active.animatedValue * str
          mat.thicknessRatio = str
          mesh.position.z = -0.02 - ratio * 0.025
          mesh.scale.z = ratio + 1
          mesh.position.y = ratio * ratio * ratio * 0.03
          mesh.scale.x =
            Easing.Cubic.Out(Math.min(1, ratio * 2)) * originalScaleX
        }
      }
    }
  }
}

export type CustomAnimTrait = keyof typeof __customTraitAnimLib

export type CustomTraitVisuals = {
  mesh: Object3D
  active: AnimatedBool
  setColor: (color: Color) => void
  update(currentTime: number): void
}

export function getCustomTraitVisuals(
  trait: CustomAnimTrait
): CustomTraitVisuals {
  return __customTraitAnimLib[trait]()
}
