import {
  BaseCard,
  PhaseResolveCardEffect,
  PhaseResolveTrigger
} from '@skyweaver/state-metadata'
import { Entity } from 'gg'

import { CardCacheWithEntities } from '~/cardCache'
import { Components } from '~/components'
import { ownedZoneCollections } from '~/helpers/zoneCollections'
import { PlayerInfo } from '~/state/stores/MatchInfoStore'

import { ActionStack } from '../AnimationOrchestrator'

export function isPayloadEffectTypeGenericAndPayloadEffectIntrinsic(): (
  context?: ActionStack,
  cardCache?: CardCacheWithEntities,
  payload?: PhaseResolveCardEffect | PhaseResolveTrigger,
  playerInfo?: PlayerInfo,
  entity?: Entity<Components>
) => BaseCard | null | undefined | boolean {
  return (
    _context?: ActionStack,
    _cardCache?: CardCacheWithEntities,
    _payload?: PhaseResolveTrigger,
    _playerInfo?: PlayerInfo,
    _entity?: Entity<Components>
  ) => {
    return (
      _payload?.effectType === 'Generic' &&
      typeof _payload.effect === 'object' &&
      'Intrinsic' in _payload.effect &&
      _payload.effect.Intrinsic
    )
  }
}

export function isPayloadEffectTypeSunsetAndPayloadEffectIntrinsic(): (
  context?: ActionStack,
  cardCache?: CardCacheWithEntities,
  payload?: PhaseResolveCardEffect | PhaseResolveTrigger,
  playerInfo?: PlayerInfo,
  entity?: Entity<Components>
) => BaseCard | null | undefined | boolean {
  return (
    _context?: ActionStack,
    _cardCache?: CardCacheWithEntities,
    payload?: PhaseResolveTrigger,
    _playerInfo?: PlayerInfo,
    _entity?: Entity<Components>
  ) => {
    return (
      payload &&
      payload.effectType === 'Sunset' &&
      typeof payload.effect === 'object' &&
      'Intrinsic' in payload.effect &&
      payload.effect.Intrinsic
    )
  }
}

export function isPayloadEffectTypeSunriseAndPayloadEffectIntrinsic(): (
  context?: ActionStack,
  cardCache?: CardCacheWithEntities,
  payload?: PhaseResolveCardEffect | PhaseResolveTrigger,
  playerInfo?: PlayerInfo,
  entity?: Entity<Components>
) => BaseCard | null | undefined | boolean {
  return (
    _context?: ActionStack,
    _cardCache?: CardCacheWithEntities,
    payload?: PhaseResolveTrigger,
    _playerInfo?: PlayerInfo,
    _entity?: Entity<Components>
  ) => {
    return (
      payload &&
      payload.effectType === 'Sunrise' &&
      typeof payload.effect === 'object' &&
      'Intrinsic' in payload.effect &&
      payload.effect.Intrinsic
    )
  }
}

export function isPayloadEffectTypeSummonAndPayloadEffectIntrinsic(): (
  context?: ActionStack,
  cardCache?: CardCacheWithEntities,
  payload?: PhaseResolveCardEffect | PhaseResolveTrigger,
  playerInfo?: PlayerInfo,
  entity?: Entity<Components>
) => BaseCard | null | undefined | boolean {
  return (
    _context?: ActionStack,
    _cardCache?: CardCacheWithEntities,
    payload?: PhaseResolveTrigger,
    _playerInfo?: PlayerInfo,
    _entity?: Entity<Components>
  ) => {
    return (
      payload &&
      payload.effectType === 'Summon' &&
      typeof payload.effect === 'object' &&
      'Intrinsic' in payload.effect &&
      payload.effect.Intrinsic
    )
  }
}

export function rarityOfSpellBeingPlayedIsBase(
  context: ActionStack,
  cardCache: CardCacheWithEntities
) {
  return (
    context.playerAction[1].type === 'PlayCard' &&
    cardCache.getInstance(context.playerAction[1].cardID)?.state.view.type ===
      'spell' &&
    cardCache.getInstance(context.playerAction[1].cardID)?.state.view.rarity ===
      'base'
  )
}

export function rarityOfSpellBeingPlayedIsSilver(
  context: ActionStack,
  cardCache: CardCacheWithEntities
) {
  return (
    context.playerAction[1].type === 'PlayCard' &&
    cardCache.getInstance(context.playerAction[1].cardID)?.state.view.type ===
      'spell' &&
    cardCache.getInstance(context.playerAction[1].cardID)?.state.view.rarity ===
      'silver'
  )
}

