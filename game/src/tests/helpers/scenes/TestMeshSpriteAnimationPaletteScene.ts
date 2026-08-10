import { DamageKind, Element } from '@skyweaver/state-metadata'
import {
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  SphereBufferGeometry
} from 'three'

import { elementsArr } from '~/constants'
import {
  buildMeshSpriteEffect,
  EffectName
} from '~/helpers/meshAnimationHelpers'
import { DamageStrength } from '~/helpers/meshAnimationTypeHelpers'
import queryParams from '~/queryParams'
import { animationDelay } from '~/utils/asyncUtils'
import { FPSControls } from '~/utils/fpsControls'
import { getSharedPlaneBufferGeometry } from '~/utils/geometry'

import { addPrettyLights } from '../utils/lights'
import { BaseTestScene } from './BaseTestScene'

class TestMeshSpriteAnimationPaletteScene extends BaseTestScene {
  constructor() {
    super()
    addPrettyLights(this.scene, this.bgColor)
    const fps = new FPSControls(this.camera as PerspectiveCamera)
    if (queryParams.fpsCam) {
      fps.toggle(true)
    }

    const floorMaterial = new MeshStandardMaterial({
      color: 0xaaddee,
      roughness: 0.7
    })
    const floor = new Mesh(getSharedPlaneBufferGeometry(), floorMaterial)
    floor.renderOrder = 0
    this.scene.add(floor)
    floor.rotation.x = Math.PI * -0.5

    this.camera.position.set(0, 0.2, 0.5)
    this.camera.lookAt(0, 0.02, 0.2)

    const geo = new SphereBufferGeometry(0.02, 32, 16)

    const spheres: Mesh[] = []

    type EffectOptions = {
      element: Element
      strength: DamageStrength
      type: DamageKind['type']
    }

    const effectMap: Map<EffectOptions, Mesh> = new Map()

    const typesAndStrengths: {
      type: DamageKind['type']
      strength: DamageStrength
    }[] = [
      { type: 'Combat', strength: 'Low' },
      { type: 'Combat', strength: 'Medium' },
      { type: 'Combat', strength: 'High' },
      { type: 'CardEffect', strength: 'Low' },
      { type: 'CardEffect', strength: 'Medium' },
      { type: 'CardEffect', strength: 'High' }
    ]
    for (let i = 0; i < elementsArr.length; i++) {
      const element = elementsArr[i]
      console.log(element)

      for (let j = 0; j < typesAndStrengths.length; j++) {
        const typeAndStrength = typesAndStrengths[j]

        const sphere = new Mesh(geo, floorMaterial)
        this.scene.add(sphere)

        sphere.position.set(
          (j - (typesAndStrengths.length - 1) / 2) * 0.12,
          0.05,
          (i - (elementsArr.length - 1) / 2) * 0.12
        )
        spheres.push(sphere)

        effectMap.set(
          {
            element: element,
            type: typeAndStrength.type,
            strength: typeAndStrength.strength
          },
          sphere
        )
      }
    }

    async function playAnims() {
      for (const options of Array.from(effectMap.keys())) {
        const element = options.element
        const sphere = effectMap.get(options)!

        buildMeshSpriteEffect(
          `${element + options.strength + options.type}` as EffectName,
          undefined,
          0,
          0.02
        ).then(effect => {
          sphere.add(effect.mesh)
        })
      }

      await animationDelay(3000)
      playAnims()
    }

    playAnims()
  }
}
export const scene = TestMeshSpriteAnimationPaletteScene
