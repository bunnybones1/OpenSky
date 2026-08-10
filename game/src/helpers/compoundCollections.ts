// visibleCards = card and mesh
// knownCards = visibleCards with cardInstance
// BlankCardVisuals = visibleCards without cardInstance
// RegularCardVisuals = knownCards without character
// units = knownCards with character
// CharacterCardVisuals = units without guard
// GuardCharacterCardVisuals = units with guard
// attachments = knownCards with attachedTo
// AttachmentCardVisuals = attachments without dragging
// MeshHostingAttachment = knownCards with hostingAttachment

import AttachedToComponent from '~/components/AttachedToComponent'
import CardComponent from '~/components/CardComponent'
import CardInstanceComponent from '~/components/CardInstanceComponent'
import CharacterComponent from '~/components/CharacterComponent'
import CharacterVisualsDashComponent from '~/components/CharacterVisualsDashComponent'
import DeckComponent from '~/components/DeckComponent'
import DraggingComponent from '~/components/DraggingComponent'
import EventCardComponent from '~/components/EventCardComponent'
import FakeHasAttachmentComponent from '~/components/FakeHasAttachmentComponent'
import FrameStyleComponent from '~/components/FrameStyleComponent'
import FrontFacesVisibleComponent from '~/components/FrontFacesVisibleComponent'
import HeroAbilityChargesComponent from '~/components/HeroAbilityChargesComponent'
import HeroAbilityComponent from '~/components/HeroAbilityComponent'
import HeroAbilityCountersComponent from '~/components/HeroAbilityCountersComponent'
import HighlightMaterialComponent from '~/components/HighlightMaterialComponent'
import HolographicComponent from '~/components/HolographicComponent'
import HostingAttachmentComponent from '~/components/HostingAttachmentComponent'
import InHandComponent from '~/components/InHandComponent'
import InspectingComponent from '~/components/InspectingComponent'
import InteractiveIndicatorsComponent from '~/components/InteractiveIndicatorsComponent'
import IsRevealedComponent from '~/components/IsRevealedComponent'
import MeshComponent from '~/components/MeshComponent'
import PlayerComponent from '~/components/PlayerComponent'
import StealthComponent from '~/components/StealthComponent'
import TraitArmorComponent from '~/components/TraitArmorComponent'
import TraitBannerComponent from '~/components/TraitBannerComponent'
import TraitDashComponent from '~/components/TraitDashComponent'
import TraitGuardComponent from '~/components/TraitGuardComponent'
import TraitLifestealComponent from '~/components/TraitLifestealComponent'
import TraitStealthComponent from '~/components/TraitStealthComponent'
import TraitWitherComponent from '~/components/TraitWitherComponent'
import { TrackableCollection } from '~/utils/TrackableCollection'

import { zoneCollections } from './zoneCollections'

export const knownCards = CardComponent.entities.intersect(
  CardInstanceComponent.entities
)

const attachments = AttachedToComponent.entities.exclude(
  DraggingComponent.entities
)
const attachmentsAndHeroAbilities = attachments.union(
  HeroAbilityComponent.entities
)

export const attachmentCardVisuals = knownCards.intersect(attachments)

const heroAbilityCardVisuals = knownCards.intersect(
  HeroAbilityComponent.entities
)

export const heroAbilityCardDraggingVisuals = heroAbilityCardVisuals.intersect(
  DraggingComponent.entities
)

export const heroAbilityCardVanillaVisuals = heroAbilityCardVisuals
  .exclude(HeroAbilityChargesComponent.entities)
  .exclude(HeroAbilityCountersComponent.entities)

export const heroAbilityCardWithChargesVisuals = heroAbilityCardVisuals
  .intersect(HeroAbilityChargesComponent.entities)
  .exclude(HeroAbilityCountersComponent.entities)

export const heroAbilityCardHeroAbilityZone = heroAbilityCardVisuals.intersect(
  zoneCollections.HeroAbility
)
export const heroAbilityMiniIcons = zoneCollections.HeroAbility.exclude(
  zoneCollections.Dragging
)

export const heroAbilityCardWithCountersVisuals = heroAbilityCardVisuals
  .intersect(HeroAbilityCountersComponent.entities)
  .exclude(HeroAbilityChargesComponent.entities)

export const heroAbilityCardWithChargesAndCountersVisuals =
  heroAbilityCardVisuals
    .intersect(HeroAbilityChargesComponent.entities)
    .intersect(HeroAbilityCountersComponent.entities)

export const frontFacingAttachments = attachmentCardVisuals.intersect(
  FrontFacesVisibleComponent.entities
)

export const visibleArtCards = CardInstanceComponent.entities
  .intersect(MeshComponent.entities)
  .intersect(FrontFacesVisibleComponent.entities)
  .exclude(CharacterComponent.entities)
  .exclude(attachmentsAndHeroAbilities)
  .exclude(HolographicComponent.entities)
  .exclude(HeroAbilityComponent.entities)
  .exclude(EventCardComponent.entities)

export const blankCardVisuals = CardComponent.entities
  .exclude(CardInstanceComponent.entities)
  .exclude(AttachedToComponent.entities)
  .exclude(HeroAbilityComponent.entities)
  .exclude(EventCardComponent.entities)

export const regularCardVisuals = knownCards
  .exclude(CharacterComponent.entities)
  .exclude(attachmentsAndHeroAbilities)
  .exclude(HolographicComponent.entities)

export const holographicCardVisuals = knownCards
  .exclude(CharacterComponent.entities)
  .exclude(attachmentsAndHeroAbilities)
  .intersect(HolographicComponent.entities)

