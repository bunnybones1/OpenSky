import {
  BaseCard,
  Element,
  PhaseResolveCardEffect,
  PhaseResolveTrigger
} from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  Euler,
  Event,
  Mesh,
  Object3D,
  Vector2,
  Vector3
} from 'three'

import { isConquestIsland } from '~/arenaSettings'
import { getAssetsManager } from '~/assets/index'
import { CardCacheWithEntities } from '~/cardCache'
import { Components } from '~/components'
import { RelaxedCardInstance } from '~/components/CardInstanceComponent'
import { Seat } from '~/components/CardZoneComponent'
import IsAnimatingComponent from '~/components/IsAnimatingComponent'
import { getHero } from '~/helpers/effectHelpers'
import {
  buildMeshSpriteEffect,
  buildMeshSpriteStatic,
  EffectName,
  PaletteName,
  toggleMeshSpriteEffectLoop
} from '~/helpers/meshAnimationHelpers'
import { addEffectToSceneRelativeToCamera } from '~/helpers/meshAnimationUtils'
import { playSound } from '~/helpers/soundHelpers'
import { ownedZoneCollections } from '~/helpers/zoneCollections'
import ZPaletteMappedMeshMaterial from '~/materials/ZPaletteMappedMeshMaterial'
import { scene } from '~/scenes/arena/scene'
import { Owner } from '~/types'
import { animationDelay, nullAnimation } from '~/utils/asyncUtils'
import { cameraShaker } from '~/utils/cameraShaker'
import { findAndAffectCardArtMaterial } from '~/utils/findAndAffectCardArtMaterial'

import { ActionStack } from '../AnimationOrchestrator'
import { Easing } from './Easing'
import { AnimatedObject } from './RawTweener'
import { simpleTweener } from './tweeners'

export async function buildSmallHeroDeathMSA(
  modifiedEntity: Entity<Components>
) {
  if (modifiedEntity.has('transform') && modifiedEntity.has('zone')) {
    const am = getAssetsManager()
    await am.loadAsset('hero_death_small_blast')
    await am.loadAsset('hero_death_small_smoke')

    const heroTransform = modifiedEntity.get('transform')

    const small_death_anim_components: EffectName[] = [
      'hero_death_small_blast_MSA',
      'hero_death_small_smoke_MSA'
    ]

    for (const anim of small_death_anim_components) {
      buildMeshSpriteEffect(anim).then(effect => {
        heroTransform.add(effect.mesh)
        effect.mesh.position.add(new Vector3(0, 0.01, 0))
      })
    }
  }
}

export async function buildBigHeroDeathMSA(modifiedEntity: Entity<Components>) {
  if (modifiedEntity.has('transform') && modifiedEntity.has('zone')) {
    const am = getAssetsManager()
    await Promise.all([
      am.loadAsset('hero_death_big_black_smoke'),
      am.loadAsset('hero_death_big_clouds_A'),
      am.loadAsset('hero_death_big_clouds_B'),
      am.loadAsset('hero_death_big_flare'),
      am.loadAsset('hero_death_big_ground_ring_3d'),
      am.loadAsset('hero_death_big_points')
    ])

    const heroTransform =
      modifiedEntity.has('transform') && modifiedEntity.get('transform')
    cameraShaker.add(0.4)
    let anim: EffectName = 'basicCrack_MSA'
    if (isConquestIsland) {
      anim = 'conquestCrack_MSA'
    }
    if (heroTransform) {
      toggleMeshSpriteEffectLoop(heroTransform, anim, undefined, -0.03, 0.015)

      const big_death_anim_components = [
        'hero_death_big_black_smoke_MSA',
        'hero_death_big_points_MSA',
        'hero_death_big_clouds_B_MSA',
        'hero_death_big_clouds_A_MSA',
        'hero_death_big_flare_MSA'
      ] as const

      const isPlayer = modifiedEntity.get('zone').current.owner === 'Player'
      const zoneSeat = modifiedEntity.get('zone').current.seat.position
      const Yadjust = isPlayer ? -0.04 : 0
      const Zadjust = isPlayer ? -0.1 : 0
      const Xadjust = -zoneSeat.x * 0.275

      for (const anim of big_death_anim_components) {
        buildMeshSpriteEffect(anim).then(effect => {
          heroTransform.add(effect.mesh)
          effect.mesh.position.add(
            new Vector3(0.01 + Xadjust, 0.2 + Zadjust, 0.028 + Yadjust)
          )
          if (
            anim === 'hero_death_big_points_MSA' ||
            anim === 'hero_death_big_clouds_B_MSA' ||
            anim === 'hero_death_big_flare_MSA'
          ) {
            effect.mesh.material.blending = AdditiveBlending
          }

          if (anim === 'hero_death_big_flare_MSA') {
            effect.mesh.position.add(new Vector3(0.009, 0, 0))
          }
        })
      }

      animationDelay(100).then(() => {
        buildMeshSpriteEffect('hero_death_big_ground_ring_3d_MSA').then(
          effect => {
            heroTransform.add(effect.mesh)
            effect.mesh.rotation.x = -heroTransform.rotation.x
            effect.mesh.position.add(new Vector3(0, 0, 0.045))
          }
        )
      })
    }
  }
}

