import { Entity, System } from 'gg'
import { Material, Mesh, Object3D } from 'three'

import { createAttachedSpellInteractives } from '~/assemblages/AttachedSpellAssemblage'
import {
  createCardBackInteractives,
  createCardFrontInteractives
} from '~/assemblages/CardAssemblage'
import { createCharacterInteractives } from '~/assemblages/CharacterAssemblage'
import { createEventCardFrontInteractives } from '~/assemblages/EventCardAssemblage'
import { createHeroAbilityFrontInteractives } from '~/assemblages/HeroAbilityAssemblage'
import { createHeroMiniAbilityInteractives } from '~/assemblages/HeroMiniAbilityAssemblage'
import { createHolographicCardBackInteractives } from '~/assemblages/HolographicCardAssemblage'
import { getAssetsManager } from '~/assets/index'
import { Components } from '~/components'
import CardBackVisualsComponent from '~/components/CardBackVisualsComponent'
import ColorizeableMeshComponent from '~/components/ColorizeableMeshComponent'
import MiniComponent from '~/components/MiniComponent'
import { getCardBack, getCardBackMesh } from '~/helpers/cardBacks'
import { getOwner } from '~/helpers/cardHelpers'
import {
  attachmentCardVisuals,
  blankCardVisuals,
  characterCardVisuals,
  colorizeableMeshes,
  guardCharacterCardVisuals,
  heroAbilityCardDraggingVisuals,
  heroAbilityCardHeroAbilityZone,
  heroAbilityCardVanillaVisuals,
  heroAbilityCardWithChargesAndCountersVisuals,
  heroAbilityCardWithChargesVisuals,
  heroAbilityCardWithCountersVisuals,
  heroAbilityMiniIcons,
  holographicCardVisuals,
  opponentCardsThatNeedBacks,
  playerCardsThatNeedBacks,
  regularCardVisuals
} from '~/helpers/compoundCollections'
import { managePrismGems } from '~/helpers/prismGems'
import {
  applyInteractivesOnCard,
  clearInteractivesForCard,
  updateInteractivesForCard
} from '~/utils/helpers/InteractivesHelpers'
import { removeFromParent } from '~/utils/threeUtils'

import { simpleTweener } from './animation/tweeners'
import { maybeAdjustAttachedManaGem } from './AttachmentSystem'

export default class CardVisualsSystem extends System<Components> {
  init() {
    blankCardVisuals.listenForAdd(entity => {
      clearInteractivesForCard(entity)
      applyInteractivesOnCard(entity, createCardBackInteractives())
      managePrismGems(entity.get('mesh'), [])
    })

    //cardBacks
    const cardBackRegistry: Map<Entity<Components>, Object3D> = new Map()
    function cardBackHandler(entity: Entity<Components>) {
      const cardBack = getCardBack(getOwner(entity.has('player')))
      if (cardBack) {
        getCardBackMesh(cardBack).then(mesh => {
          if (entity.has('mesh') && !entity.has('cardBackVisuals')) {
            entity.get('mesh').add(mesh)
            entity.add(new CardBackVisualsComponent())
          }
          cardBackRegistry.set(entity, mesh)
        })
      }
    }
    const cleanupCardBack = (entity: Entity<Components>) => {
      if (cardBackRegistry.has(entity)) {
        removeFromParent(cardBackRegistry.get(entity)!)
        entity.remove('cardBackVisuals')
      }
    }
    playerCardsThatNeedBacks.listenForAdd(cardBackHandler)
    playerCardsThatNeedBacks.listenForRemove(cleanupCardBack)
    opponentCardsThatNeedBacks.listenForAdd(cardBackHandler)
    opponentCardsThatNeedBacks.listenForRemove(cleanupCardBack)
    //
    regularCardVisuals.listenForAdd(entity => {
      const showFlash =
        entity.has('mesh') &&
        entity.get('mesh').getObjectByName('holographic-card')
      updateInteractivesForCard(
        entity,
        entity.has('eventCard')
          ? createEventCardFrontInteractives
          : createCardFrontInteractives
      )
      if (showFlash) {
        const flash = getAssetsManager().fetchMeshDeepClone(
          'gamePiecesPhysical',
          'card-frame-flash',
          true,
          true
        ) as Mesh
        if (flash.material instanceof Material) {
          flash.renderOrder = 100
          simpleTweener.to({
            description: 'flash card',
            target: flash.material,
            propertyGoals: { opacity: 0 },
            onComplete: () => {
              flash.parent?.remove(flash)
            }
          })
        }
        entity.get('transform').add(flash)
      }
    })
    holographicCardVisuals.listenForAdd(entity => {
      updateInteractivesForCard(entity, createHolographicCardBackInteractives)
    })

    const updateCharacterVisuals = (entity: Entity<Components>) => {
      updateInteractivesForCard(entity, createCharacterInteractives)
      if (entity.has('hostingAttachment')) {
        const attachedSpell = entity.get('hostingAttachment').entity
        if (!attachedSpell.has('mesh')) {
          updateInteractivesForCard(
            attachedSpell,
            createAttachedSpellInteractives
          )
        }
      }
    }

    // We subscribe to these mutually exclusive archetypes,
    // so that adding/removnig guard will regenerate the mesh.
    guardCharacterCardVisuals.listenForAdd(updateCharacterVisuals)
    characterCardVisuals.listenForAdd(updateCharacterVisuals)

    attachmentCardVisuals.listenForAdd(entity => {
      updateInteractivesForCard(entity, createAttachedSpellInteractives)
      maybeAdjustAttachedManaGem(entity, true)
    })

    const updateHeroAbilityVisuals = (entity: Entity<Components>) => {
      updateInteractivesForCard(
        entity,
        entity.has('mini')
          ? createHeroMiniAbilityInteractives
          : createHeroAbilityFrontInteractives
      )
    }
    heroAbilityCardDraggingVisuals.listenForAdd(updateHeroAbilityVisuals)
    heroAbilityCardDraggingVisuals.listenForRemove(updateHeroAbilityVisuals)
    heroAbilityCardVanillaVisuals.listenForAdd(updateHeroAbilityVisuals)
    heroAbilityCardHeroAbilityZone.listenForAdd(updateHeroAbilityVisuals)
    heroAbilityCardWithChargesVisuals.listenForAdd(updateHeroAbilityVisuals)
    heroAbilityCardWithCountersVisuals.listenForAdd(updateHeroAbilityVisuals)

    heroAbilityMiniIcons.listenForAdd(e => e.toggle(MiniComponent, true))
    heroAbilityMiniIcons.listenForRemove(e => e.toggle(MiniComponent, false))
    MiniComponent.entities.listenForAdd(updateHeroAbilityVisuals)
    MiniComponent.entities.listenForRemove(updateHeroAbilityVisuals)
    heroAbilityCardWithChargesAndCountersVisuals.listenForAdd(
      updateHeroAbilityVisuals
    )

    colorizeableMeshes.listenForAdd(e => e.add(new ColorizeableMeshComponent()))
    colorizeableMeshes.listenForRemove(e => e.remove('colorizeableMesh'))
  }
  update() {
    //nothing
  }
}
