import {
  BaseCard,
  PhaseResolveCardEffect,
  PhaseResolveTrigger
} from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import { Vector2, Vector3 } from 'three'

import { isConquestIsland } from '~/arenaSettings'
import { CardCacheWithEntities } from '~/cardCache'
import { Components } from '~/components'
import { getHero } from '~/helpers/effectHelpers'
import { PaletteName } from '~/helpers/meshAnimationHelpers'
import { isTitan, titanSummonPaletteMap } from '~/helpers/meshAnimationMaps'
import {
  adjustToInfrontOfCard,
  adjustToMidFieldCenter,
  adjustToOpposingFieldCenter,
  adjustToOverOwnerGraveyard,
  adjustToOwnerFieldCenter,
  adjustToUnderneathCard,
  attachToScene,
  cardCastingAdjustments,
  horikVengeanceAdjustments,
  OpposingHero,
  puddleChasmAdjustments,
  spellOwnerHero,
  targetInstanceElement
} from '~/helpers/meshAnimationUtils'
import { ownedZoneCollections } from '~/helpers/zoneCollections'
import { scene } from '~/scenes/arena/scene'
import { PlayerInfo } from '~/state/stores/MatchInfoStore'
import { animationDelay } from '~/utils/asyncUtils'

import { ActionStack } from '../AnimationOrchestrator'
import {
  entityHasHero,
  entityOwnerEqualToParentPhaseResolveCardEffectPayloadOwner,
  entityOwnerNotEqualToParentPhaseResolveCardEffectPayloadOwner,
  entityOwnerNotEqualTopPhaseResolveCardEffectPayloadOwner,
  isParentPhaseResolveTriggerAndPayloadIntrinsic,
  isPayloadEffectTypeGenericAndPayloadEffectIntrinsic,
  isPayloadEffectTypeSummonAndPayloadEffectIntrinsic,
  isPayloadEffectTypeSunriseAndPayloadEffectIntrinsic,
  isPayloadEffectTypeSunsetAndPayloadEffectIntrinsic,
  isPlayerActionAttackAndParentPhaseResolveTriggerWithTriggerSource,
  isPlayerActionPlayCardAndParentPhaseNullAndTopPhaseResolveCardEffectWithTopPhasePayload,
  isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseDamageWithParentPhasePayload,
  isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseResolveCardEffectWithParentPhasePayload,
  isPlayerActionPlayCardAndParentPhaseResolveTriggerAndTopPhaseDamageWithTriggerSource,
  isPlayerActionPlayCardAndParentPhaseResolveTriggerAndTopPhaseResolveTriggerWithTopPhasePayloadIntrinsic,
  isPlayerActionPlayCardAndParentPhaseResolveTriggerWithTriggerSource,
  isPlayerActionPlayCardAndPayloadPhaseResolveCardEffect,
  isPlayerActionPlayCardAndTopPhaseResolveCardEffectWithTopPhasePayload,
  isTopPhaseResolveTriggerAndPayloadIntrinsic,
  rarityOfSpellBeingPlayedIsBase,
  rarityOfSpellBeingPlayedIsGold,
  rarityOfSpellBeingPlayedIsSilver,
  thisSpellIsBeingPlayed,
  thisSpellIsBeingPlayedAndHasOpposingTargets,
  thisUnitIsBeingPlayed,
  thisUnitIsBeingSummoned,
  thisUnitIsTriggeringDeathEffect,
  thisUnitIsTriggeringDeathEffectAndHasAllyUnits,
  thisUnitIsTriggeringSlayEffect,
  thisUnitIsTriggeringSummonEffect,
  thisUnitTriggersFromAttack
} from './contextUtils'
import { Easing } from './Easing'
import { MeshAnimationEventName, MSAComposition } from './meshAnimationTypes'
import { simpleTweener } from './tweeners'

//  Search with
//  '[0-9]+' /\*(\s+([A-Z-',!()a-z0-9]+\s+)+)\*/
//  For all card entries

export const meshAnimationLibrary: Map<
  BaseCard | MeshAnimationEventName,
  MSAComposition[]
> = new Map()

meshAnimationLibrary.set('genericElementBasedTrigger', [
  {
    contextCheck: (
      _context?: ActionStack,
      _cardCache?: CardCacheWithEntities,
      _payload?: PhaseResolveTrigger,
      _playerInfo?: PlayerInfo,
      _entity?: Entity<Components>
    ) => {
      return (
        _entity &&
        _entity.has('cardInstance') &&
        _entity.get('cardInstance').state.view.element === 'fire'
      )
    },
    layers: [
      {
        mesh: 'fire_trigger_MSA',
        placement: adjustToInfrontOfCard
      }
    ]
  },
  {
    contextCheck: (
      _context?: ActionStack,
      _cardCache?: CardCacheWithEntities,
      _payload?: PhaseResolveTrigger,
      _playerInfo?: PlayerInfo,
      _entity?: Entity<Components>
    ) => {
      return (
        _entity &&
        _entity.has('cardInstance') &&
        _entity.get('cardInstance').state.view.element === 'light'
      )
    },
    layers: [
      {
        mesh: 'light_trigger_MSA',
        placement: adjustToInfrontOfCard
      }
    ]
  },
  {
    contextCheck: (
      _context?: ActionStack,
      _cardCache?: CardCacheWithEntities,
      _payload?: PhaseResolveTrigger,
      _playerInfo?: PlayerInfo,
      _entity?: Entity<Components>
    ) => {
      return (
        _entity &&
        _entity.has('cardInstance') &&
        _entity.get('cardInstance').state.view.element === 'water'
      )
    },
    layers: [
      {
        mesh: 'water_trigger_MSA',
        placement: adjustToInfrontOfCard
      }
    ]
  },
  {
    contextCheck: (
      _context?: ActionStack,
      _cardCache?: CardCacheWithEntities,
      _payload?: PhaseResolveTrigger,
      _playerInfo?: PlayerInfo,
      _entity?: Entity<Components>
    ) => {
      return (
        _entity &&
        _entity.has('cardInstance') &&
        _entity.get('cardInstance').state.view.element === 'metal'
      )
    },
    layers: [
      {
        mesh: 'metal_trigger_MSA',
        placement: adjustToInfrontOfCard
      }
    ]
  },
  {
    contextCheck: (
      _context?: ActionStack,
      _cardCache?: CardCacheWithEntities,
      _payload?: PhaseResolveTrigger,
      _playerInfo?: PlayerInfo,
      _entity?: Entity<Components>
    ) => {
      return (
        _entity &&
        _entity.has('cardInstance') &&
        _entity.get('cardInstance').state.view.element === 'mind'
      )
    },
    layers: [
      {
        mesh: 'mind_trigger_MSA',
        placement: adjustToInfrontOfCard
      }
    ]
  },
  {
    contextCheck: (
      _context?: ActionStack,
      _cardCache?: CardCacheWithEntities,
      _payload?: PhaseResolveTrigger,
      _playerInfo?: PlayerInfo,
      _entity?: Entity<Components>
    ) => {
      return (
        _entity &&
        _entity.has('cardInstance') &&
        (_entity.get('cardInstance').state.view.element === 'earth' ||
          _entity.get('cardInstance').state.view.element === 'dark' ||
          _entity.get('cardInstance').state.view.element === 'air')
      )
    },
    layers: [
      {
        mesh: 'generic_trigger_MSA',
        paletteOverride: (entity: Entity<Components>) => {
          if (entity.has('cardInstance')) {
            const element = entity.get('cardInstance').state.view
              .element as PaletteName
            return element
          } else {
            return undefined
          }
        },
        placement: adjustToInfrontOfCard
      }
    ]
  }
])

for (const card of ['1156' /* Flame Kick */] as const) {
  meshAnimationLibrary.set(card, [
    {
      type: 'impact',
      contextCheck(context) {
        return (
          context &&
          context.playerAction[1].type === 'PlayCard' &&
          context.triggerSource &&
          typeof context.triggerSource === 'object' &&
          'baseCard' in context.triggerSource &&
          context.triggerSource.baseCard
        )
      },
      missileOverride: 'fireTrailOnly',
      layers: [
        {
          mesh: 'explosion_poof_MSA',
          shakerCamDeltaOffset: 0.02,
          postBuildOffset: new Vector3(0, 0, -0.035)
        },
        {
          mesh: 'explosion_bloom_MSA',
          shakerCamDeltaOffset: 0.02,
          postBuildOffset: new Vector3(0, 0, -0.035)
        },
        {
          mesh: 'explosion_trace_MSA',
          shakerCamDeltaOffset: 0.02,
          postBuildOffset: new Vector3(0, 0, -0.035)
        },
        {
          mesh: 'explosion_base_MSA',
          shakerCamDeltaOffset: 0.02,
          postBuildOffset: new Vector3(0, 0, -0.035)
        }
      ]
    }
  ])
}

for (const card of [
  '20029' /* Vile Vial */,
  '3142' /* Bloatboid */,
  '3010' /* Doom Shroom */,
  '3009' /* Swamp Walker */,
  '1129' /* Vile Deal */,
  '1' /* Foul Stench */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      type: 'impact',
      contextCheck() {
        return true
      },
      missileOverride: 'poisonMissile',
      layers: [
        {
          mesh: 'lava_puddle_crack_poison_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride() {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(targetEntity, effect, true)
          },
          sfx:
            card === '20029' || card === '1129'
              ? [
                  {
                    id: '20029-Impact-',
                    ownerCheck: (entity: Entity<Components>) => {
                      return !entity.has('player')
                    }
                  }
                ]
              : undefined
        },
        {
          mesh: 'lava_puddle_bubbles_base_poison_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride() {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(
              targetEntity,
              effect,
              false,
              false,
              new Vector3(0, -0.008, -0.008),
              1.2
            )
          }
        },
        {
          mesh: 'lava_puddle_bubbles_trail_poison_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride() {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(
              targetEntity,
              effect,
              false,
              false,
              new Vector3(0, -0.008, -0.008),
              1.2
            )
          }
        },
        {
          mesh: 'lava_puddle_main_bubble_poison_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride() {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(
              targetEntity,
              effect,
              false,
              false,
              new Vector3(0, -0.008, -0.008),
              1.1
            )
          }
        },
        {
          mesh: 'lava_puddle_flames_trace_poison_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride() {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(
              targetEntity,
              effect,
              false,
              false,
              new Vector3(0, -0.008, 0.002)
            )
          }
        },
        {
          mesh: 'lava_puddle_flames_bloom_poison_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride() {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(
              targetEntity,
              effect,
              false,
              false,
              new Vector3(0, -0.008, 0.002)
            )
          }
        },
        {
          mesh: 'lava_puddle_flames_base_poison_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride() {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(
              targetEntity,
              effect,
              false,
              false,
              new Vector3(0, -0.008, 0.002)
            )
          }
        }
      ]
    },
    card === '20029' || card === '1129'
      ? {
          contextCheck: thisSpellIsBeingPlayed,
          layers: [
            {
              mesh: undefined,
              sfx: [
                {
                  id: '20029-Flight-',
                  ownerCheck: (entity: Entity<Components>) => {
                    return !entity.has('player')
                  }
                }
              ]
            }
          ]
        }
      : {
          contextCheck: thisSpellIsBeingPlayed,
          layers: [{ mesh: undefined }]
        }
  ])
}

for (const card of ['4024' /* Volcanic Potion */] as const) {
  meshAnimationLibrary.set(card, [
    {
      type: 'impact',
      contextCheck() {
        return true
      },
      missileOverride: 'fireTrailOnly',
      layers: [
        {
          mesh: 'lava_puddle_crack_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride() {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(targetEntity, effect, true)
          },
          sfx: [
            {
              id: '20029-Impact-',
              ownerCheck: (entity: Entity<Components>) => {
                return !entity.has('player')
              }
            }
          ]
        },
        {
          mesh: 'lava_puddle_bubbles_base_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride() {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(
              targetEntity,
              effect,
              false,
              false,
              new Vector3(0, -0.008, -0.008),
              1.2
            )
          }
        },
        {
          mesh: 'lava_puddle_bubbles_trail_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride() {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(
              targetEntity,
              effect,
              false,
              false,
              new Vector3(0, -0.008, -0.008),
              1.2
            )
          }
        },
        {
          mesh: 'lava_puddle_main_bubble_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride() {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(
              targetEntity,
              effect,
              false,
              false,
              new Vector3(0, -0.008, -0.008),
              1.1
            )
          }
        },
        {
          mesh: 'lava_puddle_flames_trace_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride() {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(
              targetEntity,
              effect,
              false,
              false,
              new Vector3(0, -0.008, 0.002)
            )
          }
        },
        {
          mesh: 'lava_puddle_flames_bloom_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride() {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(
              targetEntity,
              effect,
              false,
              false,
              new Vector3(0, -0.008, 0.002)
            )
          }
        },
        {
          mesh: 'lava_puddle_flames_base_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride() {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(
              targetEntity,
              effect,
              false,
              false,
              new Vector3(0, -0.008, 0.002)
            )
          }
        },
        {
          mesh: 'lava_puddle_embers_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride() {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(
              targetEntity,
              effect,
              false,
              false,
              new Vector3(0, -0.008, -0.008)
            )
          }
        }
      ]
    }
  ])
}