export function buildBaseChangeMSA(
  cardInstance: Readonly<RelaxedCardInstance>,
  cardEntity: Entity<Components>
) {
  if (
    cardInstance.base === '20065' /* Zomboid 2 */ &&
    cardEntity.has('transform')
  ) {
    const modEntTransform = cardEntity.get('transform')
    findAndAffectCardArtMaterial(cardEntity.get('mesh'), mat =>
      mat.colorMatrixStackWhole.changeBase.animator.pulseFull()
    )
    buildMeshSpriteEffect(
      'fire_plume_MSA',
      'hex',
      undefined,
      undefined,
      new Vector2(1.2, 1.2)
    ).then(effect => {
      modEntTransform.add(effect.mesh)
      effect.mesh.position.add(new Vector3(0, 0.01, 0))
      __3DtriggerAdjusts(effect, modEntTransform)
    })
    playSound('audioFxCommon', 'SpellCast')
  }
  if (
    cardInstance.base === '20066' /* Armis Guard 2 */ &&
    cardEntity.has('transform')
  ) {
    const modEntTransform = cardEntity.get('transform')
    findAndAffectCardArtMaterial(cardEntity.get('mesh'), mat =>
      mat.colorMatrixStackWhole.changeBase.animator.pulseFull()
    )
    buildMeshSpriteEffect(
      'fire_plume_MSA',
      'cyan',
      undefined,
      undefined,
      new Vector2(1.2, 1.2)
    ).then(effect => {
      modEntTransform.add(effect.mesh)
      effect.mesh.position.add(new Vector3(0, 0.01, 0))
      __3DtriggerAdjusts(effect, modEntTransform)
    })
    playSound('audioFxCommon', 'SpellCast')
  }
}