export function rarityOfSpellBeingPlayedIsGold(
  context: ActionStack,
  cardCache: CardCacheWithEntities
) {
  return (
    context.playerAction[1].type === 'PlayCard' &&
    cardCache.getInstance(context.playerAction[1].cardID)?.state.view.type ===
      'spell' &&
    cardCache.getInstance(context.playerAction[1].cardID)?.state.view.rarity ===
      'gold'
  )
}

export function thisSpellIsBeingPlayedAndHasOpposingTargets(
  context: ActionStack,
  cardCache: CardCacheWithEntities,
  payload?: PhaseResolveCardEffect
) {
  const opposingFieldCount = cardCache.getEntity(payload?.id)?.has('player')
    ? ownedZoneCollections.Opponent_Field.length - 1
    : ownedZoneCollections.Player_Field.length - 1

  return (
    payload &&
    context.playerAction[1].type === 'PlayCard' &&
    cardCache.getInstance(payload.id)?.state.view.type === 'spell' &&
    opposingFieldCount > 0 &&
    payload.baseCard
  )
}

export function thisUnitTriggersFromAttack(
  context: ActionStack,
  _cardCache?: CardCacheWithEntities,
  _payload?: PhaseResolveCardEffect
) {
  return (
    context &&
    context.playerAction[1].type === 'Attack' &&
    context.parentPhase &&
    context.parentPhase.type === 'ResolveTrigger' &&
    typeof context.parentPhase.payload.effect === 'object' &&
    'Intrinsic' in context.parentPhase.payload.effect &&
    context.parentPhase.payload.effect.Intrinsic
  )
}

export function thisUnitIsTriggeringDeathEffect(
  _context: ActionStack,
  _cardCache: CardCacheWithEntities,
  payload?: PhaseResolveTrigger
) {
  return (
    payload &&
    typeof payload === 'object' &&
    'effectType' in payload &&
    payload.effectType === 'Death' &&
    typeof payload.effect === 'object' &&
    'Intrinsic' in payload.effect &&
    payload.effect.Intrinsic
  )
}

export function thisUnitIsTriggeringDeathEffectAndHasAllyUnits(
  _context: ActionStack,
  cardCache: CardCacheWithEntities,
  payload?: PhaseResolveTrigger
) {
  const cardID =
    payload &&
    typeof payload === 'object' &&
    'effectType' in payload &&
    payload.effectType === 'Death' &&
    typeof payload.effect === 'object' &&
    'Intrinsic' in payload.effect &&
    payload.effect.Intrinsic

  if (cardID) {
    if (payload.id) {
      const entity = cardCache.getEntity(payload.id)
      if (entity) {
        const owner = entity.has('player') ? 'Player' : 'Opponent'
        const fieldCount = ownedZoneCollections[`${owner}_Field`].items
        if (fieldCount.length > 1) {
          return cardID
        }
      }
    }
  }
  return undefined
}

export function thisUnitIsTriggeringSummonEffect(
  _context: ActionStack,
  _cardCache: CardCacheWithEntities,
  payload?: PhaseResolveTrigger
) {
  return (
    payload &&
    typeof payload === 'object' &&
    'effectType' in payload &&
    payload.effectType === 'Summon' &&
    typeof payload.effect === 'object' &&
    'Intrinsic' in payload.effect &&
    payload.effect.Intrinsic
  )
}

export function thisUnitIsTriggeringSlayEffect(
  _context: ActionStack,
  _cardCache: CardCacheWithEntities,
  payload?: PhaseResolveTrigger
) {
  return (
    payload &&
    typeof payload === 'object' &&
    'effectType' in payload &&
    payload.effectType === 'Slay' &&
    typeof payload.effect === 'object' &&
    'Intrinsic' in payload.effect &&
    payload.effect.Intrinsic
  )
}

export function thisSpellIsBeingPlayed(
  context: ActionStack,
  cardCache: CardCacheWithEntities,
  payload?: PhaseResolveCardEffect
) {
  return (
    payload &&
    context.playerAction[1].type === 'PlayCard' &&
    cardCache.getInstance(payload.id)?.state.view.type === 'spell' &&
    payload.baseCard
  )
}