for (const card of ['3003' /* Flame Phoenix */] as const) {
  meshAnimationLibrary.set(card, [
    {
      type: 'impact',
      contextCheck() {
        return true
      },
      missileOverride: 'fireTrailOnly',
      layers: [
        {
          mesh: 'explosion_poof_MSA',
          shakerCamDeltaOffset: 0.02,
          scale: new Vector2(2, 2),
          postBuildOffset: new Vector3(0, 0, -0.035),

          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
          }
        },
        {
          mesh: 'explosion_bloom_MSA',
          shakerCamDeltaOffset: 0.02,
          scale: new Vector2(2, 2),
          postBuildOffset: new Vector3(0, 0, -0.035),

          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
          }
        },
        {
          mesh: 'explosion_trace_MSA',
          shakerCamDeltaOffset: 0.02,
          scale: new Vector2(2, 2),
          postBuildOffset: new Vector3(0, 0, -0.035),

          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
          }
        },
        {
          mesh: 'explosion_base_MSA',
          shakerCamDeltaOffset: 0.02,
          scale: new Vector2(2, 2),
          postBuildOffset: new Vector3(0, 0, -0.035),

          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
          }
        },
        {
          mesh: 'magma_chasm_bloom_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride(_context, _cardCache) {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(targetEntity, effect, true, true)
          }
        },
        {
          mesh: 'magma_chasm_base_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride(_context, _cardCache) {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(targetEntity, effect, true, true)
          }
        },
        {
          mesh: 'magma_chasm_bubbles_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride(_context, _cardCache) {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(targetEntity, effect, false, true)
          }
        },
        {
          mesh: 'magma_chasm_burst_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride(_context, _cardCache) {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(targetEntity, effect, false, true)
          }
        },
        {
          mesh: 'magma_chasm_smoke_MSA',
          shakerCamDeltaOffset: 0.02,

          delay: 300,
          targetOverride(_context, _cardCache) {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(targetEntity, effect, false, true)
          }
        }
      ]
    }
  ])
}

for (const card of ['2049' /* Burn to a Crisp */] as const) {
  meshAnimationLibrary.set(card, [
    {
      type: 'impact',
      contextCheck() {
        return true
      },
      missileOverride: 'fireTrailOnly',
      layers: [
        {
          mesh: 'energy_tower_base_trail_MSA',
          shakerCamDeltaOffset: 0.01,
          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
            effect.mesh.scale.multiply(new Vector3(2, 1, 1.5))
            effect.mesh.position.add(new Vector3(0, 0, -0.025))
          }
        },
        {
          mesh: 'energy_tower_flames_bloom_MSA',
          shakerCamDeltaOffset: 0.01,
          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
            effect.mesh.scale.multiply(new Vector3(2, 1, 1.5))
            effect.mesh.position.add(new Vector3(0, 0, -0.025))
          }
        },
        {
          mesh: 'energy_tower_flames_trail_MSA',
          shakerCamDeltaOffset: 0.01,
          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
            effect.mesh.scale.multiply(new Vector3(2, 1, 1.5))
            effect.mesh.position.add(new Vector3(0, 0, -0.025))
          }
        },
        {
          mesh: 'energy_tower_flames_base_MSA',
          shakerCamDeltaOffset: 0.01,
          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
            effect.mesh.scale.multiply(new Vector3(2, 1, 1.5))
            effect.mesh.position.add(new Vector3(0, 0, -0.025))
          }
        },
        {
          mesh: 'energy_tower_electricity_MSA',
          shakerCamDeltaOffset: 0.01,
          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
            effect.mesh.scale.multiply(new Vector3(2, 1, 1.5))
            effect.mesh.position.add(new Vector3(0, 0, -0.025))
          }
        }
      ]
    }
  ])
}

for (const card of ['23' /* Tiamat */] as const) {
  meshAnimationLibrary.set(card, [
    {
      type: 'chargeUp',
      contextCheck() {
        return true
      },
      layers: [
        {
          mesh: 'charge_up_energy_052_MSA',
          paletteOverride: 'fire2',
          shakerCamDeltaOffset: 0.005,
          placement(effect, entity) {
            if (entity.has('mesh')) {
              const entityMesh = entity.get('mesh')
              effect.mesh.rotation.copy(entityMesh.rotation)
            }
          }
        }
      ],
      missileOverride: 'fireTrailOnly'
    },
    {
      type: 'impact',
      contextCheck() {
        return true
      },
      missileOverride: 'fireTrailOnly',
      layers: [
        {
          mesh: 'energy_tower_base_trail_MSA',
          shakerCamDeltaOffset: 0.01,
          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
            effect.mesh.scale.multiply(new Vector3(2, 1, 1.5))
            effect.mesh.position.add(new Vector3(0, 0, -0.025))
          }
        },
        {
          mesh: 'energy_tower_flames_bloom_MSA',
          shakerCamDeltaOffset: 0.01,
          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
            effect.mesh.scale.multiply(new Vector3(2, 1, 1.5))
            effect.mesh.position.add(new Vector3(0, 0, -0.025))
          }
        },
        {
          mesh: 'energy_tower_flames_trail_MSA',
          shakerCamDeltaOffset: 0.01,
          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
            effect.mesh.scale.multiply(new Vector3(2, 1, 1.5))
            effect.mesh.position.add(new Vector3(0, 0, -0.025))
          }
        },
        {
          mesh: 'energy_tower_flames_base_MSA',
          shakerCamDeltaOffset: 0.01,
          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
            effect.mesh.scale.multiply(new Vector3(2, 1, 1.5))
            effect.mesh.position.add(new Vector3(0, 0, -0.025))
          }
        },
        {
          mesh: 'energy_tower_electricity_MSA',
          shakerCamDeltaOffset: 0.01,
          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
            effect.mesh.scale.multiply(new Vector3(2, 1, 1.5))
            effect.mesh.position.add(new Vector3(0, 0, -0.025))
          }
        }
      ]
    }
  ])
}

for (const card of [
  '1148' /* Vulpine Spy */,
  '1152' /* Vulpine Mage */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      type: 'chargeUp',
      contextCheck: thisUnitTriggersFromAttack,
      layers: [
        {
          mesh: 'charge_up_energy_052_MSA',
          paletteOverride: 'fire2',
          shakerCamDeltaOffset: 0.005,
          placement(effect, entity) {
            if (entity.has('mesh')) {
              const entityMesh = entity.get('mesh')
              effect.mesh.rotation.copy(entityMesh.rotation)
            }
          }
        }
      ],
      missileOverride: 'fireTrailOnly'
    },
    {
      type: 'impact',
      contextCheck: thisUnitTriggersFromAttack,
      layers: [
        {
          mesh: 'explosion_poof_MSA',
          shakerCamDeltaOffset: 0.02,
          postBuildOffset: new Vector3(0, 0, -0.035),

          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
          }
        },
        {
          mesh: 'explosion_bloom_MSA',
          shakerCamDeltaOffset: 0.02,
          postBuildOffset: new Vector3(0, 0, -0.035),

          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
          }
        },
        {
          mesh: 'explosion_trace_MSA',
          shakerCamDeltaOffset: 0.02,
          postBuildOffset: new Vector3(0, 0, -0.035),

          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
          }
        },
        {
          mesh: 'explosion_base_MSA',
          shakerCamDeltaOffset: 0.02,
          postBuildOffset: new Vector3(0, 0, -0.035),

          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
          }
        }
      ]
    }
  ])
}

for (const card of [
  '4026' /* Electron */,
  '4108' /* Torques */,
  '4149' /* Tortugan Tinker */,
  '4152' /* Tortugan Shaman */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: isPayloadEffectTypeGenericAndPayloadEffectIntrinsic(),
      layers: [
        {
          mesh: 'light_trigger_MSA',
          placement: adjustToInfrontOfCard
        }
      ],
      missileOverride: card === '4152' ? 'electricShock' : undefined
    }
  ])
}