export async function buildOnStartResolvingCardEffectMSA(
  instance: Readonly<RelaxedCardInstance>,
  entity: Entity<Components>,
  cardCache: CardCacheWithEntities,
  targetEntity?: Entity<Components>
) {
  const targetTransform =
    targetEntity &&
    targetEntity.has('transform') &&
    targetEntity.get('transform')

  const entityTransform = entity.has('transform') && entity.get('transform')

  const hero = getHero(entity.has('player'))!
  const heroTransform = hero.get('transform')

  if (
    instance.base === '25023' /* Axel - Fate's Fortune */ &&
    entity.has('player')
  ) {
    animationDelay(100).then(() => {
      buildMeshSpriteEffect('axel_trail_MSA').then(effect => {
        const translation = new Vector3(0, 0.02, -0.2).applyQuaternion(
          cameraShaker.camera.quaternion
        )

        effect.mesh.scale.multiplyScalar(0.8)
        addEffectToSceneRelativeToCamera(effect, translation)
      })
    })
    animationDelay(550).then(() => {
      playSound('audioFxCommon', '3099-Near')
      for (let i = 0; i < 2; i++) {
        buildMeshSpriteEffect('axel_intro_flame_MSA').then(effect => {
          const translation = new Vector3(0, -0.011, -0.2).applyQuaternion(
            cameraShaker.camera.quaternion
          )

          effect.mesh.scale.multiplyScalar(0.6)
          addEffectToSceneRelativeToCamera(effect, translation)

          if (i === 1) {
            effect.mesh.rotation.z += Math.PI
            effect.mesh.material.side = BackSide
          }
        })
      }
    })
    animationDelay(700).then(() => {
      buildMeshSpriteEffect('axel_shine_MSA').then(effect => {
        const translation = new Vector3(0, -0.003, -0.09).applyQuaternion(
          cameraShaker.camera.quaternion
        )

        effect.mesh.scale.multiplyScalar(0.25)
        addEffectToSceneRelativeToCamera(effect, translation)
      })
    })
    animationDelay(800).then(() => {
      buildMeshSpriteEffect('axel_glow_slide_MSA').then(effect => {
        const translation = new Vector3(0, -0.005, -0.2).applyQuaternion(
          cameraShaker.camera.quaternion
        )

        effect.mesh.scale.multiplyScalar(1)

        effect.mesh.scale.divide(scene.scale).multiplyScalar(0.5)
        effect.mesh.position.divide(scene.scale).multiplyScalar(0.5)

        addEffectToSceneRelativeToCamera(effect, translation)
      })
    })
  }

  if (instance.base === '25009' /* Fox - Pack Master */) {
    if (entity.has('isAnimating')) {
      const anim = entity.get('isAnimating')
      await anim.finishedFull
    }

    let first = true

    animationDelay(200).then(() => {
      playSound('audioFxCommon', 'SpellFireFlight')
    })

    for (const asset of [
      'fox_packmaster_fox_MSA',
      'fox_packmaster_fox_MSA',
      'fox_packmaster_clash_MSA',
      'fox_packmaster_buff_MSA'
    ] as EffectName[]) {
      animationDelay(
        asset.includes('clash') ? 1250 : asset.includes('buff') ? 1250 : 0
      ).then(() => {
        buildMeshSpriteEffect(asset).then(effect => {
          heroTransform.add(effect.mesh)
          __3DtriggerAdjusts(effect, heroTransform)

          if (asset.includes('_fox')) {
            const direction = first ? -1 : 1
            effect.mesh.position.x += 0.008 * direction
          }

          if (first) {
            effect.mesh.rotation.z += Math.PI
            effect.mesh.material.side = BackSide
            effect.mesh.position.x -= 0.005
            first = false
          }

          const xDisplacement =
            heroTransform.position.x / (entity.has('player') ? 40 : 50)
          effect.mesh.position.x -= xDisplacement
        })
      })
    }

    animationDelay(1250).then(() => {
      findAndAffectCardArtMaterial(hero.get('mesh'), mat =>
        mat.colorMatrixStackWhole.changeBase.animator.pulseFull()
      )
      playSound('audioFxCommon', '3099-Near')
    })

    hero.add(
      new IsAnimatingComponent('Fox Pack Leader MSA', nullAnimation(1250), 1)
    )
  }

  if (instance.base === '25003' /* Ari - Fabricate */ && entityTransform) {
    if (entity.has('isAnimating')) {
      const anim = entity.get('isAnimating')

      await anim.finishedFull
    }

    for (const asset of [
      'ari_fabricate_fill_MSA',
      'ari_fabricate_base_MSA'
    ] as EffectName[]) {
      buildMeshSpriteEffect(asset).then(effect => {
        entityTransform.add(effect.mesh)

        if (!entity.has('player')) {
          effect.mesh.position.add(new Vector3(-0.045, 0, 0.2855))
        }

        effect.mesh.scale.divide(entityTransform.scale).multiplyScalar(0.5)
        effect.mesh.position.divide(entityTransform.scale).multiplyScalar(0.5)
        effect.mesh.renderOrder = 10
      })
    }
  }

  if (instance.base === '25002' /* Bouran - Ritualize */ && targetTransform) {
    for (const asset of [
      'bouran_ritualize_back_flames_bloom_MSA',
      'bouran_ritualize_back_flames_base_MSA',
      'bouran_ritualize_glow_MSA',
      'bouran_ritualize_front_flames_bloom_MSA',
      'bouran_ritualize_front_flames_base_MSA',
      'bouran_ritualize_embers_MSA'
    ] as EffectName[]) {
      buildMeshSpriteEffect(asset).then(effect => {
        targetTransform.add(effect.mesh)
        __3DtriggerAdjusts(effect, targetTransform)
        if (asset.includes('back_flames')) {
          effect.mesh.position.add(new Vector3(0, -0.003, 0))
        } else {
          effect.mesh.position.add(new Vector3(0, 0.0015, 0))
        }
        effect.mesh.renderOrder = 10
      })
    }

    for (const asset of [
      'bouran_ritualize_circle_inner_MSA',
      'bouran_ritualize_circle_moon_sun_MSA',
      'bouran_ritualize_circle_outer_MSA'
    ] as EffectName[]) {
      buildMeshSpriteStatic(asset).then(effect => {
        targetTransform.add(effect)
        effect.rotation.x = -targetTransform.rotation.x
        effect.scale.multiplyScalar(0.002)
        const xDisplacement = targetTransform.position.x / 25
        effect.position.add(new Vector3(xDisplacement, -0.022, 0.034))
        if (!targetEntity.has('player')) {
          effect.position.add(new Vector3(0, -0.004, -0.003))
        }

        // to ensure that the ritual circle appears behind the green interactive indicator glow
        effect.renderOrder = -10000

        simpleTweener.to({
          description: 'Bouran - Ritualize, scale up ritual circle temporarily',
          target: effect.scale,
          propertyGoals: {
            x: effect.scale.x * 370,
            y: effect.scale.y * 370,
            z: effect.scale.z * 370
          },
          duration: 2000,
          easing: Easing.Custom.FlatTopHalfSin,
          onUpdate: () => {
            asset.includes('outer')
              ? (effect.rotation.y += 0.005)
              : asset.includes('inner')
              ? (effect.rotation.y -= 0.005)
              : (effect.rotation.y = 0)
          },
          onComplete: () => {
            effect.removeFromParent()
          }
        })
      })
    }
  }

  if (instance.base === '4009' /* Clone Army */) {
    // TODO: add functionality 'additionalTargets: Entity<Components>[]' for meshAnimationPlayer
    const fieldTargets = entity.has('player')
      ? ownedZoneCollections['Player_Field'].items
      : ownedZoneCollections['Opponent_Field'].items
    let delay = 0
    fieldTargets.forEach(target => {
      const targetTransform = target.has('transform') && target.get('transform')
      if (targetTransform && !target.has('hero')) {
        animationDelay(100 * delay).then(() => {
          buildMeshSpriteEffect('cog_MSA').then(effect => {
            targetTransform.add(effect.mesh)
            __3DtriggerAdjusts(effect, targetTransform)
          })
        })
      }
      delay++
    })
  }
}

