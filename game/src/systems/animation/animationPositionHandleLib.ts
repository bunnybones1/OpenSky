import { Vector3 } from 'three'

import { CardStatus } from '~/types'

export const nullHandle = new Vector3(0, 0, 0)
const fieldArriveHandle = new Vector3(0, 0.05, -0.275)
const fieldDepartHandle = new Vector3(0, 0.05, -0.075)
const stagingStartHandle = new Vector3(0, 0, 0)
const stagingEndHandle = new Vector3(0, 0.1, 0.05)
const castingStartHandle = new Vector3(0, 0.6, 0)
const optimisticCastingStartHandle = new Vector3(0, -0.1, 0)
const behindCardHandle = new Vector3(0, -0.1, 0)
const inFrontOfCardHandle = new Vector3(0, 0.1, 0)
const cardSelectUpHandle = new Vector3(0, -0.15, 0)
const cardSelectDownHandle = cardSelectUpHandle.clone().multiplyScalar(-1)
const heroAbilityStagingStartHandle = new Vector3(0, 0, -0.02)

type HandleType =
  | 'nullHandle'
  | 'stagingStartHandle'
  | 'stagingEndHandle'
  | 'castingStartHandle'
  | 'optimisticCastingStartHandle'
  | 'castingEndQueueHandle'
  | 'castingEndAloneHandle'
  | 'graveyardHandle'
  | 'deckHandle'
  | 'behindCardHandle'
  | 'inFrontOfCardHandle'
  | 'handHandle'
  | 'handSummonHandle'
  | 'handDiscardHandle'
  | 'cardSelectHandle'
  | 'fieldArriveHandle'
  | 'fieldDepartHandle'
  | 'heroAbilityStagingStartHandle'

const __playerDrawCardMotionHandles: { [K in HandleType]: Vector3 } = {
  nullHandle,
  stagingStartHandle,
  stagingEndHandle,
  castingStartHandle,
  optimisticCastingStartHandle,
  castingEndQueueHandle: new Vector3(-0.05, 0.2, -0.1),
  castingEndAloneHandle: new Vector3(-0.05, 0.2, -0.1),
  graveyardHandle: new Vector3(0.1, 0.175, -0.15),
  deckHandle: new Vector3(0.2, -0.3, 0.3),
  behindCardHandle,
  inFrontOfCardHandle,
  handHandle: new Vector3(0, 0.1, -0.1),
  handSummonHandle: new Vector3(0, 0, -0.1),
  handDiscardHandle: new Vector3(0, -0.3, -0.2),
  cardSelectHandle: cardSelectUpHandle,
  fieldArriveHandle,
  fieldDepartHandle,
  heroAbilityStagingStartHandle
}

const __opponentDrawCardMotionHandles: { [K in HandleType]: Vector3 } = {
  nullHandle,
  stagingStartHandle,
  stagingEndHandle,
  castingStartHandle,
  optimisticCastingStartHandle,
  castingEndQueueHandle: new Vector3(-0.2, 0.2, 0),
  castingEndAloneHandle: new Vector3(-0.2, 0.2, 0),
  graveyardHandle: new Vector3(0.1, 0.175, 0),
  deckHandle: new Vector3(0.2, -0.3, 0),
  behindCardHandle,
  inFrontOfCardHandle,
  handHandle: new Vector3(0, 0.15, 0.3),
  handSummonHandle: new Vector3(0, 0, 0.5),
  handDiscardHandle: new Vector3(0, -0.05, 0.3),
  cardSelectHandle: cardSelectDownHandle,
  fieldArriveHandle,
  fieldDepartHandle,
  heroAbilityStagingStartHandle
} as const

const zoneHandleMap: { [K in CardStatus]: HandleType } = {
  Deck: 'deckHandle',
  Hand: 'handHandle',
  Field: 'fieldArriveHandle',
  Graveyard: 'graveyardHandle',
  Dust: 'nullHandle',
  Attachment: 'inFrontOfCardHandle',
  Limbo: 'nullHandle',
  Casting: 'castingStartHandle',
  OptimisticCasting: 'optimisticCastingStartHandle',
  CardSelection: 'cardSelectHandle',
  Conjuring: 'nullHandle',
  Staging: 'stagingStartHandle',
  Reward: 'nullHandle',
  HeroReward: 'nullHandle',
  DualPrismHeroReward: 'nullHandle',
  ConquestPotentialReward: 'nullHandle',
  ConquestReward: 'nullHandle',
  DisabledReward: 'nullHandle',
  UseState: 'nullHandle',
  Dragging: 'nullHandle',
  Void: 'nullHandle',
  OptimisticHand: 'handHandle',
  Inspection: 'nullHandle',
  HeroAbility: 'nullHandle',
  HeroAbilityStaging: 'heroAbilityStagingStartHandle',
  Drafting: 'nullHandle'
}

export function getCardMotionHandles(player: boolean) {
  return player
    ? __playerDrawCardMotionHandles
    : __opponentDrawCardMotionHandles
}

export function getCardMotionHandle(player: boolean, zone: CardStatus) {
  return (
    player ? __playerDrawCardMotionHandles : __opponentDrawCardMotionHandles
  )[zoneHandleMap[zone]]
}