for (const card of ['20042' /* Shroud */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: (
        _context?: ActionStack,
        _cardCache?: CardCacheWithEntities,
        _payload?: PhaseResolveTrigger,
        _playerInfo?: PlayerInfo,
        _entity?: Entity<Components>
      ) => {
        return _payload?.effect === 'Shroud'
      },
      layers: [
        {
          mesh: 'generic_trigger_MSA',
          paletteOverride: 'air',
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of ['20032' /* Dazed */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: (
        _context?: ActionStack,
        _cardCache?: CardCacheWithEntities,
        _payload?: PhaseResolveTrigger,
        _playerInfo?: PlayerInfo,
        _entity?: Entity<Components>
      ) => {
        return _payload?.effect === 'Dazed'
      },
      layers: [
        {
          mesh: 'mind_trigger_MSA',
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of ['20023' /* Flames */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: (
        _context?: ActionStack,
        _cardCache?: CardCacheWithEntities,
        _payload?: PhaseResolveTrigger,
        _playerInfo?: PlayerInfo,
        _entity?: Entity<Components>
      ) => {
        return _payload?.effect === 'Flames'
      },
      layers: [
        {
          mesh: 'flames_MSA',
          placement: adjustToInfrontOfCard
        }
      ],
      missileOverride: 'fireMissile'
    }
  ])
}

for (const card of ['4033' /* Electric Eel */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: isPayloadEffectTypeSunsetAndPayloadEffectIntrinsic(),
      layers: [
        {
          mesh: 'light_trigger_MSA',
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of ['121' /* Armis Medic */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: isPayloadEffectTypeSunsetAndPayloadEffectIntrinsic(),
      layers: [
        {
          mesh: 'mind_trigger_MSA',
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of ['2110' /* Tortugan Cook */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: isPayloadEffectTypeSunsetAndPayloadEffectIntrinsic(),
      layers: [
        {
          mesh: 'fire_trigger_MSA',
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of ['2123' /* Blightcrafter */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: isPayloadEffectTypeGenericAndPayloadEffectIntrinsic(),
      layers: [
        {
          mesh: 'poisonCloud_MSA',
          paletteOverride: 'blight',
          scale: new Vector2(0.66, 1),
          postBuildOffset: new Vector3(0, 0.01, 0)
        }
      ]
    }
  ])
}

for (const card of [
  '1124' /* Hexed Primalan */,
  '2022' /* Soul Shepherd */,
  '4065' /* Curious */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: isPayloadEffectTypeGenericAndPayloadEffectIntrinsic(),
      layers: [
        {
          mesh: 'feathers_MSA',
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of ['2064' /* Ominous Hoo */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: isPayloadEffectTypeSunsetAndPayloadEffectIntrinsic(),
      layers: [
        {
          mesh: 'feathers_MSA',
          paletteOverride: 'mind2',
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of [
  '2068' /* Nefurti */,
  '3100' /* Pharonis */,
  '2081' /* Frost Adept */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: isPayloadEffectTypeSunsetAndPayloadEffectIntrinsic(),
      layers: [
        {
          mesh: 'generic_trigger_MSA',
          paletteOverride: (entity: Entity<Components>) => {
            if (entity.has('cardInstance')) {
              const element = entity.get('cardInstance').state.view
                .element as PaletteName
              return element
            } else {
              return undefined
            }
          },
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of [
  '2088' /* Tactician */,
  '3006' /* Soul Guide */,
  '3066' /* Vishiva */,
  '3124' /* Hexed Surit */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: isPayloadEffectTypeGenericAndPayloadEffectIntrinsic(),
      layers: [
        {
          mesh: 'generic_trigger_MSA',
          paletteOverride: (entity: Entity<Components>) => {
            if (entity.has('cardInstance')) {
              const element = entity.get('cardInstance').state.view
                .element as PaletteName
              return element
            } else {
              return undefined
            }
          },
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

meshAnimationLibrary.set('deathTrigger', [
  {
    contextCheck: (
      _context?: ActionStack,
      _cardCache?: CardCacheWithEntities,
      _payload?: PhaseResolveTrigger,
      _playerInfo?: PlayerInfo,
      _entity?: Entity<Components>
    ) => {
      return _payload?.effectType === 'Death'
    },
    layers: [
      {
        mesh: 'death_trigger_low_MSA',
        targetOverride: attachToScene(),
        placement: adjustToOverOwnerGraveyard,
        postBuildOffset: new Vector3(-0.02, -0.05, -0.05),
        sfx: [{ id: 'DeathTrigger', hasSoundVariation: true }]
      },
      {
        mesh: 'death_trigger_high_MSA',
        targetOverride: attachToScene(),
        placement: adjustToOverOwnerGraveyard,
        postBuildOffset: new Vector3(-0.02, -0.05, -0.05)
      }
    ]
  }
])

meshAnimationLibrary.set('gloryTrigger', [
  {
    contextCheck: (
      _context?: ActionStack,
      _cardCache?: CardCacheWithEntities,
      _payload?: PhaseResolveTrigger,
      _playerInfo?: PlayerInfo,
      _entity?: Entity<Components>
    ) => {
      return _payload?.effectType === 'Glory'
    },
    layers: [
      {
        mesh: 'glory_trigger_MSA',
        placement: adjustToInfrontOfCard
      }
    ]
  }
])

meshAnimationLibrary.set('slayTrigger', [
  {
    contextCheck: (
      _context?: ActionStack,
      _cardCache?: CardCacheWithEntities,
      _payload?: PhaseResolveTrigger,
      _playerInfo?: PlayerInfo,
      _entity?: Entity<Components>
    ) => {
      return _payload?.effectType === 'Slay'
    },
    layers: [
      {
        mesh: 'slay_trigger_MSA',
        placement: adjustToInfrontOfCard,
        shakerCamDeltaOffset: 0.01
      }
    ]
  }
])

meshAnimationLibrary.set('heroAbilityTrigger', [
  {
    contextCheck: (
      _context?: ActionStack,
      _cardCache?: CardCacheWithEntities,
      _payload?: PhaseResolveCardEffect,
      _playerInfo?: PlayerInfo,
      entity?: Entity<Components>
    ) => {
      return entity?.has('heroAbility')
    },
    awaitIsAnimatingToFinish: true,
    layers: [{ mesh: 'hero_ability_trigger_MSA' }]
  }
])

meshAnimationLibrary.set('stealthToggle', [
  {
    contextCheck: (
      _context?: ActionStack,
      _cardCache?: CardCacheWithEntities | undefined,
      _payload?: PhaseResolveCardEffect | undefined,
      playerInfo?: PlayerInfo
    ) => {
      return !playerInfo?.heroHitThisTurn
    },
    layers: [
      { mesh: 'stealth_eye_MSA', placement: adjustToInfrontOfCard, delay: 750 }
    ]
  },
  {
    contextCheck: (
      _context?: ActionStack,
      _cardCache?: CardCacheWithEntities | undefined,
      _payload?: PhaseResolveCardEffect | undefined,
      playerInfo?: PlayerInfo
    ) => {
      return playerInfo?.heroHitThisTurn
    },
    layers: [
      {
        mesh: 'stealth_eye_MSA',
        placement: adjustToInfrontOfCard,
        delay: 750,
        reversed: true,
        sfx: [{ id: 'TraitStealthDeactivate' }]
      }
    ]
  }
])

meshAnimationLibrary.set('borderGlint', [
  {
    contextCheck(_context, _cardCache, _payload, _playerInfo, entity) {
      if (entity && entity.has('cardInstance')) {
        const instance = entity.get('cardInstance')
        const type = instance.state.view.type
        const rarity = instance.state.view.rarity
        return type === 'spell' && (rarity === 'silver' || rarity === 'gold')
      }
      return undefined
    },
    layers: [
      {
        mesh: 'border_glint_spell_MSA',
        delay: 100,
        paletteOverride(entity) {
          if (entity && entity.has('cardInstance')) {
            const instance = entity.get('cardInstance')
            const rarity = instance.state.view.rarity
            return rarity === 'silver' ? 'air_mane' : undefined
          }
          return undefined
        },
        placement(effect, entity) {
          if (entity && entity.has('transform')) {
            const entityTransform = entity.get('transform')
            effect.mesh.position.add(new Vector3(0, 0.0025, 0.0015))
            effect.mesh.rotation.copy(entityTransform.rotation)
            effect.mesh.rotateX(-Math.PI / 4 - (47 / 640) * Math.PI)
            effect.mesh.scale.multiply(new Vector3(1.132, 1, 1.13))
            effect.mesh.position.add(new Vector3(-0.0029, 0.0005, -0.0003))
          }
        }
      }
    ]
  },
  {
    contextCheck(_context, _cardCache, _payload, _playerInfo, entity) {
      if (entity && entity.has('cardInstance')) {
        const instance = entity.get('cardInstance')
        const type = instance.state.view.type
        const rarity = instance.state.view.rarity
        const hasGuard = instance.state.view.traits.includes('guard')
        return (
          type === 'unit' &&
          (rarity === 'silver' || rarity === 'gold') &&
          hasGuard
        )
      }
      return undefined
    },
    layers: [
      {
        mesh: 'border_glint_guard_MSA',
        delay: 100,
        paletteOverride(entity) {
          if (entity && entity.has('cardInstance')) {
            const instance = entity.get('cardInstance')
            const rarity = instance.state.view.rarity
            return rarity === 'silver' ? 'air_mane' : undefined
          }
          return undefined
        },
        placement: adjustToInfrontOfCard
      }
    ]
  },
  {
    contextCheck(_context, _cardCache, _payload, _playerInfo, entity) {
      if (entity && entity.has('cardInstance')) {
        const instance = entity.get('cardInstance')
        const type = instance.state.view.type
        const rarity = instance.state.view.rarity
        const hasGuard = instance.state.view.traits.includes('guard')
        return (
          type === 'unit' &&
          (rarity === 'silver' || rarity === 'gold') &&
          !hasGuard
        )
      }
      return undefined
    },
    layers: [
      {
        mesh: 'border_glint_unit_MSA',
        delay: 100,
        paletteOverride(entity) {
          if (entity && entity.has('cardInstance')) {
            const instance = entity.get('cardInstance')
            const rarity = instance.state.view.rarity
            return rarity === 'silver' ? 'air_mane' : undefined
          }
          return undefined
        },
        placement: adjustToInfrontOfCard
      }
    ]
  }
])

meshAnimationLibrary.set('cardCasting', [
  {
    contextCheck: rarityOfSpellBeingPlayedIsBase,
    layers: [{ mesh: 'main_shape_base_MSA', placement: cardCastingAdjustments }]
  },
  {
    contextCheck: rarityOfSpellBeingPlayedIsSilver,
    layers: [
      { mesh: 'main_shape_silver_MSA', placement: cardCastingAdjustments },
      { mesh: 'burst_shine_silver_MSA', placement: cardCastingAdjustments },
      { mesh: 'sparks_silver_MSA', placement: cardCastingAdjustments }
    ]
  },
  {
    contextCheck: rarityOfSpellBeingPlayedIsGold,
    layers: [
      { mesh: 'main_shape_gold_MSA', placement: cardCastingAdjustments },
      { mesh: 'burst_shine_gold_MSA', placement: cardCastingAdjustments },
      { mesh: 'sparks_gold_MSA', placement: cardCastingAdjustments },
      { mesh: 'glow_bloom_gold_MSA', placement: cardCastingAdjustments },
      { mesh: 'electricity_gold_MSA', placement: cardCastingAdjustments }
    ]
  }
])

meshAnimationLibrary.set('summonCrack', [
  {
    contextCheck(_context, _cardCache, _payload, _playerInfo, entity) {
      if (entity && entity.has('cardInstance')) {
        const instance = entity.get('cardInstance')
        return (
          (instance.state.view.health as number) >= 8 ||
          (instance.state.view.power as number) >= 8
        )
      }
      return undefined
    },
    layers: [
      {
        mesh: 'basicCrack_MSA',
        paletteOverride: isConquestIsland ? 'crackedSandstone' : 'crackedFloor',
        isEffectLoop: true,
        offset: new Vector3(0, -0.03, 0.015),
        detached: true,
        duration: 1500,
        renderOrder: -1,
        sfx: [{ id: 'GroundCrack' }]
      },
      {
        mesh: 'hero_death_big_ground_ring_3d_MSA',
        paletteOverride(entity) {
          if (entity && entity.has('cardInstance')) {
            const instance = entity.get('cardInstance')
            const palette = titanSummonPaletteMap.get(instance.base)
            if (palette) {
              return palette
            }
          }
          return 'transparent_air'
        },
        placement: adjustToUnderneathCard,
        additiveBlending(entity) {
          if (entity && entity.has('cardInstance')) {
            const instance = entity.get('cardInstance')
            const palette = titanSummonPaletteMap.get(instance.base)
            if (palette && palette !== 'metal2') {
              return true
            }
          }
          return false
        }
      }
    ]
  },
  {
    contextCheck(_context, _cardCache, _payload, _playerInfo, entity) {
      if (entity && entity.has('cardInstance')) {
        const instance = entity.get('cardInstance')
        return (
          ((instance.state.view.health as number) >= 8 ||
            (instance.state.view.power as number) >= 8) &&
          isTitan(instance)
        )
      }
      return undefined
    },
    layers: [
      {
        mesh: 'hero_death_big_points_MSA',
        paletteOverride(entity) {
          if (entity && entity.has('cardInstance')) {
            const instance = entity.get('cardInstance')
            const palette = titanSummonPaletteMap.get(instance.base)
            if (palette) {
              return palette
            }
          }
          return undefined
        },
        scale: new Vector2(3, 5),
        postBuildOffset: new Vector3(0.01, 0.01, 0),
        additiveBlending: true
      }
    ]
  }
])

for (const card of [
  '1116' /* Reckless Racer */,
  '2108' /* Glizzbot 325 */,
  '4003' /* Tooth Hurty */,
  '4044' /* Coal Dozer */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: isPayloadEffectTypeGenericAndPayloadEffectIntrinsic(),
      layers: [
        {
          mesh: 'cog_MSA',
          paletteOverride: card === '2108' ? 'cog_dmg' : undefined,
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of [
  '20028' /* Hex */,
  '20013' /* Zomboid */,
  '20065' /* Zomboid 2 */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: () => {
        return undefined
      },
      missileOverride: 'hexMissile'
    }
  ])
}

meshAnimationLibrary.set('3141' /* Scavenboid */, [
  {
    contextCheck: isPayloadEffectTypeGenericAndPayloadEffectIntrinsic(),
    layers: [
      {
        mesh: 'bite_MSA',
        placement: adjustToInfrontOfCard,
        postBuildOffset: new Vector3(0, 0.005, 0),
        sfx: [
          { id: 'EnchantmentRootsAttach' },
          { id: 'SpellMagicImpact', delay: 350 }
        ]
      }
    ]
  }
])

meshAnimationLibrary.set('2132' /* Blightvessel */, [
  {
    contextCheck: isPayloadEffectTypeSunriseAndPayloadEffectIntrinsic(),
    layers: [
      {
        mesh: 'hero_death_big_points_MSA',
        paletteOverride: 'hex',
        placement: adjustToInfrontOfCard,
        sfx: [{ id: 'SpellMagicImpact' }],
        scale: new Vector2(3, 5),
        postBuildOffset: new Vector3(0.01, 0.01, 0),
        additiveBlending: true
      }
    ],
    missileOverride: 'hexMissile'
  }
])

meshAnimationLibrary.set('108' /* Sonic Jammer */, [
  {
    contextCheck: isPayloadEffectTypeSummonAndPayloadEffectIntrinsic(),
    layers: [
      {
        mesh: 'glorious_mane_MSA',
        paletteOverride: 'air_mane',
        placement: adjustToInfrontOfCard,
        targetOverride: OpposingHero(),
        postBuildOffset: new Vector3(0, 0.01, 0)
      }
    ]
  }
])

meshAnimationLibrary.set('112' /* Ether Lemure */, [
  {
    contextCheck: isPayloadEffectTypeSummonAndPayloadEffectIntrinsic(),
    layers: [
      {
        mesh: 'generic_trigger_MSA',
        paletteOverride: 'earth',
        placement: adjustToInfrontOfCard
      }
    ]
  }
])

meshAnimationLibrary.set('117' /* Blood of Yxxath */, [
  {
    contextCheck: isPayloadEffectTypeSummonAndPayloadEffectIntrinsic(),
    layers: [
      {
        mesh: 'mind_trigger_MSA',
        placement: adjustToInfrontOfCard
      }
    ]
  }
])

for (const card of ['3021' /* Gift of Qai */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      layers: [
        {
          mesh: 'magicWhisp_MSA',
          scale: (
            entity: Entity<Components>,
            _cardCache?: CardCacheWithEntities
          ) => {
            const targetFieldUnitAmount = entity.has('player')
              ? ownedZoneCollections.Player_Field.length - 1
              : ownedZoneCollections.Opponent_Field.length - 1
            return new Vector2(-(1 + targetFieldUnitAmount * 0.2) * 1.3, -1)
          },
          targetOverride: attachToScene(),
          placement: adjustToOwnerFieldCenter,
          postBuildOffset: new Vector3(0, 0.02, 0.02),
          sfx: [
            {
              id: '3021-',
              ownerCheck: (entity: Entity<Components>) => {
                return !entity.has('player')
              }
            }
          ]
        }
      ]
    }
  ])
}

for (const card of ['20014' /* Knives */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      layers: [
        {
          mesh: 'knives_MSA',
          scale: (entity: Entity<Components>) => {
            const targetFieldUnitAmount = entity.has('player')
              ? ownedZoneCollections.Opponent_Field.length - 1
              : ownedZoneCollections.Player_Field.length - 1
            return new Vector2((1 + targetFieldUnitAmount * 0.2) * 2.5, 1.5)
          },
          targetOverride: attachToScene(),
          placement: adjustToOpposingFieldCenter,
          postBuildOffset: new Vector3(0, 0, 0.02),
          sfx: [
            {
              id: '20014-',
              ownerCheck: (entity: Entity<Components>) => {
                return !entity.has('player')
              },
              size: 'Large'
            }
          ]
        },
        {
          mesh: 'knives_MSA',
          scale: (entity: Entity<Components>) => {
            const targetFieldUnitAmount = entity.has('player')
              ? ownedZoneCollections.Opponent_Field.length - 1
              : ownedZoneCollections.Player_Field.length - 1
            return new Vector2((1 + targetFieldUnitAmount * 0.2) * 2.5, 1.5)
          },
          targetOverride: attachToScene(),
          placement: adjustToOpposingFieldCenter,
          postBuildOffset: new Vector3(0.05, 0.02, 0.02)
        },
        {
          mesh: 'knives_MSA',
          scale: (entity: Entity<Components>) => {
            const targetFieldUnitAmount = entity.has('player')
              ? ownedZoneCollections.Opponent_Field.length - 1
              : ownedZoneCollections.Player_Field.length - 1
            return new Vector2((1 + targetFieldUnitAmount * 0.2) * 2.5, 1.5)
          },
          targetOverride: attachToScene(),
          placement: adjustToOpposingFieldCenter,
          postBuildOffset: new Vector3(0, 0.04, 0.02)
        }
      ],
      missileOverride: null
    }
  ])
}

for (const card of ['1048' /* Deep Xlice */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      layers: [
        {
          mesh: 'clawSwipe_MSA',
          paletteOverride: 'teal',
          scale: (entity: Entity<Components>) => {
            const targetFieldUnitAmount = entity.has('player')
              ? ownedZoneCollections.Opponent_Field.length - 1
              : ownedZoneCollections.Player_Field.length - 1
            return new Vector2((1 + targetFieldUnitAmount * 0.2) * 1.3, 1)
          },
          targetOverride: attachToScene(),
          placement: adjustToOpposingFieldCenter,
          postBuildOffset: new Vector3(0, 0.02, 0.02),
          delay: 500,
          sfx: [
            {
              id: '1048-',
              ownerCheck: (entity: Entity<Components>) => {
                return !entity.has('player')
              },
              size: 'Large'
            }
          ]
        }
      ],
      missileOverride: null
    }
  ])
}

for (const card of [
  '160' /* Cleave */,
  '30124' /* Cleave (Tutorial) */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayedAndHasOpposingTargets,
      layers: [
        {
          mesh: 'clawSwipe_MSA',
          scale: (entity: Entity<Components>) => {
            const targetFieldUnitAmount = entity.has('player')
              ? ownedZoneCollections.Opponent_Field.length - 1
              : ownedZoneCollections.Player_Field.length - 1
            return new Vector2((1 + targetFieldUnitAmount * 0.2) * 1.3, 1)
          },
          targetOverride: attachToScene(),
          placement: adjustToOpposingFieldCenter,
          postBuildOffset: new Vector3(0, 0.02, 0.02),
          sfx: [
            {
              id: '99-',
              ownerCheck: (entity: Entity<Components>) => {
                return !entity.has('player')
              },
              size: 'Large'
            }
          ]
        }
      ],
      missileOverride: null,
      postAnimDelayAwaited: 750
    },
    {
      contextCheck:
        isPlayerActionPlayCardAndTopPhaseResolveCardEffectWithTopPhasePayload,
      layers: [
        {
          mesh: 'generic_trigger_MSA',
          paletteOverride: 'metal2',
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of ['1024' /* Scythe Mantis */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: (
        context?: ActionStack,
        cardCache?: CardCacheWithEntities
      ) => {
        if (
          context?.playerAction[1].type === 'PlayCard' &&
          context.playerAction[1].cardID
        ) {
          const card = cardCache?.getInstance(context.playerAction[1].cardID)
          return card?.state.view.element === 'dark'
        }
        return undefined
      },
      layers: [
        {
          mesh: 'darkStreak_MSA',
          paletteOverride: 'mind',
          offset: new Vector3(0, 0.04, 0.02),
          scale: (entity: Entity<Components>) => {
            const targetFieldUnitAmount = entity.has('player')
              ? ownedZoneCollections.Opponent_Field.length - 1
              : ownedZoneCollections.Player_Field.length - 1
            return new Vector2(1 + targetFieldUnitAmount * 0.2, 1)
          },
          targetOverride: attachToScene(),
          placement: adjustToOpposingFieldCenter,
          postBuildOffset: (entity: Entity<Components>) => {
            const offset = new Vector3(0, 0, 0.1)
            if (!entity.has('player')) {
              offset.add(new Vector3(0, 0, -0.04))
            }
            return offset
          },
          sfx: [
            {
              id: '1024-',
              ownerCheck: (entity: Entity<Components>) => {
                return !entity.has('player')
              },
              size: 'Large'
            }
          ]
        }
      ],
      missileOverride: null
    }
  ])
}

for (const card of ['99' /* Claw Swipe */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayedAndHasOpposingTargets,
      layers: [
        {
          mesh: 'clawSwipe_MSA',
          scale: (entity: Entity<Components>) => {
            const targetFieldUnitAmount = entity.has('player')
              ? ownedZoneCollections.Opponent_Field.length - 1
              : ownedZoneCollections.Player_Field.length - 1
            return new Vector2((1 + targetFieldUnitAmount * 0.2) * 1.3, 1)
          },
          targetOverride: attachToScene(),
          placement: adjustToOpposingFieldCenter,
          postBuildOffset: new Vector3(0, 0.02, 0.02),
          sfx: [
            {
              id: '99-',
              ownerCheck: (entity: Entity<Components>) => {
                return !entity.has('player')
              },
              size: 'Large'
            }
          ]
        }
      ],
      missileOverride: null,
      postAnimDelayAwaited: 750
    }
  ])
}

for (const card of ['4126' /* Storm's Echo */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      layers: [
        {
          mesh: 'light_trigger_MSA',
          delay: 300,
          targetOverride: spellOwnerHero(),
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

meshAnimationLibrary.set('25026' /* Mira - A.R.M.E.D. */, [
  {
    contextCheck: isPlayerActionPlayCardAndPayloadPhaseResolveCardEffect,
    layers: [
      {
        mesh: 'cog_MSA',
        placement: adjustToInfrontOfCard,
        targetOverride: spellOwnerHero()
      }
    ]
  }
])

for (const card of ['20064' /* Blight */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      layers: [
        {
          mesh: 'poisonCloud_MSA',
          paletteOverride: 'blight',
          scale: new Vector2(0.66, 1),
          targetOverride: spellOwnerHero(),
          postBuildOffset: new Vector3(0, 0.01, 0)
        }
      ]
    }
  ])
}

for (const card of ['4129' /* Mootichi's Command */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      layers: [
        {
          mesh: 'fire_plume_MSA',
          paletteOverride: 'hex',
          scale: new Vector2(1.2, 1.2),
          placement: adjustToInfrontOfCard,
          targetOverride: spellOwnerHero(),
          postBuildOffset: new Vector3(0, 0.01, -0.01),
          sfx: [
            {
              id: '3099-',
              ownerCheck: (entity: Entity<Components>) => {
                return entity.has('player')
              }
            }
          ]
        },
        {
          mesh: 'generic_trigger_MSA',
          paletteOverride: 'ice',
          placement: adjustToInfrontOfCard,
          targetOverride: spellOwnerHero()
        }
      ],
      postAnimDelayAwaited: 750
    }
  ])
}

for (const card of ['3041' /* Twisted Metal */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      layers: [
        {
          mesh: 'cog_MSA',
          paletteOverride: (
            entity: Entity<Components>,
            _context?: ActionStack,
            _cardCache?: CardCacheWithEntities,
            targetEntity?: Entity<Components>
          ) => {
            if (
              targetEntity &&
              entity.has('player') &&
              targetEntity.has('player')
            ) {
              return 'cog'
            } else {
              return 'cog_dmg'
            }
          },
          placement: adjustToInfrontOfCard
        }
      ],
      postAnimDelayAwaited: 750
    }
  ])
}

for (const card of ['4012' /* Cryogen */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisUnitIsBeingPlayed,
      layers: [
        {
          mesh: 'generic_trigger_MSA',
          paletteOverride: 'water',
          placement: adjustToInfrontOfCard,
          delay: 500
        }
      ]
    },
    {
      contextCheck(context) {
        return (
          context &&
          context.triggerSource &&
          typeof context.triggerSource === 'object' &&
          'baseCard' in context.triggerSource &&
          context.triggerSource.baseCard
        )
      },
      layers: [
        {
          mesh: 'hero_death_big_points_MSA',
          paletteOverride: 'water',
          scale: new Vector2(3, 5),
          postBuildOffset: new Vector3(0.01, 0.01, 0),
          additiveBlending: true,
          detached: true,
          targetOverride(_entity, context, cardCache) {
            if (
              context &&
              cardCache &&
              context.triggerSource &&
              typeof context.triggerSource === 'object' &&
              'baseCard' in context.triggerSource &&
              context.triggerSource.baseCard
            ) {
              const entity = cardCache.getEntity(context.triggerSource.id)
              return entity
            }
            return undefined
          }
        }
      ]
    }
  ])
}

for (const card of ['3159' /* Corpse Explosion */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      layers: [
        {
          mesh: 'hero_death_big_points_MSA',
          paletteOverride: 'hex',
          scale: new Vector2(3, 5),
          postBuildOffset: new Vector3(0.01, 0.01, 0),
          additiveBlending: true,
          detached: true,
          sfx: [
            {
              id: 'SpellMagicImpact'
            }
          ]
        }
      ],
      missileOverride: 'hexMissile'
    }
  ])
}

for (const card of ['40' /* Glorious Mane */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      layers: [
        {
          mesh: 'glorious_mane_MSA',
          paletteOverride: targetInstanceElement(),
          placement: adjustToInfrontOfCard,
          postBuildOffset: new Vector3(0, 0.01, 0),
          sfx: [
            {
              id: '40-',
              ownerCheck: (entity: Entity<Components>) => {
                return entity.has('player')
              }
            }
          ]
        }
      ]
    }
  ])
}

for (const card of [
  '3000' /* Fun Guy */,
  '3149' /* Scarab of Life */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisUnitIsTriggeringDeathEffectAndHasAllyUnits,
      layers: [
        {
          mesh: 'magicWhisp_MSA',
          scale: (entity: Entity<Components>) => {
            const targetFieldUnitAmount = entity.has('player')
              ? ownedZoneCollections.Player_Field.length - 1
              : ownedZoneCollections.Opponent_Field.length - 1
            return new Vector2((1 + targetFieldUnitAmount * 0.2) * 1.3, 1)
          },
          paletteOverride: card === '3000' ? 'earth' : undefined,
          targetOverride: attachToScene(),
          placement: adjustToOwnerFieldCenter,
          postBuildOffset: new Vector3(0, 0.02, 0.02)
        }
      ]
    }
  ])
}

for (const card of ['2000' /* Tragic Poet */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisUnitIsTriggeringDeathEffect,
      layers: [
        {
          mesh: 'music_notes_MSA',
          paletteOverride: 'hex',
          targetOverride(entity) {
            return entity && getHero(entity.has('player'))
          },
          placement: adjustToInfrontOfCard,
          postBuildOffset: new Vector3(0, 0.01, 0.01)
        }
      ]
    }
  ])
}

for (const card of ['3079' /*  Maw Worm */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisUnitIsTriggeringSummonEffect,
      layers: [
        {
          mesh: 'bite_MSA',
          targetOverride: attachToScene(),
          placement(effect, entity) {
            effect.mesh.rotation.copy(entity.get('transform').rotation)
            if (entity.has('player')) {
              effect.mesh.position.copy(new Vector3(-0.25, 0.11, 0.11))
            } else {
              effect.mesh.position.copy(new Vector3(-0.23, 0.13, 0.02))
            }
            effect.mesh.position.add(
              new Vector3(entity.has('player') ? -0.01 : -0.005, -0.05, 0)
            )
          },
          sfx: [
            { id: 'EnchantmentRootsAttach' },
            { id: 'SpellMagicImpact', delay: 350 }
          ]
        }
      ]
    }
  ])
}

for (const card of ['1065' /* Mamba */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck() {
        return undefined
      },
      missileOverride: 'hexMissile'
    }
  ])
}

for (const card of ['4157' /* Spear Shot */, '4158' /* Twinspear */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck() {
        return undefined
      },
      missileOverride: null
    }
  ])
}

