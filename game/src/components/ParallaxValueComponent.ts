import { Rarity } from '@skyweaver/state-metadata'
import { Component, Entity } from 'gg'
import { Mesh } from 'three'

import CardArtMeshMaterial from '~/materials/CardArtMeshMaterial/index'
import { useSafeParallax } from '~/parallaxSettings'
import { Easing } from '~/systems/animation/Easing'
import AnimatedNumber from '~/utils/AnimatedNumber'
import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

interface ParallaxValue {
  parallaxAmount: number
  strength: AnimatedNumber
}

export default class ParallaxValueComponent extends Component<ParallaxValue> {
  static entities = new TrackableCollection<Entity<Components>>(
    'ParallaxComponent'
  )
  onAttach(entity: Entity<Components>) {
    ParallaxValueComponent.entities.add(entity)

    this.value.strength.onChange(v => {
      const mesh = entity.has('mesh') ? entity.get('mesh') : undefined
      if (mesh) {
        mesh.traverse(n => {
          if (n instanceof Mesh && n.material instanceof CardArtMeshMaterial) {
            n.material.fgParallaxStrength = v * this.value.parallaxAmount
            n.material.bgParallaxStrength = v * 0.2
          }
        })
      }
    })
  }
  onDetach(entity: Entity<Components>) {
    ParallaxValueComponent.entities.remove(entity)
  }
  constructor(value: number, rarity: Rarity, isSpell: boolean) {
    const useFoil = rarity === 'gold' || rarity === 'silver'
    const juiceUpTheParallax = useFoil && !useSafeParallax.value

    super({
      strength: new AnimatedNumber(
        _v => {
          //
        },
        value,
        500,
        Easing.Linear,
        500,
        true
      ),
      parallaxAmount: isSpell
        ? juiceUpTheParallax
          ? 0.075
          : 0.05
        : juiceUpTheParallax
        ? -0.05
        : 0
    })
  }
}