export async function buildModifyCardMSA(
  entity: Entity<Components>,
  context: ActionStack,
  cardCache: CardCacheWithEntities
) {
  if (
    entity.has('cardInstance') &&
    entity.has('transform') &&
    entity.has('zone')
  ) {
    const transform = entity.get('transform')

    const act = context.playerAction[1]
    const pp = context.parentPhase
    const tp = context.topPhase

    const playerActionType = act.type
    const parentPhaseType = pp?.type
    const topPhaseType = tp?.type

    if (
      playerActionType === 'PlayCard' &&
      (parentPhaseType === 'ResolveCardEffect' ||
        topPhaseType === 'ResolveCardEffect')
    ) {
      // ?!
      const parentPhasePayload = context.parentPhase
        ? (context.parentPhase.payload as PhaseResolveCardEffect)
        : (context.topPhase?.payload as PhaseResolveCardEffect)

      const spellEntity = cardCache.getEntity(parentPhasePayload.id)
      const spellInstance = cardCache.getInstance(parentPhasePayload.id)
      if (!spellEntity || !spellInstance) {
        return
      }
      const spellTransform = spellEntity.get('transform')

      if (transform === spellTransform) {
        // fix to ensure that spells that mark themselves for death
        // do not trigger an animation on the spell card itself
        return
      }

      if (
        spellInstance.base === '4157' /* Spear Shot */ ||
        spellInstance.base === '4158' /* Twinspear */
      ) {
        __buildTridentMSA(entity)
        await animationDelay(300)
      }

      // TODO: investigate why Tentacle Eruption is not catching, probably just resort to resolveSpell catch
      // if (spellInstance.base === '4127' /* Tentacle Eruption */) {
      //   if (!queuedCardEffectIDs.includes(spellInstance.base)) {
      //     queuedCardEffectIDs.push(spellInstance.base)
      //     const location = spellEntity.has('player')
      //     ? __playerGraveyard
      //     : __opponentGraveyard
      //     const audioDistance = spellEntity.has('player') ? 'Near' : 'Far'
      //     buildMeshSpriteEffect('fire_plume_MSA', 'hex').then(effect => {
      //       scene.add(effect.mesh)
      //       effect.mesh.position.copy(location)
      //       playSound('audioFxCommon', `3099-${audioDistance}`)
      //     })
      //     __resetQueuedCardEffectsIDs(100)
      //   }
      // }
    }
  }
}