for (const card of ['1113' /* Drone Surge */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck() {
        return undefined
      },
      missileOverride: 'electricShock'
    }
  ])
}

for (const card of ['3117' /* Festival Cannon */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck() {
        return undefined
      },
      missileOverride: 'fireMissile'
    }
  ])
}

for (const card of ['2113' /* Overdraft */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck() {
        return undefined
      },
      missileOverride: 'coinMissile'
    }
  ])
}
for (const card of ['1108' /* Bloodletter */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck() {
        return undefined
      },
      missileOverride: 'bloodMissile'
    }
  ])
}

for (const card of ['3099' /* Phoenix Plume */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      layers: [
        {
          mesh: 'fire_plume_MSA',
          targetOverride: attachToScene(),
          placement: adjustToOverOwnerGraveyard,
          postBuildOffset: new Vector3(0, 0.01, 0.01),
          sfx: [
            {
              id: '3099-',
              ownerCheck: (entity: Entity<Components>) => {
                return entity.has('player')
              }
            }
          ]
        }
      ]
    }
  ])
}

for (const card of [
  '1114' /* Baneful Strike */,
  '20059' /* Blessed Strike */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      layers: [
        {
          mesh: 'generic_trigger_MSA',
          paletteOverride: card === '1114' ? 'dark' : 'light',
          targetOverride: spellOwnerHero(),
          placement: adjustToInfrontOfCard,
          delay: 100
        }
      ]
    }
  ])
}

