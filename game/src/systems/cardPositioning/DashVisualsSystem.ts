import { removeFromArray } from '@opensky/shared/utils/arrayUtils'
import { Entity, System } from 'gg'

import { time } from '~/animationTime'
import { Components } from '~/components'
import CharacterVisualsDashComponent from '~/components/CharacterVisualsDashComponent'
import { removeFromParent } from '~/utils/threeUtils'

import {
  CustomAnimTrait,
  CustomTraitVisuals,
  getCustomTraitVisuals
} from '../customTraitVisuals'

const __registryActive: Map<Entity<Components>, CustomTraitVisuals> = new Map()
const __registryVisible: CustomTraitVisuals[] = []

function makeOnAdd(trait: CustomAnimTrait): (e: Entity<Components>) => void {
  return (e: Entity<Components>) => {
    if (e.has('mesh')) {
      const parent = e.get('mesh')

      const visuals = getCustomTraitVisuals(trait)
      __registryActive.set(e, visuals)
      __registryVisible.push(visuals)
      const mesh = visuals.mesh
      mesh.position.y = -0.002
      if (e.has('player')) {
        mesh.scale.y = 0.01
      } else {
        mesh.rotation.y = Math.PI
      }
      mesh.frustumCulled = false
      mesh.name = `trait-effect-${trait}`

      parent.add(mesh)

      if (e.has('highlightMaterial')) {
        const highlight = e.get('highlightMaterial')
        if (highlight.materials.length > 0) {
          visuals.setColor(highlight.materials[0].color)
        }
      }

      visuals.active.value = true
    }
  }
}

async function __onRemove(e: Entity<Components>) {
  if (__registryActive.has(e)) {
    const visuals = __registryActive.get(e)!
    await visuals.active.animateValue(false)
    removeFromParent(visuals.mesh)
    removeFromArray(__registryVisible, visuals)
  }
}

export default class DashVisualsSystem extends System<Components> {
  init() {
    CharacterVisualsDashComponent.entities.listenForAdd(makeOnAdd('Dash'))
    CharacterVisualsDashComponent.entities.listenForRemove(__onRemove)
  }
  update() {
    for (const visuals of __registryVisible) {
      visuals.update(time.value)
    }
  }
}