export async function buildTriggerMSA(
  entity: Entity<Components>,
  payload: PhaseResolveTrigger
) {
  if (entity.has('transform') && entity.has('zone')) {
    const entityTransform = entity.get('transform')
    const entityOwner = entity.get('zone').owner

    if (payload.effectType === 'Summon') {
      let baseCard: BaseCard | undefined
      if (
        typeof payload.effect === 'object' &&
        'Intrinsic' in payload.effect &&
        payload.effect.Intrinsic
      ) {
        baseCard = payload.effect.Intrinsic
      }
      if (baseCard) {
        if (baseCard === '2111' /* Junk Golem */) {
          const cardElements: Array<Element> =
            __gatherUniqueElementsInGraveyard(entityOwner)

          for (let index = 0; index < cardElements.length; index++) {
            const element = cardElements[index]
            buildMeshSpriteEffect('generic_trigger_MSA', element).then(
              effect => {
                entityTransform.add(effect.mesh)
                __3DtriggerAdjusts(effect, entityTransform)
              }
            )
            await animationDelay(300)
          }
        }
      }
    }

    if (entity.get('cardInstance').base === '25007' /* Titus - Nurturer */) {
      const heroEntity = getHero(entity.has('player'))
      if (heroEntity && heroEntity.has('transform')) {
        const heroTransform = heroEntity.get('transform')

        buildMeshSpriteEffect('titus_nurturer_energize_MSA').then(effect => {
          heroTransform.add(effect.mesh)
          __3DtriggerAdjusts(effect, heroTransform)
        })
      }
    }

    if (entity.get('cardInstance').base === '25010' /* Mai - Gadgeteer */) {
      buildMeshSpriteEffect('mai_gadgeteer_MSA').then(effect => {
        entityTransform.add(effect.mesh)
        buildMeshSpriteEffect('hero_ability_trigger_MSA').then(effect => {
          entityTransform.add(effect.mesh)
          __3DtriggerAdjusts(effect, entityTransform)
          findAndAffectCardArtMaterial(entity.get('mesh'), mat =>
            mat.colorMatrixStackWhole.changeBase.animator.pulseFull()
          )
        })
      })
    }
  }
}

export async function buildHeroAbilityAttackMSA(
  context: ActionStack,
  attacker: Entity<Components>,
  attackerSeat: Seat,
  defenderSeat: Seat
) {
  if (
    context.topPhase &&
    context.topPhase.type === 'ResolveCardEffect' &&
    attacker.has('transform')
  ) {
    if (context.topPhase.payload.baseCard === '25001' /* Samya - Speedster */) {
      await __buildSamyaSpeedsterAnimation(attacker, attackerSeat, defenderSeat)
    }
  }
}

export async function buildLotusPetalsMSA(
  entity: Entity<Components>,
  heroAbilityCounterCurrent: number
) {
  if (heroAbilityCounterCurrent < 1 || heroAbilityCounterCurrent > 5) {
    return
  }
  const heroAbilityTransform = entity.get('transform')
  const effect = await buildMeshSpriteEffect(
    `lotus_petals_${heroAbilityCounterCurrent}_MSA` as EffectName
  )
  heroAbilityTransform.add(effect.mesh)
  if (!entity.has('player')) {
    effect.mesh.position.z += 0.12
    effect.mesh.rotation.y += Math.PI
    effect.mesh.rotation.z += Math.PI
    effect.mesh.material.side = BackSide
  }
  effect.mesh.renderOrder = 10
  return effect
}