for (const card of [
  '28' /* Browl */,
  '41' /* Unikron */,
  '3032' /* Gus */,
  '3083' /* Carrion Crow */,
  '4030' /* Trinketeer */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisUnitIsBeingSummoned,
      layers: [
        {
          mesh: 'feathers_MSA',
          paletteOverride: card === '3083' ? 'mind2' : undefined,
          placement: adjustToInfrontOfCard,
          delay: 500
        }
      ]
    }
  ])
}

for (const card of [
  '119' /* Tune-Up */,
  '2097' /* Salvage */,
  '4070' /* Iron Mask */,
  '4113' /* Micro-Swarm */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      layers: [
        {
          mesh: 'cog_MSA',
          targetOverride: spellOwnerHero(),
          placement: adjustToInfrontOfCard
        }
      ],
      postAnimDelayAwaited: 500
    }
  ])
}

for (const card of [
  '1159' /* Storm Call */,
  '159' /* Ether Call */,
  '30122' /* Ether Call (Tutorial) */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      layers: [
        {
          mesh: card === '1159' ? 'fire_trigger_MSA' : 'metal_trigger_MSA',
          targetOverride: spellOwnerHero(),
          placement: adjustToInfrontOfCard
        },
        {
          mesh: 'generic_trigger_MSA',
          paletteOverride: card === '1159' ? 'air' : 'earth',
          targetOverride: spellOwnerHero(),
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of ['1120' /* Flareboid */] as const) {
  meshAnimationLibrary.set(card, [
    {
      type: 'impact',
      contextCheck() {
        return true
      },
      missileOverride: 'fireTrailOnly',
      layers: [
        {
          mesh: 'energy_tower_base_trail_MSA',
          shakerCamDeltaOffset: 0.01,
          placement(effect) {
            effect.mesh.scale.multiply(new Vector3(2, 1, 1.5))
            effect.mesh.position.add(new Vector3(0, 0, -0.015))
          }
        },
        {
          mesh: 'energy_tower_flames_bloom_MSA',
          shakerCamDeltaOffset: 0.01,
          placement(effect) {
            effect.mesh.scale.multiply(new Vector3(2, 1, 1.5))
            effect.mesh.position.add(new Vector3(0, 0, -0.015))
          }
        },
        {
          mesh: 'energy_tower_flames_trail_MSA',
          shakerCamDeltaOffset: 0.01,
          placement(effect) {
            effect.mesh.scale.multiply(new Vector3(2, 1, 1.5))
            effect.mesh.position.add(new Vector3(0, 0, -0.015))
          }
        },
        {
          mesh: 'energy_tower_flames_base_MSA',
          shakerCamDeltaOffset: 0.01,
          placement(effect) {
            effect.mesh.scale.multiply(new Vector3(2, 1, 1.5))
            effect.mesh.position.add(new Vector3(0, 0, -0.015))
          }
        }
      ]
    }
  ])
}

for (const card of ['2122' /* Gaunt Guide */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisUnitIsTriggeringSlayEffect,
      layers: [
        {
          mesh: 'generic_trigger_MSA',
          paletteOverride(_entity, context, cardCache) {
            if (
              context &&
              context.playerAction[1].type === 'Attack' &&
              context.playerAction[1].defenderID &&
              cardCache
            ) {
              const defenderEntity = cardCache.getEntity(
                context.playerAction[1].defenderID
              )
              if (defenderEntity && defenderEntity.has('cardInstance')) {
                const defenderInstance = defenderEntity.get('cardInstance')
                const element = defenderInstance.state.view.element
                return element as PaletteName
              }
            }

            return 'fire'
          },
          placement: adjustToInfrontOfCard,
          delay: 750
        }
      ]
    }
  ])
}

for (const card of ['4078' /* Mechabun */, '1104' /* Swarmsinger */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisUnitIsBeingPlayed,
      layers: [
        {
          mesh: card === '1104' ? 'music_notes_MSA' : 'cog_MSA',
          paletteOverride: card === '1104' ? 'feathers' : undefined,
          placement: adjustToInfrontOfCard,
          delay: 500
        }
      ]
    }
  ])
}