export function thisUnitIsBeingPlayed(
  context: ActionStack,
  cardCache: CardCacheWithEntities,
  payload?: PhaseResolveCardEffect
) {
  return (
    payload &&
    context.playerAction[1].type === 'PlayCard' &&
    cardCache.getInstance(payload.id)?.state.view.type === 'unit' &&
    payload.baseCard
  )
}

export function thisUnitIsBeingSummoned(
  _context: ActionStack,
  _cardCache: CardCacheWithEntities,
  payload: PhaseResolveTrigger
) {
  return (
    payload &&
    payload.effectType === 'Summon' &&
    typeof payload.effect === 'object' &&
    'Intrinsic' in payload.effect &&
    payload.effect.Intrinsic
  )
}

export function isPlayerActionPlayCardAndPayloadPhaseResolveCardEffect(
  context: ActionStack,
  _cardCache: CardCacheWithEntities,
  payload: PhaseResolveCardEffect
) {
  return (
    context &&
    context.playerAction[1].type === 'PlayCard' &&
    payload &&
    typeof payload === 'object' &&
    'baseCard' in payload &&
    payload.baseCard
  )
}

export function isParentPhaseResolveTriggerAndPayloadIntrinsic(
  context: ActionStack
) {
  return (
    context.parentPhase &&
    context.parentPhase.type === 'ResolveTrigger' &&
    typeof context.parentPhase.payload.effect === 'object' &&
    'Intrinsic' in context.parentPhase.payload.effect &&
    context.parentPhase.payload.effect.Intrinsic
  )
}

export function isTopPhaseResolveTriggerAndPayloadIntrinsic(
  context: ActionStack
) {
  return (
    context.topPhase &&
    context.topPhase.type === 'ResolveTrigger' &&
    typeof context.topPhase.payload.effect === 'object' &&
    'Intrinsic' in context.topPhase.payload.effect &&
    context.topPhase.payload.effect.Intrinsic
  )
}

export function isPlayerActionAttackAndParentPhaseResolveTriggerWithTriggerSource(
  context: ActionStack,
  cardCache: CardCacheWithEntities
) {
  return (
    context.playerAction[1].type === 'Attack' &&
    context.parentPhase &&
    context.parentPhase.type === 'ResolveTrigger' &&
    cardCache.getInstance(context.triggerSource?.id)?.base
  )
}

export function isPlayerActionPlayCardAndTopPhaseResolveCardEffectWithTopPhasePayload(
  context: ActionStack
) {
  return (
    context.playerAction[1].type === 'PlayCard' &&
    context.topPhase &&
    context.topPhase.type === 'ResolveCardEffect' &&
    context.topPhase.payload.baseCard
  )
}

export function isPlayerActionPlayCardAndParentPhaseNullAndTopPhaseResolveCardEffectWithTopPhasePayload(
  context: ActionStack
) {
  return (
    context.playerAction[1].type === 'PlayCard' &&
    context.parentPhase === null &&
    context.topPhase &&
    context.topPhase.type === 'ResolveCardEffect' &&
    context.topPhase.payload.baseCard
  )
}

export function isPlayerActionPlayCardAndParentPhaseResolveTriggerWithTriggerSource(
  context: ActionStack,
  cardCache: CardCacheWithEntities
) {
  return (
    context.playerAction[1].type === 'PlayCard' &&
    context.parentPhase &&
    context.parentPhase.type === 'ResolveTrigger' &&
    cardCache.getInstance(context.triggerSource?.id)?.base
  )
}

export function isPlayerActionPlayCardAndParentPhaseResolveTriggerAndTopPhaseDamageWithTriggerSource(
  context: ActionStack,
  cardCache: CardCacheWithEntities
) {
  return (
    context.playerAction[1].type === 'PlayCard' &&
    context.parentPhase &&
    context.parentPhase.type === 'ResolveTrigger' &&
    context.topPhase &&
    context.topPhase.type === 'Damage' &&
    cardCache.getInstance(context.triggerSource?.id)?.base
  )
}

export function isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseDamageWithParentPhasePayload(
  context: ActionStack
) {
  return (
    context.playerAction[1].type === 'PlayCard' &&
    context.parentPhase &&
    context.parentPhase.type === 'ResolveCardEffect' &&
    context.topPhase &&
    context.topPhase.type === 'Damage' &&
    context.parentPhase.payload.baseCard
  )
}

