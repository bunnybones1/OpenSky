import { Entity } from 'gg'

import { Components } from '~/components'
import AttachmentCancellerComponent from '~/components/AttachmentCancellerComponent'
import CollidableComponent from '~/components/CollidableComponent'
import DeckComponent from '~/components/DeckComponent'
import DraggingComponent from '~/components/DraggingComponent'
import FrontFacesVisibleComponent from '~/components/FrontFacesVisibleComponent'
import InspectableComponent from '~/components/InspectableComponent'
import InteractiveIndicatorsComponent from '~/components/InteractiveIndicatorsComponent'
import IsAnimatingComponent from '~/components/IsAnimatingComponent'
import PlayableComponent from '~/components/PlayableComponent'
import SelectableComponent from '~/components/SelectableComponent'
import TargetableComponent from '~/components/TargetableComponent'
import TransformComponent from '~/components/TransformComponent'
import {
  ownedZoneCollections,
  zoneCollections
} from '~/helpers/zoneCollections'
import { TrackableCollection } from '~/utils/TrackableCollection'

import { isEntityInZone } from './animation/zoneUtils'

type E = Entity<Components>
type NE = E | undefined

const indicatablePlayable = TrackableCollection.intersect(
  PlayableComponent.entities,
  InteractiveIndicatorsComponent.entities
)
const indicatablePlayableDragging = TrackableCollection.intersect(
  indicatablePlayable,
  DraggingComponent.entities
)
const transformAndCollidable = TrackableCollection.intersect(
  TransformComponent.entities,
  CollidableComponent.entities
)

const maybeTargetableEntities = TargetableComponent.entities.exclude(
  IsAnimatingComponent.entities
)

const interactiveEntities = transformAndCollidable
  .intersect(
    TrackableCollection.unionTree(
      PlayableComponent.entities,
      maybeTargetableEntities,
      InspectableComponent.entities,
      SelectableComponent.entities
    )
  )
  .intersect(FrontFacesVisibleComponent.entities.union(DeckComponent.entities))
  .exclude(DraggingComponent.entities)
  .union(ownedZoneCollections.Player_Field)
  .union(ownedZoneCollections.Player_Hand)
  .union(ownedZoneCollections.Player_HeroAbility)

const targetableEntities = transformAndCollidable.intersect(
  maybeTargetableEntities
)

const targetableOrHandEntities = targetableEntities
  .union(ownedZoneCollections.Player_Hand)
  .union(AttachmentCancellerComponent.entities)

const targetableOrHandOrFieldEntities = targetableOrHandEntities.union(
  zoneCollections.Field
)

export const dragCollections = {
  indicatablePlayable,
  indicatablePlayableDragging,
  transformAndCollidable,
  maybeTargetableEntities,
  interactiveEntities,
  targetableEntities,
  targetableOrHandEntities,
  targetableOrHandOrFieldEntities
}

export function parentCardIfAttachedToHandCard(cardE: NE) {
  if (cardE && cardE.has('attachedTo')) {
    const parentE = cardE.get('attachedTo').entity
    if (isEntityInZone(parentE, 'Hand')) {
      return parentE
    }
  }
  return cardE
}