for (const card of ['1091' /* Void Knight */] as const) {
  meshAnimationLibrary.set(card, [
    {
      type: 'aura',
      contextCheck() {
        return true
      },
      layers: [
        {
          mesh: 'hearts_MSA',
          paletteOverride: 'hex',
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of ['3071' /* Cosmicon */] as const) {
  meshAnimationLibrary.set(card, [
    {
      type: 'aura',
      contextCheck() {
        return true
      },
      layers: [
        {
          mesh: 'music_notes_MSA',
          paletteOverride: 'hex',
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of ['1090' /* Sky Keeper */] as const) {
  meshAnimationLibrary.set(card, [
    {
      type: 'aura',
      contextCheck() {
        return true
      },
      layers: [
        {
          mesh: 'feathers_MSA',
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of ['2106' /* Mixolotron */] as const) {
  meshAnimationLibrary.set(card, [
    {
      type: 'aura',
      contextCheck() {
        return true
      },
      layers: [
        {
          mesh: 'water_trigger_MSA',
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of ['1100' /* Disciple of Gusto */] as const) {
  meshAnimationLibrary.set(card, [
    {
      type: 'aura',
      contextCheck() {
        return true
      },
      layers: [
        {
          mesh: 'feathers_MSA',
          placement: adjustToInfrontOfCard
        },
        {
          mesh: 'feathers_MSA',
          targetOverride(entity) {
            if (entity) {
              const targetHero = getHero(entity.has('player'))
              if (targetHero) {
                return targetHero
              }
            }
            return undefined
          },
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of ['3030' /* Take Flight */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      layers: [
        {
          mesh: 'glory_trigger_MSA',
          paletteOverride: 'feathers',
          placement: adjustToInfrontOfCard,
          sfx: [{ id: 'GloryTriggers' }]
        },
        {
          mesh: 'feathers_MSA',
          placement: adjustToInfrontOfCard,
          delay: 500,
          detached: true
        }
      ],
      postAnimDelayAwaited: 500
    }
  ])
}

for (const card of [
  '1127' /* Heed the Winds */,
  '1030' /* Flock */,
  '1014' /* Head in the Clouds */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      layers: [
        {
          mesh: 'feathers_MSA',
          placement: adjustToInfrontOfCard,
          targetOverride: spellOwnerHero()
        }
      ],
      postAnimDelayAwaited: 500
    }
  ])
}

for (const card of [
  '1118' /* Turboboost */,
  '1128' /* Vlad's Command */,
  '1154' /* Flare Up */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      layers: [
        {
          mesh: 'fire_trigger_MSA',
          placement: adjustToInfrontOfCard,
          targetOverride: spellOwnerHero()
        }
      ]
    }
  ])
}

for (const card of ['4128' /* Sonic Signal */, '1005' /* Drum Up */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      layers: [
        {
          mesh: card === '4128' ? 'water_trigger_MSA' : 'music_notes_MSA',
          paletteOverride: card === '1005' ? 'music_earth' : undefined,
          placement: adjustToInfrontOfCard,
          targetOverride: spellOwnerHero(),
          delay: card === '4128' ? 300 : 0
        }
      ]
    }
  ])
}

for (const card of [
  '3115' /* Self Destruct */,
  '1119' /* Searing Rage */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      layers: [
        {
          mesh: 'explosion_poof_MSA',
          scale: new Vector2(2.75, 2.75),
          shakerCamDeltaOffset: 0.02,
          postBuildOffset: new Vector3(0, 0, -0.045),

          sfx: [{ id: 'SpellFireImpact' }]
        },
        {
          mesh: 'explosion_bloom_MSA',
          scale: new Vector2(2.75, 2.75),
          shakerCamDeltaOffset: 0.02,
          postBuildOffset: new Vector3(0, 0, -0.045)
        },
        {
          mesh: 'explosion_trace_MSA',
          scale: new Vector2(2.75, 2.75),
          shakerCamDeltaOffset: 0.02,
          postBuildOffset: new Vector3(0, 0, -0.045)
        },
        {
          mesh: 'explosion_base_MSA',
          scale: new Vector2(2.75, 2.75),
          shakerCamDeltaOffset: 0.02,
          postBuildOffset: new Vector3(0, 0, -0.045)
        }
      ]
    }
  ])
}

for (const card of [
  '2129' /* Hexplosion */,
  '2135' /* Mana Geyser */,
  '4135' /* Sea Storm */,
  '3008' /* Forest Fire */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      abortIfNoFieldUnits: card === '4135' ? undefined : true,
      layers: [
        {
          mesh: 'hero_death_big_points_MSA',
          paletteOverride:
            card === '3008' ? 'fire2' : card === '2129' ? 'hex' : 'water_mane',
          scale: new Vector2(4.5, 7.5),
          targetOverride: attachToScene(),
          placement: adjustToMidFieldCenter,
          postBuildOffset: new Vector3(0.01, 0, 0),
          additiveBlending: true,
          sfx: [
            {
              id: 'SpellMagicImpact'
            }
          ]
        },
        {
          mesh: 'ground_aura_MSA',
          isEffectLoop: true,
          paletteOverride:
            card === '3008' ? 'fire2' : card === '2129' ? 'hex' : 'water_mane',
          duration: 800,
          targetOverride(_context, _cardCache) {
            return null
          },
          placement(effect, _entity) {
            scene.attach(effect.mesh)
            effect.mesh.rotation.copy(scene.rotation)
            effect.mesh.position.copy(new Vector3(0, 0.035, 0.05))
            effect.mesh.position.add(new Vector3(0, -0.042, -0.02))
          },
          renderOrder: -1
        },
        {
          mesh: 'hero_death_big_ground_ring_3d_MSA',
          paletteOverride:
            card === '3008' ? 'fire2' : card === '2129' ? 'hex' : 'water_mane',
          targetOverride(_context, _cardCache) {
            return null
          },
          placement(effect, _entity) {
            effect.mesh.position.copy(new Vector3(0, 0.035, 0.05))
            effect.mesh.rotation.x = -scene.rotation.x
            effect.mesh.position.add(new Vector3(0, -0.035, -0.07))
            effect.mesh.scale.multiply(new Vector3(1.1, 1, 1.3))
          }
        }
      ],
      missileOverride: null,
      postAnimDelayAwaited: 350
    }
  ])
}

for (const card of [
  '4040' /* Extinction Event */,
  '50' /* Volcanic Blast */,
  '11' /* Burninate */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      abortIfNoFieldUnits: true,
      layers: [
        {
          mesh: 'hero_death_big_points_MSA',
          paletteOverride: 'fire2',
          scale: new Vector2(4.5, 7.5),
          targetOverride: attachToScene(),
          placement: adjustToMidFieldCenter,
          postBuildOffset: new Vector3(0.01, 0, 0),
          additiveBlending: true,
          delay: 1350,
          sfx: [
            {
              id: 'SpellMagicImpact',
              delay: 1350
            }
          ]
        },
        {
          mesh: 'ground_aura_MSA',
          isEffectLoop: true,
          paletteOverride: 'fire2',
          duration: 800,
          targetOverride(_context, _cardCache) {
            return null
          },
          placement(effect, _entity) {
            scene.attach(effect.mesh)
            effect.mesh.rotation.copy(scene.rotation)
            effect.mesh.position.copy(new Vector3(0, 0.035, 0.05))
            effect.mesh.position.add(new Vector3(0, -0.042, -0.02))
          },
          renderOrder: -1,
          delay: 1350
        },
        {
          mesh: 'hero_death_big_ground_ring_3d_MSA',
          paletteOverride: 'fire2',
          targetOverride(_context, _cardCache) {
            return null
          },
          placement(effect, _entity) {
            effect.mesh.position.copy(new Vector3(0, 0.035, 0.05))
            effect.mesh.rotation.x = -scene.rotation.x
            effect.mesh.position.add(new Vector3(0, -0.035, -0.07))
            effect.mesh.scale.multiply(new Vector3(1.1, 1, 1.3))
          },
          delay: 1350
        }
      ],
      postAnimDelayAwaited: 350
    },
    {
      type: 'impact',
      contextCheck() {
        return true
      },
      layers: [
        {
          mesh: 'explosion_poof_MSA',
          shakerCamDeltaOffset: 0.02,
          scale: new Vector2(2, 2),
          postBuildOffset: new Vector3(0, 0, -0.035),

          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
          }
        },
        {
          mesh: 'explosion_bloom_MSA',
          shakerCamDeltaOffset: 0.02,
          scale: new Vector2(2, 2),
          postBuildOffset: new Vector3(0, 0, -0.035),

          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
          }
        },
        {
          mesh: 'explosion_trace_MSA',
          shakerCamDeltaOffset: 0.02,
          scale: new Vector2(2, 2),
          postBuildOffset: new Vector3(0, 0, -0.035),

          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
          }
        },
        {
          mesh: 'explosion_base_MSA',
          shakerCamDeltaOffset: 0.02,
          scale: new Vector2(2, 2),
          postBuildOffset: new Vector3(0, 0, -0.035),

          placement(effect, _entity, targetEntity) {
            if (targetEntity && targetEntity.has('hero')) {
              effect.mesh.position.add(new Vector3(0, 0, 0.01))
            }
          }
        },
        {
          mesh: 'magma_chasm_bloom_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride(_context, _cardCache) {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(targetEntity, effect, true, true)
          }
        },
        {
          mesh: 'magma_chasm_base_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride(_context, _cardCache) {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(targetEntity, effect, true, true)
          }
        },
        {
          mesh: 'magma_chasm_bubbles_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride(_context, _cardCache) {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(targetEntity, effect, false, true)
          }
        },
        {
          mesh: 'magma_chasm_burst_MSA',
          shakerCamDeltaOffset: 0.02,

          targetOverride(_context, _cardCache) {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(targetEntity, effect, false, true)
          }
        },
        {
          mesh: 'magma_chasm_smoke_MSA',
          shakerCamDeltaOffset: 0.02,

          delay: 300,
          targetOverride(_context, _cardCache) {
            return null
          },
          placement(effect, _entity, targetEntity) {
            puddleChasmAdjustments(targetEntity, effect, false, true)
          }
        }
      ]
    }
  ])
}

for (const card of ['3064' /* Wed Dead */, '3029' /* Beloved */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      layers: [
        {
          mesh: 'hearts_MSA',
          paletteOverride: card === '3064' ? 'hex' : 'hearts',
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

meshAnimationLibrary.set('1105' /* Raze the Banners */, [
  {
    contextCheck:
      isPlayerActionPlayCardAndParentPhaseNullAndTopPhaseResolveCardEffectWithTopPhasePayload,
    layers: [
      {
        mesh: 'fire_trigger_MSA',
        placement: adjustToInfrontOfCard
      }
    ]
  }
])

for (const card of ['129' /* Execute */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      missileOverride: null,
      layers: [
        {
          mesh: 'clawSwipe_MSA',
          placement: adjustToInfrontOfCard,
          postBuildOffset: new Vector3(0, 0.005, 0),
          entityRestriction:
            entityOwnerEqualToParentPhaseResolveCardEffectPayloadOwner(),
          sfx: [
            {
              id: '99-',
              ownerCheck: (entity: Entity<Components>) => {
                return entity.has('player')
              },
              size: 'Small'
            }
          ]
        }
      ],
      postAnimDelayAwaited: 500
    }
  ])
}

meshAnimationLibrary.set('163' /* Vanquish */, [
  {
    contextCheck:
      isPlayerActionPlayCardAndParentPhaseNullAndTopPhaseResolveCardEffectWithTopPhasePayload,
    layers: [
      {
        mesh: 'clawSwipe_MSA',
        placement: adjustToInfrontOfCard,
        postBuildOffset: new Vector3(0, 0.005, 0),
        entityRestriction:
          entityOwnerEqualToParentPhaseResolveCardEffectPayloadOwner(),
        sfx: [
          {
            id: '99-',
            ownerCheck: (entity: Entity<Components>) => {
              return entity.has('player')
            },
            size: 'Small'
          }
        ]
      }
    ],
    postAnimDelayAwaited: 500
  },
  {
    contextCheck:
      isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseResolveCardEffectWithParentPhasePayload,
    layers: [
      {
        mesh: 'generic_trigger_MSA',
        paletteOverride: 'metal2',
        placement: adjustToInfrontOfCard,
        entityRestriction:
          entityOwnerNotEqualTopPhaseResolveCardEffectPayloadOwner()
      }
    ]
  }
])

for (const card of [
  '1076' /* Speed Boots */,
  '1112' /* Fair Ticket */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck:
        card === '1076'
          ? isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseResolveCardEffectWithParentPhasePayload
          : isPlayerActionPlayCardAndTopPhaseResolveCardEffectWithTopPhasePayload,
      layers: [
        {
          mesh: 'airRadialBlip_MSA',
          paletteOverride: card === '1076' ? 'earth' : 'light',
          offset: new Vector3(0, -0.006, 0),
          entityRestriction: entityHasHero(),
          sfx: [
            {
              id: '1076-',
              ownerCheck: (entity: Entity<Components>) => {
                return entity.has('player')
              }
            }
          ]
        }
      ]
    }
  ])
}

meshAnimationLibrary.set('4118' /* Overdrive! */, [
  {
    contextCheck:
      isPlayerActionPlayCardAndTopPhaseResolveCardEffectWithTopPhasePayload,
    layers: [
      {
        mesh: 'light_trigger_MSA',
        placement: adjustToInfrontOfCard,
        delay: 250
      }
    ]
  },
  {
    contextCheck: thisSpellIsBeingPlayed,
    layers: [
      {
        mesh: 'cog_MSA',
        targetOverride: spellOwnerHero(),
        placement: adjustToInfrontOfCard
      }
    ],
    postAnimDelayAwaited: 500
  }
])

meshAnimationLibrary.set('3028' /* Dirge */, [
  {
    contextCheck:
      isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseResolveCardEffectWithParentPhasePayload,
    layers: [
      {
        mesh: 'debuff_lines_MSA',
        paletteOverride: 'mind2',
        placement: adjustToInfrontOfCard,
        entityRestriction:
          entityOwnerEqualToParentPhaseResolveCardEffectPayloadOwner()
      },
      {
        mesh: 'music_notes_MSA',
        paletteOverride: 'mind2',
        placement: adjustToInfrontOfCard,
        entityRestriction:
          entityOwnerNotEqualToParentPhaseResolveCardEffectPayloadOwner()
      }
    ]
  }
])

for (const card of [
  '2036' /* Seal of Doom */,
  '20040' /* Unophobia */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck:
        isPlayerActionPlayCardAndTopPhaseResolveCardEffectWithTopPhasePayload,

      layers: [
        {
          mesh: 'debuff_lines_MSA',
          paletteOverride: 'mind2',
          placement: adjustToInfrontOfCard,
          entityRestriction: card === '20040' ? undefined : entityHasHero()
        }
      ]
    }
  ])
}

for (const card of [
  '1052' /* Snap Trap */,
  '3105' /* Food Chain */,
  '3156' /* Offering */,
  '3157' /* Toxic Bite */,
  '4046' /* Mulch */,
  '20062' /* Hexfection */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: thisSpellIsBeingPlayed,
      layers: [
        {
          mesh: 'bite_MSA',
          paletteOverride:
            card === '1052'
              ? 'metal2'
              : card === '4046'
              ? 'bite_mulch'
              : card === '3105'
              ? 'food_chain'
              : undefined,
          postBuildOffset: new Vector3(0, 0.005, 0),
          placement: adjustToInfrontOfCard,
          sfx: [
            { id: 'EnchantmentRootsAttach' },
            { id: 'SpellMagicImpact', delay: 350 }
          ]
        }
      ],
      missileOverride: card === '3105' || card === '3156' ? undefined : null,
      postAnimDelayAwaited: 750
    }
  ])
}

for (const card of [
  '58' /* Chomp */,
  '1075' /* Strige Strike */,
  '30118' /* Grim Goon (Tutorial) */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck:
        card === '30118'
          ? isPlayerActionPlayCardAndTopPhaseResolveCardEffectWithTopPhasePayload
          : isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseDamageWithParentPhasePayload,
      layers: [
        {
          mesh: 'bite_MSA',
          paletteOverride: card === '58' ? 'bite_original' : undefined,
          postBuildOffset: new Vector3(0, 0.005, 0),
          placement: adjustToInfrontOfCard,
          entityRestriction:
            card === '30118'
              ? undefined
              : entityOwnerEqualToParentPhaseResolveCardEffectPayloadOwner(),
          sfx: [
            { id: 'EnchantmentRootsAttach' },
            { id: 'SpellMagicImpact', delay: 350 }
          ]
        }
      ],
      missileOverride: card === '30118' ? undefined : null,
      postAnimDelayAwaited: 750
    }
  ])
}

meshAnimationLibrary.set('4035' /* Shrink Ray */, [
  {
    contextCheck:
      isPlayerActionPlayCardAndTopPhaseResolveCardEffectWithTopPhasePayload,
    layers: [
      {
        mesh: 'debuff_lines_MSA',
        paletteOverride: 'light_mane',
        placement: adjustToInfrontOfCard,
        entityRestriction: entityHasHero(),
        sfx: [
          {
            id: 'Debuff-Light-',
            ownerCheck: (entity: Entity<Components>) => {
              return entity.has('player')
            }
          }
        ]
      }
    ],

    postAnimTween: transform => {
      simpleTweener.to({
        description: 'Shrink Ray scaling down',
        target: transform.scale,
        propertyGoals: {
          x: transform.scale.x * 0.85,
          y: transform.scale.y * 0.85,
          z: transform.scale.z * 0.85
        },
        duration: 1000,
        easing: Easing.Elastic.InOut
      })
      animationDelay(1000).then(() => {
        simpleTweener.to({
          description: 'Return to normal scale',
          target: transform.scale,
          propertyGoals: {
            x: 1.26,
            y: 1.26,
            z: 1.26
          },
          duration: 1000,
          easing: Easing.Cubic.In
        })
      })
    }
  }
])

for (const card of ['120' /* Hugeify */, '164' /* Power Infusion */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck:
        isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseResolveCardEffectWithParentPhasePayload,
      postAnimTween: transform => {
        simpleTweener.to({
          description: 'Hugeify scaling up',
          target: transform.scale,
          propertyGoals: {
            x: transform.scale.x * 1.35,
            y: transform.scale.y * 1.35,
            z: transform.scale.z * 1.35
          },
          duration: 1000,
          easing: Easing.Elastic.InOut
        })
        animationDelay(1000).then(() => {
          simpleTweener.to({
            description: 'Return to normal scale',
            target: transform.scale,
            propertyGoals: {
              x: 1.26,
              y: 1.26,
              z: 1.26
            },
            duration: 1000,
            easing: Easing.Cubic.In
          })
        })
      },
      layers: []
    }
  ])
}

for (const card of [
  '128' /* Stand as One */,
  '2127' /* Warden's Command */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck:
        isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseResolveCardEffectWithParentPhasePayload,
      layers: [
        {
          mesh: 'generic_trigger_MSA',
          paletteOverride: card === '128' ? 'light' : 'air',
          placement: adjustToInfrontOfCard,
          delay: card === '128' ? 300 : 100
        }
      ]
    }
  ])
}

