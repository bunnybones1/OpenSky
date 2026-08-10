import { isDevMode } from '@opensky/shared/devMode'
import { getUrlFlag } from '@opensky/shared/utils/location'
import {
  BaseCard,
  isHero,
  PhaseModifyCard,
  ResolvedPhaseModifyCard
} from '@skyweaver/state-metadata'
import { Vector3 } from 'three'

import { CardCacheWithEntities } from '~/cardCache'
import HeroAbilityCountersComponent from '~/components/HeroAbilityCountersComponent'
import IsBeingDamagedComponent from '~/components/IsBeingDamagedComponent'
import BeamLauncher from '~/controllers/BeamLauncher'
import MissileLauncher from '~/controllers/MissileLauncher'
import { dmgSoundByBaseId } from '~/helpers/enchantmentHelpers'
import { wrapInArmorBubble } from '~/helpers/meshEffectHelpers'
import { pulseEntityScale } from '~/helpers/pulseEntityScale'
import { playSound } from '~/helpers/soundHelpers'
import {
  CuratedParticleSystems,
  isCuratedBeamParticleSystem,
  isCuratedMissileParticleSystem
} from '~/meshes/Particles/particleHelpers'
import {
  getBeamLauncher,
  getMissileLauncher
} from '~/meshes/Particles/particleLauncherFactory'
import { scene } from '~/scenes/arena/scene'
import { matchInfoStore } from '~/state/stores/MatchInfoStore'
import { useParticles } from '~/tempDesignOptions'
import { cameraShaker } from '~/utils/cameraShaker'
import { getCardName, TabbedLogger } from '~/utils/fancyLogs'
import { findAndAffectCardArtMaterial } from '~/utils/findAndAffectCardArtMaterial'

import { ActionStack } from '../AnimationOrchestrator'
import { justInFrontOfElement } from '../cardPositioning/ecsUtils'
import {
  maybeEndAttributionTracker,
  maybeStartAttributionTracker
} from './attributionTracker'
import { createBuffAnimation } from './buff'
import { contextChecker } from './contextUtils'
import { createDamageAnimation, createFatigueAnimation } from './damage'
import {
  buildLotusPetalsMSA,
  buildModifyCardMSA
} from './meshAnimationBuilders'
import {
  meshAnimationPlayer,
  missileOverrideFromCardID
} from './meshAnimationPlayer'
import { pulseEntityProgress } from './pulseEntityProgress'

const __offsetsByType = {
  ModifyPower: new Vector3(-0.015, 0, 0.023),
  ModifyHealth: new Vector3(0.015, 0, 0.023),
  ModifyCost: new Vector3(-0.022, 0, -0.021)
}