export const entitiesWithFrameStyleAndMesh =
  FrameStyleComponent.entities.intersect(MeshComponent.entities)

export const entitiesWithFrameStyleAndMeshOwnedByPlayer =
  entitiesWithFrameStyleAndMesh.intersect(PlayerComponent.entities)

export const entitiesWithFrameStyleAndMeshOwnedByOpponent =
  entitiesWithFrameStyleAndMesh.exclude(PlayerComponent.entities)

export const holographicCards = entitiesWithFrameStyleAndMesh.intersect(
  HolographicComponent.entities
)

export const nonHolographicCards = entitiesWithFrameStyleAndMesh.exclude(
  HolographicComponent.entities
)

const units = knownCards.intersect(CharacterComponent.entities)
const unitsWithMesh = units.intersect(MeshComponent.entities)
export const characterCardVisuals = units.exclude(TraitGuardComponent.entities)

export const armorCharacterCardVisuals = unitsWithMesh.intersect(
  TraitArmorComponent.entities
)
export const bannerCharacterCardVisuals = unitsWithMesh.intersect(
  TraitBannerComponent.entities
)
export const guardCharacterCardVisuals = units.intersect(
  TraitGuardComponent.entities
)
export const lifestealCharacterCardVisuals = unitsWithMesh.intersect(
  TraitLifestealComponent.entities
)
export const stealthCharacterCardVisuals = unitsWithMesh.intersect(
  TraitStealthComponent.entities
)
export const witherCharacterCardVisuals = unitsWithMesh.intersect(
  TraitWitherComponent.entities
)
const dashCharacterCardVisuals = unitsWithMesh.intersect(
  TraitDashComponent.entities
)

dashCharacterCardVisuals.listenForAdd(e =>
  e.add(new CharacterVisualsDashComponent())
)
dashCharacterCardVisuals.listenForRemove(e => e.remove('characterVisualsDash'))

export const armorCharacter = CharacterComponent.entities.intersect(
  TraitArmorComponent.entities
)
export const bannerCharacter = CharacterComponent.entities.intersect(
  TraitBannerComponent.entities
)
export const guardCharacter = CharacterComponent.entities.intersect(
  TraitGuardComponent.entities
)
export const lifestealCharacter = CharacterComponent.entities.intersect(
  TraitLifestealComponent.entities
)
export const stealthCharacter = CharacterComponent.entities.intersect(
  TraitStealthComponent.entities
)
export const witherCharacter = CharacterComponent.entities.intersect(
  TraitWitherComponent.entities
)
const dashCharacter = CharacterComponent.entities.intersect(
  TraitDashComponent.entities
)
void dashCharacter

export const bannerActivatedCharacters = CharacterComponent.entities.intersect(
  TraitBannerComponent.entities
)

export const visibleCardsHostingAttachment = visibleArtCards.intersect(
  HostingAttachmentComponent.entities.union(FakeHasAttachmentComponent.entities)
)
export const visibleCardsNotHostingAttachment = visibleArtCards.exclude(
  HostingAttachmentComponent.entities.union(FakeHasAttachmentComponent.entities)
)

export const attachmentHosts = HostingAttachmentComponent.entities
export const attachmentHostsCharacters = units.intersect(attachmentHosts)
export const attachmentHostsInHand = attachmentHosts.intersect(
  InHandComponent.entities
)
export const attachmentHostCardsNotInHand = attachmentHosts
  .exclude(InHandComponent.entities)
  .exclude(CharacterComponent.entities)

export const playerStealthUnits = StealthComponent.entities.intersect(
  PlayerComponent.entities
)
export const opponentStealthUnits = StealthComponent.entities.exclude(
  PlayerComponent.entities
)

export const inspectableZoneEntities = TrackableCollection.unionTree(
  zoneCollections.Field,
  zoneCollections.Attachment,
  zoneCollections.HeroAbility,
  PlayerComponent.entities
    .union(IsRevealedComponent.entities)
    .intersect(zoneCollections.Hand.union(zoneCollections.OptimisticHand))
    .intersect(CardInstanceComponent.entities)
)

export const colorizeableMeshes = knownCards
  .intersect(MeshComponent.entities)
  .intersect(FrontFacesVisibleComponent.entities)

export const inspectingDecks = DeckComponent.entities.intersect(
  InspectingComponent.entities
)

export const highlightablePublicCards = CardInstanceComponent.entities
  .intersect(FrontFacesVisibleComponent.entities)
  .intersect(HighlightMaterialComponent.entities)

export const visualInteractiveIndicators =
  HighlightMaterialComponent.entities.intersect(
    InteractiveIndicatorsComponent.entities
  )

const allCardRewards = TrackableCollection.unionTree(
  zoneCollections.Reward,
  zoneCollections.HeroReward,
  zoneCollections.DualPrismHeroReward,
  zoneCollections.ConquestPotentialReward,
  zoneCollections.ConquestReward,
  zoneCollections.DisabledReward
)

export const nonRewardCards = MeshComponent.entities.exclude(allCardRewards)

const cardsThatNeedBacks = MeshComponent.entities.intersect(
  TrackableCollection.unionTree(
    zoneCollections.Deck,
    zoneCollections.Inspection,
    zoneCollections.Hand
  )
)
export const playerCardsThatNeedBacks = cardsThatNeedBacks.intersect(
  PlayerComponent.entities
)
export const opponentCardsThatNeedBacks = TrackableCollection.unionTree(
  cardsThatNeedBacks,
  zoneCollections.CardSelection,
  zoneCollections.OptimisticHand,
  zoneCollections.Conjuring,
  zoneCollections.Staging,
  zoneCollections.OptimisticCasting
).exclude(PlayerComponent.entities)