meshAnimationLibrary.set('3060' /* Dead Weight */, [
  {
    contextCheck:
      isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseDamageWithParentPhasePayload,
    layers: [
      {
        mesh: 'death_trigger_low_MSA',
        offset: new Vector3(0, 0.02, 0),
        postBuildOffset: new Vector3(0.006, 0.006, -0.004),
        reversed: true,
        delay: 200
      },
      {
        mesh: 'death_trigger_high_MSA',
        offset: new Vector3(0, 0.02, 0),
        postBuildOffset: new Vector3(0.006, 0.006, -0.004),
        reversed: true,
        delay: 200,
        sfx: [
          {
            id: 'DeathTrigger',
            hasSoundVariation: true,
            delay: 200
          }
        ]
      },
      {
        mesh: 'stomp_impact_MSA',
        paletteOverride: 'light_mane',
        placement: adjustToInfrontOfCard,
        postBuildOffset: new Vector3(0, 0.005, 0),
        delay: 1100,
        sfx: [
          {
            id: '6-',
            ownerCheck: (entity: Entity<Components>) => {
              return entity.has('player')
            },
            delay: 1100
          }
        ]
      },
      {
        mesh: 'hero_death_big_ground_ring_3d_MSA',
        paletteOverride: 'transparent_air',
        placement: adjustToUnderneathCard,
        delay: 1100
      },
      {
        mesh: 'basicCrack_MSA',
        paletteOverride: isConquestIsland ? 'crackedSandstone' : 'crackedFloor',
        isEffectLoop: true,
        delay: 1350,
        offset: new Vector3(0, -0.03, 0.015),
        detached: true,
        duration: 1500
      }
    ],
    missileOverride: null,
    postAnimDelayAwaited: 1500
  }
])

for (const card of [
  '145' /* Treefolk Stomper */,
  '6' /* Stomp */,
  '30127' /* Stomp (Tutorial) */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck:
        card === '145'
          ? isPlayerActionPlayCardAndTopPhaseResolveCardEffectWithTopPhasePayload
          : isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseDamageWithParentPhasePayload,
      layers: [
        {
          mesh: 'stomp_paw_MSA',
          paletteOverride: 'fire_mane',
          placement: adjustToInfrontOfCard,
          postBuildOffset: new Vector3(0, 0.005, 0),
          delay: 250
        },
        {
          mesh: 'stomp_impact_MSA',
          paletteOverride: 'light_mane',
          placement: adjustToInfrontOfCard,
          postBuildOffset: new Vector3(0, 0.005, 0),
          delay: 550,
          sfx: [
            {
              id: '6-',
              ownerCheck: (entity: Entity<Components>) => {
                return entity.has('player')
              },
              delay: 550
            }
          ]
        },
        {
          mesh: 'hero_death_big_ground_ring_3d_MSA',
          paletteOverride: 'transparent_air',
          placement: adjustToUnderneathCard,
          delay: 500
        },
        {
          mesh: 'basicCrack_MSA',
          paletteOverride: isConquestIsland
            ? 'crackedSandstone'
            : 'crackedFloor',
          isEffectLoop: true,
          delay: 500,
          offset: new Vector3(0, -0.03, 0.015),
          detached: true,
          duration: 1500
        }
      ],
      missileOverride: card === '145' ? undefined : null,
      postAnimDelayAwaited: 1500
    }
  ])
}

meshAnimationLibrary.set('20039' /* Anima */, [
  {
    contextCheck:
      isPlayerActionPlayCardAndParentPhaseResolveTriggerAndTopPhaseResolveTriggerWithTopPhasePayloadIntrinsic,
    layers: [
      {
        mesh: 'generic_trigger_MSA',
        paletteOverride: 'earth',
        placement: adjustToInfrontOfCard
      }
    ]
  }
])

meshAnimationLibrary.set('4043' /* Gear Grind */, [
  {
    contextCheck:
      isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseDamageWithParentPhasePayload,
    layers: [
      {
        mesh: 'cog_MSA',
        paletteOverride: 'cog_dmg',
        placement: adjustToInfrontOfCard
      },
      {
        mesh: 'stomp_impact_MSA',
        paletteOverride: 'light_mane',
        placement: adjustToInfrontOfCard,
        postBuildOffset: new Vector3(0, 0.005, 0),
        delay: 1000,
        sfx: [
          {
            id: '6-',
            ownerCheck: (entity: Entity<Components>) => {
              return entity.has('player')
            },
            delay: 1000
          }
        ]
      }
    ],
    missileOverride: null,
    postAnimDelayAwaited: 1000
  }
])

for (const card of [
  '3112' /* Tireless Iteration */,
  '3113' /* Rise From Scrap */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck:
        isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseResolveCardEffectWithParentPhasePayload,
      layers: [
        {
          mesh: 'cog_MSA',
          paletteOverride: card === '3113' ? 'cog_dmg' : 'cog',
          placement: adjustToInfrontOfCard
        }
      ],
      postAnimDelayAwaited: card === '3112' ? 1000 : 0
    }
  ])
}

meshAnimationLibrary.set('161' /* Rooted Defenses */, [
  {
    contextCheck:
      isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseResolveCardEffectWithParentPhasePayload,
    layers: [
      {
        mesh: 'generic_trigger_MSA',
        paletteOverride: 'earth',
        placement: adjustToInfrontOfCard
      }
    ]
  }
])

for (const card of [
  '4075' /* Deactivate */,
  '4099' /* Subjugate */,
  '2074' /* Insomnia */,
  '4084' /* Defragment */,
  '4058' /* Mutate */,
  '1039' /* Rave */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck:
        card === '4084'
          ? isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseDamageWithParentPhasePayload
          : isPlayerActionPlayCardAndTopPhaseResolveCardEffectWithTopPhasePayload,
      layers: [
        {
          mesh: 'debuff_lines_MSA',
          paletteOverride:
            card === '2074' ||
            card === '4084' ||
            card === '4058' ||
            card === '1039'
              ? 'mind2'
              : 'light_mane',
          placement: adjustToInfrontOfCard,
          sfx: [
            {
              id: 'Debuff-Light-',
              ownerCheck: (entity: Entity<Components>) => {
                return entity.has('player')
              }
            }
          ]
        }
      ],
      missileOverride: card === '4084' ? null : undefined
    }
  ])
}

for (const card of [
  '4036' /* Mad Vibes */,
  '4007' /* Mass Confuse */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck:
        isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseDamageWithParentPhasePayload,
      layers: [
        {
          mesh: 'mad_vibes_MSA',
          postBuildOffset: new Vector3(0, 0.01, 0),
          sfx: [
            {
              id: '4036-',
              ownerCheck: (entity: Entity<Components>) => {
                return entity.has('player')
              }
            }
          ]
        }
      ],
      missileOverride: null,
      postAnimDelayAwaited: 1500
    }
  ])
}

meshAnimationLibrary.set('2118' /* Stoke */, [
  {
    contextCheck:
      isPlayerActionPlayCardAndTopPhaseResolveCardEffectWithTopPhasePayload,
    layers: [
      {
        mesh: 'fire_trigger_MSA',
        placement: adjustToInfrontOfCard,
        entityRestriction(entity, _context, _cardCache) {
          return !entity.has('hero')
        }
      }
    ]
  }
])

meshAnimationLibrary.set('4117' /* Bit Shifter */, [
  {
    contextCheck:
      isPlayerActionPlayCardAndTopPhaseResolveCardEffectWithTopPhasePayload,
    layers: [
      {
        mesh: 'generic_trigger_MSA',
        paletteOverride: 'fire2',
        placement: adjustToInfrontOfCard,
        delay: 150,
        sfx: [
          {
            id: 'Debuff-Light-',
            ownerCheck: (entity: Entity<Components>) => {
              return entity.has('player')
            }
          }
        ]
      }
    ]
  }
])

for (const card of [
  '1016' /* Canopy Archer */,
  '1028' /* Huntaro */,
  '1038' /* Hail of Arrows */,
  '1147' /* Vulpine Archer */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck:
        isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseDamageWithParentPhasePayload,
      preAnimDelayAwaited: 350,
      layers: [
        {
          mesh: 'arrow_MSA',
          paletteOverride:
            card === '1016'
              ? 'earth_mane'
              : card === '1038'
              ? 'water2'
              : 'air_mane',
          placement: adjustToInfrontOfCard,
          delay: 100,
          sfx: [
            { id: '20014-Far-Small' },
            { id: 'EnchantmentFrozenTrigger', delay: 400 }
          ]
        }
      ],
      missileOverride: null,
      postAnimDelayAwaited: 600
    }
  ])
}

meshAnimationLibrary.set('1078' /* Flame Volley */, [
  {
    contextCheck:
      isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseDamageWithParentPhasePayload,
    layers: [
      {
        mesh: 'arrow_MSA',
        paletteOverride: 'fire_mane',
        placement: adjustToInfrontOfCard,
        delay: 100,
        sfx: [
          {
            id: '20014-Far-Small'
          },
          {
            id: '3099-Far',
            delay: 400
          }
        ]
      }
    ],
    missileOverride: null,
    postAnimDelayAwaited: 600
  }
])

for (const card of ['4120' /* Hexed Beast */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: isPayloadEffectTypeSunsetAndPayloadEffectIntrinsic(),
      layers: [
        {
          mesh: 'fire_plume_MSA',
          paletteOverride: 'hex',
          postBuildOffset: new Vector3(0, 0.01, -0.01)
        }
      ]
    }
  ])
}

for (const card of ['3033' /* Broodwitch */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: isParentPhaseResolveTriggerAndPayloadIntrinsic,
      preAnimDelayAwaited: 250,
      layers: [
        {
          mesh: 'crow_MSA',
          paletteOverride: 'crow_brood',
          placement: adjustToInfrontOfCard,
          postBuildOffset: new Vector3(0.01, 0.005, -0.016),
          sfx: [
            {
              id: 'Debuff-Light-',
              ownerCheck: (entity: Entity<Components>) => {
                return entity.has('player')
              }
            }
          ]
        },
        {
          mesh: 'siphon_MSA',
          placement: adjustToInfrontOfCard,
          postBuildOffset: new Vector3(0.01, 0.005, -0.016)
        },
        {
          mesh: 'twinkle_MSA',
          placement: adjustToInfrontOfCard,
          postBuildOffset: new Vector3(0.01, 0.005, -0.016)
        }
      ],
      missileOverride: 'hexMissile',
      postAnimDelayAwaited: 1000
    },
    {
      contextCheck: isPayloadEffectTypeSunriseAndPayloadEffectIntrinsic(),
      layers: [
        {
          mesh: 'fire_plume_MSA',
          paletteOverride: 'hex',
          postBuildOffset: new Vector3(0, 0.01, -0.01)
        }
      ]
    }
  ])
}

for (const card of [
  '1066' /* Grim Reprisal */,
  '2001' /* Moonbeam */,
  '3002' /* Allbane */,
  '3114' /* Soul Drain */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck:
        card === '2001'
          ? thisSpellIsBeingPlayed
          : card === '3002'
          ? isPlayerActionPlayCardAndParentPhaseResolveTriggerAndTopPhaseDamageWithTriggerSource
          : isPlayerActionPlayCardAndParentPhaseResolveCardEffectAndTopPhaseDamageWithParentPhasePayload,
      preAnimDelayAwaited: 250,
      layers: [
        {
          mesh: 'crow_MSA',
          paletteOverride: card === '1066' ? 'crow_brood' : 'crow_original',
          placement: adjustToInfrontOfCard,
          postBuildOffset: new Vector3(0.01, 0.005, -0.016),
          sfx: [
            {
              id: 'Debuff-Light-',
              ownerCheck: (entity: Entity<Components>) => {
                return entity.has('player')
              }
            }
          ]
        },
        {
          mesh: 'siphon_MSA',
          placement: adjustToInfrontOfCard,
          postBuildOffset: new Vector3(0.01, 0.005, -0.016)
        },
        {
          mesh: 'twinkle_MSA',
          placement: adjustToInfrontOfCard,
          postBuildOffset: new Vector3(0.01, 0.005, -0.016)
        }
      ],
      missileOverride: card === '2001' ? undefined : null,
      postAnimDelayAwaited: 1000
    }
  ])
}