async function __buildSamyaSpeedsterAnimation(
  attacker: Entity<Components>,
  attackerSeat: Seat,
  defenderSeat: Seat
) {
  const attackerTransform = attacker.get('transform')
  const rotation = attackerTransform.rotation.clone()
  const delta = attackerTransform.position
    .clone()
    .sub(cameraShaker.camera.position)
    .normalize()
    .multiplyScalar(0.02)

  __buildSamyaSpeedsterMSA(
    attackerSeat.position,
    rotation,
    delta,
    attacker.has('player')
  )

  //make Samya disappear
  const scaleBackup = attackerTransform.scale.clone()
  attackerTransform.scale.multiplyScalar(0.001)

  const dp = defenderSeat.position
  await simpleTweener.to({
    description: 'teleport',
    target: attackerTransform.position,
    propertyGoals: {
      x: dp.x + Math.sign(dp.x) * -0.05,
      y: dp.y + (attackerSeat.position.y - dp.y),
      z: dp.z + (attacker.has('player') ? 0.1 : -0.075)
    },
    easing: Easing.Quartic.InOut,
    duration: 300
  }).finished

  attackerTransform.scale.copy(scaleBackup)

  __buildSamyaSpeedsterMSA(
    attackerTransform.position,
    rotation,
    delta,
    attacker.has('player')
  )
  attacker.add(new IsAnimatingComponent('attack start', nullAnimation(1300), 1))

  await animationDelay(200)
  const attackingPosition = attackerTransform.position.clone()

  const anim = simpleTweener.to({
    description: 'combat attack',
    target: attackerTransform.position,
    propertyGoals: {
      x: defenderSeat.position.x,
      y: defenderSeat.position.y,
      z: defenderSeat.position.z
    },
    easing: Easing.Back.In,
    duration: 200
  })

  await anim.finished

  const postAttackDelay = 300
  simpleTweener.to({
    description: 'combat return',
    target: attackerTransform.position,
    propertyGoals: {
      x: attackingPosition.x,
      y: attackingPosition.y,
      z: attackingPosition.z
    },
    easing: Easing.Quartic.Out,
    duration: 300,
    onComplete: async () => {
      await animationDelay(postAttackDelay)
      __buildSamyaSpeedsterMSA(
        attackingPosition,
        rotation,
        delta,
        attacker.has('player')
      )

      scaleBackup.copy(attackerTransform.scale)
      attackerTransform.scale.multiplyScalar(0.001)
      const offset = 0.01 //to compensate for the shrinkage
      attackerTransform.position.x += offset
      attackerTransform.position.y += offset

      await simpleTweener.to({
        description: 'teleport',
        target: attackerTransform.position,
        propertyGoals: {
          x: attackerSeat.position.x + offset,
          y: attackerSeat.position.y + offset,
          z: attackerSeat.position.z
        },
        easing: Easing.Quartic.InOut,
        duration: 300
      }).finished

      attackerTransform.scale.copy(scaleBackup)
      attackerTransform.position.copy(attackerSeat.position)
      __buildSamyaSpeedsterMSA(
        attackerTransform.position,
        rotation,
        delta,
        attacker.has('player')
      )
    }
  })
}

function __buildSamyaSpeedsterMSA(
  position: Vector3,
  rotation: Euler,
  delta: Vector3,
  isPlayer: boolean
) {
  for (const asset of [
    'samya_teleport_bloom_MSA',
    'samya_teleport_base_MSA',
    'samya_teleport_dust_MSA',
    'samya_teleport_energy_MSA'
  ] as EffectName[]) {
    buildMeshSpriteEffect(asset).then(effect => {
      scene.add(effect.mesh)
      effect.mesh.position.copy(position)
      effect.mesh.rotation.copy(rotation)
      effect.mesh.position.sub(delta)
      effect.mesh.scale.multiplyScalar(1.6)
      effect.mesh.position.add(new Vector3(0, 0, -0.015))

      if (isPlayer) {
        effect.mesh.position.x -= effect.mesh.position.x / 100
      }
    })
  }
}

function __buildTridentMSA(entity: Entity<Components>) {
  playSound('audioFxCommon', '20014-Far-Small')
  animationDelay(200).then(() => {
    playSound('audioFxCommon', 'SpellMagicImpact')
  })

  const transform = entity.get('transform')
  if (transform) {
    const angleVariation = (Math.random() - 1) * 2

    for (const mesh of [
      'trident_bloom_MSA',
      'trident_base_MSA'
    ] as EffectName[]) {
      buildMeshSpriteEffect(mesh).then(effect => {
        transform.add(effect.mesh)
        effect.mesh.rotation.y +=
          angleVariation * (Math.PI * 0.25) + Math.PI * 0.25

        if (entity.has('player')) {
          effect.mesh.rotation.y += Math.PI
          effect.mesh.position.y += -0.08
          effect.mesh.position.z += -0.04
          effect.mesh.position.x += -(transform.position.x * 0.225)
          if (entity.has('hero')) {
            effect.mesh.position.x += -(transform.position.x * 0.01)
          }
        } else {
          if (entity.has('hero')) {
            effect.mesh.position.x += -(transform.position.x * 0.27)
          } else {
            effect.mesh.position.y += 0.03
            effect.mesh.position.x += -(transform.position.x * 0.31)
          }
        }
      })
    }
  }
}

