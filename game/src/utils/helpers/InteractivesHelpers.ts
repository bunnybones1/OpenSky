import { Player } from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import { Mesh, Object3D } from 'three'

import { Components } from '~/components'
import { RelaxedCardInstance } from '~/components/CardInstanceComponent'
import CollidableComponent from '~/components/CollidableComponent'
import HighlightMaterialComponent from '~/components/HighlightMaterialComponent'
import MeshComponent from '~/components/MeshComponent'
import { getOwner } from '~/helpers/cardHelpers'
import { tryAttachBakedAttachedSpell } from '~/helpers/fakeAttachedSpellHelper'
import { getCardAtlasKey, getCharacterAtlasKey } from '~/materials'
import MagicFireHighlightMeshMaterial from '~/materials/MagicFireHighlightMeshMaterial'
import { underPointer } from '~/systems/input/input'

export interface Interactives {
  visualsRoot: Object3D
  highlight?: Mesh
  collider: Object3D
}

export type InteractivesFactoryMethod = (
  card: RelaxedCardInstance,
  owner: Player
) => Interactives

export function clearInteractivesForCard(entity: Entity<Components>) {
  entity.remove('highlightMaterial')
  if (entity.has('mesh')) {
    entity.remove('mesh')
  }
  entity.remove('collidable')
}

export function updateInteractivesForCard(
  entity: Entity<Components>,
  interactivesCreator: InteractivesFactoryMethod
) {
  clearInteractivesForCard(entity)
  const card = entity.get('cardInstance')
  const player = getOwner(entity.has('player'))
  const interactives = interactivesCreator(card, player)
  applyInteractivesOnCard(entity, interactives)

  if (entity.has('mesh')) {
    const keyGen = entity.has('character')
      ? getCharacterAtlasKey
      : getCardAtlasKey

    entity.get('mesh').userData.artKey = entity.has('attachedTo')
      ? undefined
      : keyGen(card)
  }
  if (entity.has('fakeHasAttachment')) {
    const tc = entity.get('transform')
    const mc = entity.get('mesh')
    const view = entity.get('cardInstance')
    tryAttachBakedAttachedSpell(view, 'fake', tc, mc, getOwner(true))
  }

  if (entity.has('frontFacesVisible') && entity.has('transform')) {
    entity.get('transform').traverse(obj => {
      if (obj.userData.isFrontFacing) {
        obj.visible = true
      }
    })
  }
  return interactives
}

export function applyInteractivesOnCard(
  entity: Entity<Components>,
  { highlight, visualsRoot, collider }: Interactives
) {
  if (highlight) {
    const highlightComponent = new HighlightMaterialComponent({
      materials: [highlight.material as MagicFireHighlightMeshMaterial],
      mesh: highlight
    })
    // highlight.renderOrder = 1000
    entity.add(highlightComponent)
  }
  entity.add(new MeshComponent(visualsRoot))
  entity.add(new CollidableComponent(visualsRoot, collider))
  underPointer.cleanUpEntityCollider(entity)
}