export async function onStartModifyCard(
  cardCache: CardCacheWithEntities,
  context: ActionStack,
  logger: TabbedLogger | undefined,
  { card, modifier }: PhaseModifyCard
) {
  if (typeof modifier !== 'object') {
    return
  }

  let offsetByType: Vector3 | undefined = undefined
  if ('ModifyPower' in modifier || 'SetPower' in modifier) {
    offsetByType = __offsetsByType.ModifyPower
  } else if ('ModifyHealth' in modifier || 'SetHealth' in modifier) {
    offsetByType = __offsetsByType.ModifyHealth
  } else if ('ModifyCost' in modifier || 'SetCost' in modifier) {
    offsetByType = __offsetsByType.ModifyCost
  }
  await maybeStartAttributionTracker(
    'modifyCard',
    cardCache,
    context,
    card,
    undefined,
    offsetByType
  )

  let showBuff = false
  const modifiedEntity = cardCache.getEntity(card)
  const playerActionType = context.playerAction[1].type

  if (!modifiedEntity) {
    return
  }

  if (!modifiedEntity.has('transform')) {
    return
  }

  if (getUrlFlag('logMSA') && isDevMode()) {
    console.log(
      '===========================LOG FROM onStartModifyCard ================================='
    )
    console.log(`
card: ${JSON.stringify(card)}
playerActionType: ${playerActionType}
parentPhase: ${context.parentPhase}
parentPhaseType: ${context.parentPhase?.type}
topPhase: ${context.topPhase}
topPhaseType: ${context.topPhase?.type}
ppPayload: ${
      context.parentPhase &&
      typeof context.parentPhase.payload === 'object' &&
      'baseCard' in context.parentPhase.payload &&
      context.parentPhase.payload.baseCard
    }
tpPayload: ${
      context.topPhase &&
      typeof context.topPhase.payload === 'object' &&
      'baseCard' in context.topPhase.payload &&
      context.topPhase.payload.baseCard
    }
`)
  }

  const cardID: BaseCard | false | undefined | null = contextChecker(
    context,
    cardCache
  )
  if (cardID) {
    await meshAnimationPlayer({
      ID: cardID,
      entity: modifiedEntity,
      context,
      cardCache
    })
  }

  if ('ModifyPower' in modifier && modifier.ModifyPower[1] === 'Wither') {
    // Check statement to suppress additional animations being played,
    // in the case of spells (i.e. Mad Vibes) getting Wither from Enfuego
  } else {
    await buildModifyCardMSA(modifiedEntity, context, cardCache)
  }

  const modEntTransform = modifiedEntity.get('transform')

  if ('ModifyHealth' in modifier) {
    if (logger) {
      logger.logStory(`buffed ${getCardName(card)} by ${modifier.ModifyHealth}`)
    }

    const [delta, reason] = modifier.ModifyHealth
    if (delta >= 0) {
      const isModifierFromDamageForZero =
        (reason === 'Fatigue' ||
          (typeof reason === 'object' && 'Damage' in reason)) &&
        'id' in card &&
        delta === 0

      showBuff = !isModifierFromDamageForZero

      if (
        useParticles.value &&
        typeof reason === 'object' &&
        'Lifesteal' in reason
      ) {
        const heroEntLosingLife = cardCache.getEntity(reason.Lifesteal)
        if (heroEntLosingLife) {
          showBuff = true
          await getMissileLauncher('lifeTransferMissile', scene).launch(
            justInFrontOfElement(heroEntLosingLife),
            justInFrontOfElement(modifiedEntity)
          )
        }
      }
      if (useParticles.value && showBuff) {
        getBeamLauncher('healingVapors', scene).launch(
          modEntTransform.position,
          modEntTransform.position
        )
      }

      // await createBuffAnimation(transform, modifier.ModifyHealth)
    } else if (
      !(
        reason === 'Fatigue' ||
        (typeof reason === 'object' && 'Damage' in reason)
      )
    ) {
      playSound('audioFxCommon', 'Debuff')
      // getBeamLauncher('ailingVapors', scene).launch(
      //   transform.position,
      //   transform.position
      // )
      showBuff = true
    }
    if (showBuff) {
      if (!modifiedEntity.has('mesh')) {
        console.warn(
          'Tried to buff entity',
          modifiedEntity.id,
          'but it has no mesh component'
        )
        return
      }
      findAndAffectCardArtMaterial(modifiedEntity.get('mesh'), mat => {
        return mat.colorMatrixStackFg.heal.animator.pulseFull()
      })
      await createBuffAnimation(modEntTransform, delta)
    } else if (reason === 'Fatigue') {
      createFatigueAnimation(modifiedEntity, -delta)
    } else if (typeof reason === 'object' && 'Damage' in reason) {
      // Damage VFX! :)
      // This event is a damage modify health, so we can fire all the particles etc here
      const [damageSource, damageKind] = reason.Damage
      if (!modifiedEntity.has('mesh')) {
        console.warn(
          'Tried to damage entity',
          modifiedEntity.id,
          'but it has no mesh component'
        )
        return
      }

      if (!modifiedEntity.has('transform')) {
        console.error(`Hit entity does not contain TransformComponent!`)
        return
      }
      if (!modifiedEntity.has('cardInstance')) {
        console.error(`Hit entity does not contain CardInstance Component!`)
        return
      }

      if (!modifiedEntity.has('isBeingDamaged')) {
        modifiedEntity.add(new IsBeingDamagedComponent(modifiedEntity))
      }
      let attackerEntity = cardCache.getEntity(damageSource)
      if (attackerEntity && attackerEntity.has('cardInstance')) {
        const attackerInstance = attackerEntity.get('cardInstance')
        if (useParticles.value) {
          if (
            attackerEntity &&
            damageKind.type === 'CardEffect' &&
            attackerEntity.has('transform')
          ) {
            let particleSystemName: CuratedParticleSystems = 'magicMissile'
            if (attackerEntity.has('cardInstance')) {
              const attackerInstance = attackerEntity.get('cardInstance')
              let element = attackerInstance.state.view.element
              const maybeEnchantName = dmgSoundByBaseId(attackerInstance.base)

              // In the event that a spell is causing a unit to cause damage,
              // the missiles should be flavored in terms of the spell, not the unit,
              // as in the case of: Self Destruct (3115)
              const triggerInstance = cardCache.getInstance(
                context.triggerSource?.id
              )
              if (triggerInstance) {
                element = triggerInstance.state.view.element
              }

              if (maybeEnchantName) {
                playSound(
                  'audioFxCommon',
                  `Enchantment${maybeEnchantName}Trigger`
                )
              }

              if (element === 'fire') {
                particleSystemName = 'fireMissile'
              } else if (element === 'light') {
                particleSystemName = 'electricShock'
              }

              if (
                missileOverrideFromCardID(attackerInstance.base) ||
                missileOverrideFromCardID(attackerInstance.base) === null
              ) {
                particleSystemName = missileOverrideFromCardID(
                  attackerInstance.base
                )!
              }
            }

            let launcher: MissileLauncher | BeamLauncher | undefined
            if (isCuratedMissileParticleSystem(particleSystemName)) {
              launcher = getMissileLauncher(particleSystemName, scene)
            } else if (isCuratedBeamParticleSystem(particleSystemName)) {
              launcher = getBeamLauncher(particleSystemName, scene)
            }

            if (launcher) {
              if (attackerEntity.has('isAnimating')) {
                await attackerEntity.get('isAnimating').finishedFull
              }
              meshAnimationPlayer({
                ID: attackerInstance.base,
                entity: attackerEntity,
                context,
                type: 'chargeUp'
              })

              // visual fix to have the missile coming from sacrificed target, not the spell
              if (
                attackerInstance.base === '1119' /* Searing Rage */ ||
                attackerInstance.base === '3159' /* Corpse Explosion */
              ) {
                if (context.playerAction[1].type === 'PlayCard') {
                  const adjustedAttackerEntity = cardCache.getEntity(
                    context.playerAction[1].targetID
                  )
                  if (adjustedAttackerEntity) {
                    attackerEntity = adjustedAttackerEntity
                  }
                }
              }

              await launcher.launch(
                justInFrontOfElement(attackerEntity),
                justInFrontOfElement(modifiedEntity)
              )

              meshAnimationPlayer({
                ID: attackerInstance.base,
                entity: attackerEntity,
                targetEntity: modifiedEntity,
                context,
                type: 'impact'
              })
            }
          }

          if (
            damageKind.type !== 'CardEffect' &&
            delta <= 0 &&
            modifiedEntity.has('hostingAttachment')
          ) {
            const attachedEnt = modifiedEntity.get('hostingAttachment').entity
            if (attachedEnt.has('cardInstance')) {
              const maybeEnchantName = dmgSoundByBaseId(
                attachedEnt.get('cardInstance').base
              )
              // TODO remove hardcoded hack for frozen once we get event attribution
              if (maybeEnchantName && maybeEnchantName === 'Frozen') {
                playSound(
                  'audioFxCommon',
                  `Enchantment${maybeEnchantName}Trigger`
                )
              }
            }
          }
        }
      }

      // we awaited, so we need to check again.
      if (
        !modifiedEntity.has('cardInstance') ||
        !modifiedEntity.has('isBeingDamaged')
      ) {
        return
      }
      const isTargetHero = isHero(modifiedEntity.get('cardInstance'))
      modifiedEntity.get('isBeingDamaged').queueNext(async () => {
        if (
          !modifiedEntity.has('cardInstance') ||
          !modifiedEntity.has('mesh')
        ) {
          return
        }
        if (logger) {
          logger.logStory(`damaged ${getCardName(modifiedEntity)} for ${delta}`)
        }

        if (delta < 0 && isTargetHero) {
          const info = modifiedEntity.has('player')
            ? matchInfoStore.playerInfo
            : matchInfoStore.opponentInfo

          info.heroHitThisTurn = true
        }
        const defenderCard = modifiedEntity.get('cardInstance')
        if (defenderCard.state.view.traits.includes('armor')) {
          playSound('audioFxCommon', 'AtkArmorDmg')
          getBeamLauncher('armorHit', scene).launch(
            justInFrontOfElement(modifiedEntity),
            cameraShaker.camera.position
          )
          wrapInArmorBubble(modifiedEntity.get('transform'))
        }
        findAndAffectCardArtMaterial(modifiedEntity.get('mesh'), mat =>
          mat.colorMatrixStackFg.damage.animator.pulseFull()
        )

        const triggerSourceCard = cardCache.getInstance(
          context.triggerSource?.id
        )?.base

        await createDamageAnimation(
          modifiedEntity,
          -delta,
          false,
          triggerSourceCard === '4157' /* Spear Shot */ ||
            triggerSourceCard === '4158' /* Twinspear */
        )
      })
    }
  } else if (
    useParticles.value &&
    'ModifyPower' in modifier &&
    modifier.ModifyPower[1] === 'Wither'
  ) {
    getBeamLauncher('witherDebuff', scene).launch(
      justInFrontOfElement(modifiedEntity),
      modifiedEntity.get('transform').position
    )
    findAndAffectCardArtMaterial(modifiedEntity.get('mesh'), mat =>
      mat.colorMatrixStackFg.withered.animator.pulseFull()
    )
  }
}