function __gatherUniqueElementsInGraveyard(owner: Owner) {
  const cardElements: Array<Element> = []
  const ownerGraveyard =
    ownedZoneCollections[`${owner}_Graveyard` as const].items
  ownerGraveyard.forEach(card => {
    if (card.has('cardInstance')) {
      const element = card.get('cardInstance').state.view.element
      if (!cardElements.includes(element)) {
        cardElements.push(element)
      }
    }
  })
  return cardElements
}

export function buildReceiveAttachmentMSA(
  attachmentEntity: Entity<Components>
) {
  // CATCH UNITS WITH NEWLY ATTACHED ATTACHMENTS (COMING FROM LIMBO) HERE

  if (
    attachmentEntity.has('cardInstance') &&
    attachmentEntity.has('attachedTo')
  ) {
    const cardInstance = attachmentEntity.get('cardInstance')
    let anim: EffectName | undefined
    let palette: PaletteName | undefined

    switch (cardInstance.base) {
      case '20051' /* Fury */:
        anim = 'fire_trigger_MSA'
        break
      case '20023' /* Flames */:
        anim = 'fire_trigger_MSA'
        break
      case '20018' /* Fireball */:
        anim = 'fire_trigger_MSA'
        break
      case '20022' /* Zap */:
        anim = 'light_trigger_MSA'
        break
      case '20039' /* Anima */:
        anim = 'generic_trigger_MSA'
        palette = 'earth'
        break
      case '20032' /* Dazed */:
        anim = 'mind_trigger_MSA'
        break
      case '20010' /* Roots */:
        anim = 'generic_trigger_MSA'
        palette = 'earth'
        break
      case '20048' /* Silence */:
        anim = 'generic_trigger_MSA'
        palette = 'air'
        break
      default:
        break
    }

    const parentEntity = attachmentEntity.get('attachedTo').entity
    if (parentEntity.has('zone')) {
      const parentZone = parentEntity.get('zone').current.cardStatus
      if (
        parentEntity.has('transform') &&
        anim &&
        parentZone !== 'Conjuring' &&
        parentZone !== 'Deck'
      ) {
        const parentEntityTransform = parentEntity.get('transform')
        animationDelay(500).then(() => {
          if (anim) {
            buildMeshSpriteEffect(
              anim,
              palette,
              undefined,
              undefined,
              undefined,
              anim.includes('light') ? 2 : 1
            ).then(effect => {
              parentEntityTransform.add(effect.mesh)
              __3DtriggerAdjusts(effect, parentEntityTransform)
            })
          }
        })
      }
    }
  }
}

export function buildAnimatingSubmergeMSA(
  entity: Entity<Components>,
  submerging: boolean
) {
  const transform = entity.has('transform') && entity.get('transform')
  const mesh = entity.has('mesh') && entity.get('mesh')
  if (transform && mesh) {
    if (!submerging) {
      mesh.position.z = 0.07
    }

    const anim = simpleTweener.to({
      description: 'animate card through floor',
      target: mesh.position,
      propertyGoals: {
        z: submerging ? 0.07 : 0
      },
      duration: 400,
      easing: submerging ? Easing.Back.In : Easing.Back.Out
    })

    playSound('audioFxCards', 'Summon_487')

    animationDelay(200).then(() => {
      buildMeshSpriteEffect('water_trigger_MSA').then(effect => {
        transform.add(effect.mesh)
        __3DtriggerAdjusts(effect, mesh)
        scene.attach(effect.mesh)
        effect.mesh.scale.multiplyScalar(1.3)
        effect.mesh.rotation.x += Math.PI * 0.25
        effect.mesh.position.z += 0.006
        effect.mesh.position.y += 0.009
      })
    })

    return anim
  }
  return undefined
}

function __3DtriggerAdjusts(
  effect: {
    mesh: Mesh<BufferGeometry, ZPaletteMappedMeshMaterial>
    anim: AnimatedObject<any>
  },
  entityTransform: Object3D<Event>
) {
  // since triggers are actually3D,
  // these adjustments need to be made in order for the animation
  // to be slid infront of the card and behind the attachment
  effect.mesh.rotation.copy(entityTransform.rotation)
  effect.mesh.rotateX(-Math.PI / 4 - 0.1555)
  effect.mesh.position.add(new Vector3(0, 0.0015, 0.0015))
  effect.mesh.position.add(new Vector3(0, 0.001, 0))
}