export function isPlayerActionPlayCardAndParentPhaseResolveTriggerAndTopPhaseResolveTriggerWithTopPhasePayloadIntrinsic(
  context: ActionStack
) {
  return (
    context.playerAction[1].type === 'PlayCard' &&
    context.parentPhase &&
    context.parentPhase.type === 'ResolveTrigger' &&
    context.topPhase &&
    context.topPhase.type === 'ResolveTrigger' &&
    typeof context.topPhase.payload.effect === 'object' &&
    'Intrinsic' in context.topPhase.payload.effect &&
    context.topPhase.payload.effect.Intrinsic
  )
}

export function isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseResolveCardEffectWithParentPhasePayload(
  context: ActionStack
) {
  return (
    context.playerAction[1].type === 'PlayCard' &&
    context.parentPhase &&
    context.parentPhase.type === 'ResolveCardEffect' &&
    context.topPhase &&
    context.topPhase.type === 'ResolveCardEffect' &&
    context.parentPhase.payload.baseCard
  )
}

export function entityOwnerEqualToParentPhaseResolveCardEffectPayloadOwner():
  | ((
      entity: Entity<Components>,
      context?: ActionStack,
      cardCache?: CardCacheWithEntities
    ) => boolean)
  | undefined {
  return (
    entity: Entity<Components>,
    context: ActionStack,
    cardCache: CardCacheWithEntities
  ) => {
    let restriction =
      context.parentPhase &&
      context.parentPhase.type === 'ResolveCardEffect' &&
      // within the pp=RCE context, if spellOwner (from payload) === modifiedEntityOwner --> return out
      cardCache.getEntity(context.parentPhase.payload.id)?.get('zone').current
        .owner === entity.get('zone').current.owner
    if (!restriction) {
      restriction = false
    }
    return restriction
  }
}

export function entityOwnerNotEqualToParentPhaseResolveCardEffectPayloadOwner():
  | ((
      entity: Entity<Components>,
      context?: ActionStack,
      cardCache?: CardCacheWithEntities
    ) => boolean)
  | undefined {
  return (
    entity: Entity<Components>,
    context: ActionStack,
    cardCache: CardCacheWithEntities
  ) => {
    let restriction =
      context.parentPhase &&
      context.parentPhase.type === 'ResolveCardEffect' &&
      cardCache.getEntity(context.parentPhase.payload.id)?.get('zone').current
        .owner !== entity.get('zone').current.owner
    if (!restriction) {
      restriction = false
    }
    return restriction
  }
}

export function entityOwnerNotEqualTopPhaseResolveCardEffectPayloadOwner():
  | ((
      entity: Entity<Components>,
      context?: ActionStack,
      cardCache?: CardCacheWithEntities
    ) => boolean)
  | undefined {
  return (
    entity: Entity<Components>,
    context: ActionStack,
    cardCache: CardCacheWithEntities
  ) => {
    let restriction =
      context.topPhase &&
      context.topPhase.type === 'ResolveCardEffect' &&
      cardCache.getEntity(context.topPhase.payload.id)?.get('zone').current
        .owner !== entity.get('zone').current.owner
    if (!restriction) {
      restriction = false
    }
    return restriction
  }
}

export function entityHasHero():
  | ((entity: Entity<Components>) => boolean)
  | undefined {
  return (entity: Entity<Components>) => {
    return entity.has('hero')
  }
}

export function contextChecker(
  context: ActionStack,
  cardCache: CardCacheWithEntities,
  payload?: PhaseResolveCardEffect,
  log: boolean = true
) {
  let card: BaseCard | false | undefined | null
  for (const contextCheck of [
    thisSpellIsBeingPlayed,
    isTopPhaseResolveTriggerAndPayloadIntrinsic,
    isParentPhaseResolveTriggerAndPayloadIntrinsic,
    isPlayerActionAttackAndParentPhaseResolveTriggerWithTriggerSource,
    isPlayerActionPlayCardAndTopPhaseResolveCardEffectWithTopPhasePayload,
    isPlayerActionPlayCardAndParentPhaseResolveTriggerWithTriggerSource,
    isPlayerActionPlayCardAndParentPhaseResolveTriggerAndTopPhaseDamageWithTriggerSource,
    isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseDamageWithParentPhasePayload,
    isPlayerActionPlayCardAndParentPhaseResolveTriggerAndTopPhaseResolveTriggerWithTopPhasePayloadIntrinsic,
    isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseResolveCardEffectWithParentPhasePayload
  ]) {
    card = contextCheck(context, cardCache, payload)
    if (card) {
      if (log) {
        console.log(`${contextCheck.name} found ${card}`)
      }

      break
    }
  }
  return card
}
