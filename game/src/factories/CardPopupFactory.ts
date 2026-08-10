import device from '@opensky/shared/device'
import { isHeroAbility, Player, StoredCard } from '@skyweaver/state-metadata'
import { Entity } from 'gg'

import CardPopupAssemblage from '~/assemblages/CardPopupAssemblage'
import HeroAbilityPopupAssemblage from '~/assemblages/HeroAbilityPopupAssemblage'
import HeroCardAssemblage, {
  createHeroCardInteractives
} from '~/assemblages/HeroCardAssemblage'
import { Components } from '~/components'
import CardInstanceComponent, {
  RelaxedCardInstance
} from '~/components/CardInstanceComponent'
import HighlightMaterialComponent from '~/components/HighlightMaterialComponent'
import MeshComponent from '~/components/MeshComponent'
import PlayerComponent from '~/components/PlayerComponent'
import { MOBILE_CARD_HOVER_SCALE } from '~/constants'
import { changeFoilContext } from '~/foils/foilHelpers'
import { getHeroSkin } from '~/helpers/heroSkins'
import { createWorldEntity } from '~/helpers/worldHelpers'
import MagicFireHighlightMeshMaterial from '~/materials/MagicFireHighlightMeshMaterial'
import { storeHelper } from '~/state/index'
import { showRelatedCardsOnHover } from '~/userSettings'
import { getReferencedCardInstances } from '~/utils/card'

export type CardPopupExpandDirection = 'left' | 'right'

function getReferencedCardsByDepth(
  cards: RelaxedCardInstance[],
  acc: RelaxedCardInstance[][] = [],
  maxPopups = showRelatedCardsOnHover.value ? (device.isMobile ? 2 : 3) : 1
): RelaxedCardInstance[][] {
  const accGroup: RelaxedCardInstance[] = []
  const childCards: RelaxedCardInstance[] = []

  acc.push(accGroup)
  cards.forEach(card => {
    // Don't display multiples of the same card if there is a circular card reference
    if (
      acc.some(group => group.some(x => card.base === x.base)) ||
      acc.reduce((acc, group) => acc + group.length, 0) >= maxPopups
    ) {
      return
    }

    accGroup.push(card)
    childCards.push(...getReferencedCardInstances(card))
  })

  if (childCards.length) {
    getReferencedCardsByDepth(childCards, acc, maxPopups)
  }

  return acc
}

// Recursively creates card entities for the given card and all of its card references
export function createCardPopupEntities(
  card: RelaxedCardInstance,
  attachment: RelaxedCardInstance | undefined,
  owner: Player,
  mainCardShouldGlow: boolean,
  maxPopups?: number
) {
  const cards = (
    [] as Array<
      Omit<RelaxedCardInstance, 'attachment'> & {
        attachment: RelaxedCardInstance | number | undefined
      }
    >
  ).concat(...getReferencedCardsByDepth([card], undefined, maxPopups))
  const storedCard: { StoredCard: StoredCard } | undefined =
    cards[0].state.temporaryModifiers.find(
      c => typeof c.modifier === 'object' && 'StoredCard' in c.modifier
    )?.modifier as any
  // Some cards, like Grasping Maiden, store a real card inside them - show that card in the popups too :)
  if (storedCard) {
    const c = storedCard.StoredCard
    cards.splice(1, 0, {
      base: c.card[0],
      attachment: c.attachment
        ? {
            attachment: undefined,
            base: c.attachment[0],
            id: 987698769876,
            state: c.attachment[1]
          }
        : undefined,
      id: 1234123412341234,
      state: c.card[1]
    })
  }
  return cards.map((card, index) => {
    if (card.base === 'Hero') {
      const skin = getHeroSkin(card)
      const hero = HeroCardAssemblage(skin)
      const { visualsRoot, highlight } = createHeroCardInteractives(skin)
      const entity = createWorldEntity(hero)

      if (highlight) {
        const highlightComponent = new HighlightMaterialComponent({
          materials: [highlight.material as MagicFireHighlightMeshMaterial],
          mesh: highlight
        })
        // highlight.renderOrder = 1000
        entity.add(highlightComponent)
      }
      entity.add(new MeshComponent(visualsRoot))
      entity.add(new CardInstanceComponent({ ...card, attachment: undefined }))
      if (storeHelper.getPlayer() === owner) {
        entity.add(new PlayerComponent())
      }
      return entity
    }
    const isMainCard = index === 0
    // We add a FakeHasAttachmentComponent to the parent if it has a real attach,
    // since the popup attach needs to show the real state of the attach
    // but the popup parent card won't have real attachment machinery components
    const popup = isHeroAbility(card)
      ? HeroAbilityPopupAssemblage(
          card as RelaxedCardInstance,
          owner,
          isMainCard && mainCardShouldGlow
        )
      : card.attachment && typeof card.attachment === 'object'
      ? CardPopupAssemblage(
          card as RelaxedCardInstance,
          owner,
          card.attachment,
          false,
          false
        )
      : CardPopupAssemblage(
          card as RelaxedCardInstance,
          owner,
          isMainCard ? attachment : undefined,
          !isMainCard,
          isMainCard && mainCardShouldGlow
        )

    const entity = createWorldEntity(popup)
    return entity
  })
}

// Recursively creates card popups for the given card and all of its card references to a specific max depth
export function createCardPopup(
  card: RelaxedCardInstance,
  attachment: RelaxedCardInstance | undefined,
  owner: Player,
  expandDirection: CardPopupExpandDirection,
  shouldGlow: boolean
): Entity<Components> {
  const entities = createCardPopupEntities(card, attachment, owner, shouldGlow)

  const mainEntity = entities[0]
  const transform = mainEntity.get('transform')

  transform.scale.setScalar(device.isMobile ? MOBILE_CARD_HOVER_SCALE : 0.5)
  for (const [childEntity, index] of entities
    .slice(1)
    .map((e, index) => [e, index] as const)) {
    const parentEntity = entities[index]
    const parentTransform = parentEntity.get('transform')
    const childTransform = childEntity.get('transform')
    const scale = 0.8
    const offsetX = 0.05 * (expandDirection === 'right' ? 1 : -1)
    childTransform.scale.setScalar(scale)
    childTransform.position.set(offsetX, 0, 0)
    // Because this card view is now a child of a parent transform
    // its screen space rotation needs to be reset
    // childTransform.rotation.set(0, 0, 0)
    parentTransform.add(childTransform)
    changeFoilContext(childEntity, 'default')
  }

  return mainEntity
}