export async function onEndModifyCard(
  cardCache: CardCacheWithEntities,
  context: ActionStack,
  logger: TabbedLogger | undefined,
  { card, modifier }: ResolvedPhaseModifyCard
) {
  await maybeEndAttributionTracker('modifyCard', cardCache, context, card)

  const modifiedEntity = cardCache.getEntity(card)
  if (modifiedEntity && modifiedEntity.has('transform')) {
    if (typeof modifier === 'object' && 'ModifyCounters' in modifier) {
      modifiedEntity.toggle(HeroAbilityCountersComponent, true)
      pulseEntityProgress(modifiedEntity)

      if (modifier.ModifyCounters > 0) {
        pulseEntityScale(modifiedEntity)
      }

      const card =
        modifiedEntity && modifiedEntity.has('cardInstance')
          ? modifiedEntity.get('cardInstance')
          : undefined

      if (
        card &&
        card.base === '25004' /* Lotus - Enlightened */ &&
        card.state.view.counters !== undefined
      ) {
        const effect = await buildLotusPetalsMSA(
          modifiedEntity,
          card.state.view.counters
        )
        if (effect) {
          await effect.anim
        }
      }
    }
  }

  if (typeof modifier !== 'object' || !('ModifyHealth' in modifier)) {
    return
  }
  const mod = modifier.ModifyHealth[1]

  if (!mod || typeof mod !== 'object' || !('Damage' in mod)) {
    return
  }
  const ent = cardCache.getEntity(card)
  if (!ent || !ent.has('overkill') || !ent.has('cardInstance')) {
    return
  }
  const preOverkillHealth = ent.get('overkill').preDeathHealth
  ent.get('cardInstance').state.view.health =
    preOverkillHealth + modifier.ModifyHealth[0]
}