// TODO: find out why card placement is off, animation is good, but wtf is with the card appearing where not intended
// meshAnimationLibrary.set('25003' /* Ari - Fabricate */, [
//   {
//     contextCheck: (
//       _context?: ActionStack,
//       _cardCache?: CardCacheWithEntities,
//       _payload?: PhaseResolveTrigger,
//       _playerInfo?: PlayerInfo,
//       _entity?: Entity<Components>
//     ) => {
//       return true
//     },
//     awaitIsAnimatingToFinish: true,
//     layers: [
//       {
//         mesh: 'ari_fabricate_fill_MSA',
//         renderOrder: 10,
//         placement: (
//           effect: {
//             mesh: Mesh<BufferGeometry, ZPaletteMappedMeshMaterial>
//             anim: AnimatedObject<any>
//           },
//           entity: Entity<Components>
//         ) => {
//           if (entity.has('transform')) {
//             const entityTransform = entity.get('transform')
//             effect.mesh.scale.divide(entityTransform.scale).multiplyScalar(0.5)
//             effect.mesh.position
//               .divide(entityTransform.scale)
//               .multiplyScalar(0.5)
//           }
//         },
//         postBuildOffset: (entity: Entity<Components>) => {
//           if (!entity.has('player')) {
//             return new Vector3(-0.045, 0, 0.2855)
//           } else {
//             return undefined
//           }
//         }
//       },
//       {
//         mesh: 'ari_fabricate_base_MSA',
//         renderOrder: 10,
//         placement: (
//           effect: {
//             mesh: Mesh<BufferGeometry, ZPaletteMappedMeshMaterial>
//             anim: AnimatedObject<any>
//           },
//           entity: Entity<Components>
//         ) => {
//           if (entity.has('transform')) {
//             const entityTransform = entity.get('transform')
//             effect.mesh.scale.divide(entityTransform.scale).multiplyScalar(0.5)
//             effect.mesh.position
//               .divide(entityTransform.scale)
//               .multiplyScalar(0.5)
//           }
//         }
//       }
//     ]
//   }
// ])

// if (instance.base === '25003' /* Ari - Fabricate */ && entityTransform) {
//   if (entity.has('isAnimating')) {
//     const anim = entity.get('isAnimating')
//     await anim.finishedFull
//   }

//   for (const asset of [
//     'ari_fabricate_fill_MSA',
//     'ari_fabricate_base_MSA'
//   ] as EffectName[]) {
//     buildMeshSpriteEffect(asset).then(effect => {
//       entityTransform.add(effect.mesh)

// if (!entity.has('player')) {
//   effect.mesh.position.add(new Vector3(-0.045, 0, 0.2855))
// }

// effect.mesh.scale.divide(entityTransform.scale).multiplyScalar(0.5)
// effect.mesh.position.divide(entityTransform.scale).multiplyScalar(0.5)
//       effect.mesh.renderOrder = 10
//     })
//   }
// }

meshAnimationLibrary.set('25000' /* Ada - Empower */, [
  {
    contextCheck: isTopPhaseResolveTriggerAndPayloadIntrinsic,
    awaitIsAnimatingToFinish: true,
    layers: [
      {
        mesh: 'ada_empower_bloom_MSA',
        placement: adjustToInfrontOfCard
      },
      {
        mesh: 'ada_empower_base_MSA',
        placement: adjustToInfrontOfCard
      }
    ],
    postAnimTween: transform => {
      simpleTweener.to({
        description: 'Ada - Empwower, mini scale up temporarily',
        target: transform.scale,
        propertyGoals: {
          x: transform.scale.x * 1.125,
          y: transform.scale.y * 1.125,
          z: transform.scale.z * 1.125
        },
        duration: 750,
        easing: Easing.Custom.ParabolaHop
      })
    }
  }
])

meshAnimationLibrary.set('25012' /* Sitti - Psychomancy */, [
  {
    contextCheck: isPlayerActionPlayCardAndPayloadPhaseResolveCardEffect,
    awaitIsAnimatingToFinish: true,
    layers: [
      {
        mesh: 'sitti_psychomancy_fire_MSA',
        placement: adjustToInfrontOfCard,
        sfx: [
          {
            id: '4036-',
            ownerCheck: (entity: Entity<Components>) => {
              return entity.has('player')
            }
          }
        ]
      },
      {
        mesh: 'sitti_psychomancy_smoke_MSA',
        placement: adjustToInfrontOfCard,
        delay: 1350
      },
      {
        mesh: 'energy_tower_electricity_MSA',
        placement(effect, entity) {
          if (entity.has('transform')) {
            const entityTransform = entity.get('transform')
            effect.mesh.rotation.copy(entityTransform.rotation)
            effect.mesh.rotateX(-entityTransform.rotation.x)
            effect.mesh.scale.multiplyScalar(1.5)
            effect.mesh.position.add(new Vector3(0, 0.013, -0.025))
          }
        },
        delay: 1350
      },
      {
        mesh: 'sitti_psychomancy_skulls_MSA',
        placement: adjustToInfrontOfCard,
        delay: 1350
      }
    ],
    postAnimDelayAwaited: 1850
  }
])

meshAnimationLibrary.set('25011' /* Zoey - Live Fast */, [
  {
    contextCheck: isPlayerActionPlayCardAndPayloadPhaseResolveCardEffect,
    awaitIsAnimatingToFinish: true,
    layers: [
      {
        mesh: 'zoey_live_fast_MSA',
        placement: adjustToInfrontOfCard,
        sfx: [
          {
            id: '1076-',
            ownerCheck: (entity: Entity<Components>) => {
              return entity.has('player')
            }
          }
        ]
      },
      {
        mesh: 'generic_trigger_MSA',
        paletteOverride: 'hex',
        placement: adjustToInfrontOfCard
      }
    ]
  }
])

meshAnimationLibrary.set('25013' /* Horik - Vengeance */, [
  {
    contextCheck(context, cardCache, payload, _playerInfo, entity) {
      const cardBeingPlayed =
        context &&
        context.playerAction[1].type === 'PlayCard' &&
        payload &&
        typeof payload === 'object' &&
        'baseCard' in payload &&
        payload.baseCard

      const isAbilityPlayerOwned = entity && entity.has('player')

      const isTargetPlayerOwned =
        payload &&
        typeof payload === 'object' &&
        'targetId' in payload &&
        cardCache &&
        cardCache.getEntity(payload.targetId) &&
        cardCache.getEntity(payload.targetId)!.has('player')

      return (
        ((isAbilityPlayerOwned && !isTargetPlayerOwned) ||
          (!isAbilityPlayerOwned && isTargetPlayerOwned)) &&
        cardBeingPlayed
      )
    },
    layers: [
      {
        mesh: 'horik_vengeance_axe_MSA',
        placement: horikVengeanceAdjustments,
        sfx: [{ id: 'AtkWither' }, { id: 'SpellMagicImpact', delay: 350 }]
      },
      {
        mesh: 'horik_vengeance_slice_MSA',
        placement: horikVengeanceAdjustments,
        delay: 350
      },
      {
        mesh: 'horik_vengeance_strike_MSA',
        placement: horikVengeanceAdjustments,
        delay: 350
      },
      {
        mesh: 'horik_vengeance_impact_MSA',
        placement: horikVengeanceAdjustments,
        delay: 350
      }
    ],
    postAnimDelayAwaited: 1500
  },
  {
    contextCheck(context, cardCache, payload, _playerInfo, entity) {
      const cardBeingPlayed =
        context &&
        context.playerAction[1].type === 'PlayCard' &&
        payload &&
        typeof payload === 'object' &&
        'baseCard' in payload &&
        payload.baseCard

      const isAbilityPlayerOwned = entity && entity.has('player')

      const isTargetPlayerOwned =
        payload &&
        typeof payload === 'object' &&
        'targetId' in payload &&
        cardCache &&
        cardCache.getEntity(payload.targetId) &&
        cardCache.getEntity(payload.targetId)!.has('player')

      return (
        ((isAbilityPlayerOwned && isTargetPlayerOwned) ||
          (!isAbilityPlayerOwned && !isTargetPlayerOwned)) &&
        cardBeingPlayed
      )
    },
    layers: [
      {
        mesh: 'horik_vengeance_axe_MSA',
        placement: horikVengeanceAdjustments,
        sfx: [{ id: 'AtkWither' }, { id: 'SpellMagicImpact', delay: 350 }]
      },
      {
        mesh: 'horik_vengeance_buff_MSA',
        placement: horikVengeanceAdjustments,
        delay: 350
      }
    ],
    postAnimDelayAwaited: 1500
  }
])

for (const card of [
  /* Banjo - Mercurial */
  '25014',
  '25015',
  '25016',
  '25017',
  '25018',
  '25019',
  '25020',
  '25021',
  '25022'
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck() {
        return true
      },
      type: 'aura',
      layers: [
        {
          mesh: 'banjo_mercurial_MSA',
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

meshAnimationLibrary.set('25008' /* Iris - Meditation */, [
  {
    contextCheck(context, _cardcache, payload) {
      return (
        context &&
        context.playerAction[1].type === 'PlayCard' &&
        typeof payload === 'object' &&
        'baseCard' in payload &&
        payload.baseCard === '25008'
      )
    },
    layers: [
      {
        mesh: 'iris_meditation_MSA',
        targetOverride: spellOwnerHero(),
        placement: adjustToInfrontOfCard
      }
    ],
    preAnimDelayAwaited: 300,
    pulseFullOnHeroWithDelay: 300
  }
])

meshAnimationLibrary.set('25005' /* Ruffian */, [
  {
    contextCheck: isParentPhaseResolveTriggerAndPayloadIntrinsic,
    layers: [
      {
        mesh: 'darkStreak_MSA',
        paletteOverride: 'mind',
        postBuildOffset: new Vector3(0.01, 0.005, 0),
        sfx: [{ id: 'AtkWither' }]
      }
    ],
    missileOverride: null,
    postAnimDelayAwaited: 600
  }
])

meshAnimationLibrary.set('4109' /* Micro-Manager */, [
  {
    contextCheck: isTopPhaseResolveTriggerAndPayloadIntrinsic,
    layers: [
      {
        mesh: 'cog_MSA',
        placement: adjustToInfrontOfCard
      }
    ]
  },
  {
    contextCheck: isPayloadEffectTypeGenericAndPayloadEffectIntrinsic(),
    layers: [
      {
        mesh: 'light_trigger_MSA',
        placement: adjustToInfrontOfCard
      }
    ]
  }
])

meshAnimationLibrary.set('1139' /* Cygnan Singer */, [
  {
    contextCheck: isTopPhaseResolveTriggerAndPayloadIntrinsic,
    layers: [
      {
        mesh: 'generic_trigger_MSA',
        paletteOverride: 'air',
        placement: adjustToInfrontOfCard
      }
    ]
  }
])

meshAnimationLibrary.set('2107' /* Pokey, Mailpig */, [
  {
    contextCheck: isTopPhaseResolveTriggerAndPayloadIntrinsic,
    layers: [
      {
        mesh: 'feathers_MSA',
        placement: adjustToInfrontOfCard
      }
    ]
  }
])

for (const card of ['3034' /* Bard Rock */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: isPayloadEffectTypeGenericAndPayloadEffectIntrinsic(),
      layers: [
        {
          mesh: 'music_notes_MSA',
          paletteOverride: 'music_light',
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of [
  '4124' /* Star Cetacean */,
  '1125' /* Skyfire Master */,
  '52' /* Rocket */,
  '2027' /* Inspirator */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: isTopPhaseResolveTriggerAndPayloadIntrinsic,
      layers: [
        {
          mesh:
            card === '4124'
              ? 'water_trigger_MSA'
              : card === '2027'
              ? 'mind_trigger_MSA'
              : 'fire_trigger_MSA',
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of ['154' /* Armis Commander */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck:
        isPlayerActionPlayCardAndTopPhaseResolveCardEffectWithTopPhasePayload,
      layers: [
        {
          mesh: 'generic_trigger_MSA',
          paletteOverride: 'metal2',
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of ['156' /* Pummel */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck:
        isPlayerActionPlayCardAndTopPhaseResolveCardEffectWithTopPhasePayload,
      layers: [
        {
          mesh: 'generic_trigger_MSA',
          paletteOverride: 'earth',
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of ['125' /* Oreheart Brawler */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: isTopPhaseResolveTriggerAndPayloadIntrinsic,
      layers: [
        {
          mesh: 'generic_trigger_MSA',
          paletteOverride: 'metal2',
          placement: adjustToInfrontOfCard
        }
      ]
    },
    {
      contextCheck: isPayloadEffectTypeGenericAndPayloadEffectIntrinsic(),
      layers: [
        {
          mesh: 'metal_trigger_MSA',
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of ['1060' /* Epic Eagle */, '1040' /* Talonous */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck:
        isPlayerActionPlayCardAndParentPhaseResolveTriggerWithTriggerSource,
      layers: [
        {
          mesh: 'feathers_MSA',
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}

for (const card of ['1019' /* Gale */, '55' /* Garuda */] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck:
        isPlayerActionAttackAndParentPhaseResolveTriggerWithTriggerSource,
      layers: [
        {
          mesh: 'feathers_MSA',
          placement: adjustToInfrontOfCard,
          delay: 300
        }
      ]
    }
  ])
}

for (const card of [
  '141' /* Treefolk Sage */,
  '30113' /* Treefolk Sage (Tutorial) */,
  '144' /* Treefolk Bulwark */
] as const) {
  meshAnimationLibrary.set(card, [
    {
      contextCheck: isTopPhaseResolveTriggerAndPayloadIntrinsic,
      layers: [
        {
          mesh: 'generic_trigger_MSA',
          paletteOverride: 'earth',
          placement: adjustToInfrontOfCard
        }
      ]
    }
  ])
}
