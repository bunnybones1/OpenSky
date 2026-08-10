import { lerp, rand, rand2 } from '@opensky/shared/utils/math'
import { BaseCard, isUnit } from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import { Euler, Matrix4, Object3D, Vector3 } from 'three'

import { getCardCache } from '~/cardCache'
import { Components } from '~/components'
import { Seat } from '~/components/CardZoneComponent'
import CharacterComponent from '~/components/CharacterComponent'
import FrontFacesVisibleComponent from '~/components/FrontFacesVisibleComponent'
import IsAnimatingComponent from '~/components/IsAnimatingComponent'
import PortallingComponent from '~/components/PortallingComponent'
import { ZoneData } from '~/components/ZoneComponent'
import {
  ARENA_ANGLE,
  FIELD_HEIGHT_CONJURE,
  SCALE_CARD,
  SIZE_RATIO_CARD_TO_ATTACHMENT
} from '~/constants'
import { bezierAnimTestParams } from '~/helpers/bezierAnimTestParams'
import { getHeroAbility } from '~/helpers/effectHelpers'
import { isMercurial } from '~/helpers/meshAnimationMaps'
import { openPortal } from '~/helpers/meshEffectHelpers'
import { SupportedPortalVariants } from '~/helpers/portalSettings'
import { cardShapeCoords } from '~/helpers/shapeHelpers'
import { playOrderedSoundVariation, playSound } from '~/helpers/soundHelpers'
import { removeWorldEntity } from '~/helpers/worldHelpers'
import { getYadaYadaDuration } from '~/helpers/yadaYadaDurationHelper'
import { ownedZoneCollections } from '~/helpers/zoneCollections'
import { getBeamLauncher } from '~/meshes/Particles/particleLauncherFactory'
import { scene } from '~/scenes/arena/scene'
import { CardStatus } from '~/types'
import { animationDelay, nullAnimation } from '~/utils/asyncUtils'
import { get2DPositionAtDepth } from '~/utils/camera'
import { cameraShaker } from '~/utils/cameraShaker'
import { findAndAffectCardArtMaterial } from '~/utils/findAndAffectCardArtMaterial'
import { buildParameters } from '~/utils/jsUtils'
import { ensureBoundsExist, getBounds } from '~/utils/meshUtils'
import { onNextFrame } from '~/utils/onNextFrame'
import { getTempQuatFromEuler } from '~/utils/threeMathUtils'
import { cloneTransform, copyTransform } from '~/utils/transformUtils'

import {
  opponentHeroAbilityHelper,
  playerHeroAbilityHelper
} from '../cardPositioning/heroAbilityPositionHelpers'
import ZoneSystem from '../cardPositioning/ZoneSystem'
import {
  getCardMotionHandle,
  getCardMotionHandles,
  nullHandle
} from './animationPositionHandleLib'
import { Ease, Ease3, Easing, isEase3 } from './Easing'
import { emitParticlesInLineShape } from './emitParticlesInLineShape'
import {
  buildAnimatingSubmergeMSA,
  buildReceiveAttachmentMSA
} from './meshAnimationBuilders'
import { meshAnimationPlayer } from './meshAnimationPlayer'
import { AnimatedObject, CompleteStatus } from './RawTweener'
import { animateTransformToTarget, TargetTransform } from './transform'
import { simpleTweener } from './tweeners'

const __tempVec = new Vector3()

type AnimationKey = `${CardStatus | '*'}-${CardStatus | '*'}`
type AnimationFunction = (
  entity: Entity<Components>,
  zoneData: ZoneData
) => IsAnimatingComponent | undefined

const __animationLibrary: { '*-*': AnimationFunction } & Partial<{
  [K in AnimationKey]: AnimationFunction
}> = {
  '*-*': __interZoneGeneric,
  'Void-*': __instant,
  '*-Dragging': __fastSnap,
  'Dragging-*': __fastSnap,
  '*-Limbo': __instant,
  'CardSelection-Dust': __destroyUnpickedOption,
  'Limbo-CardSelection': __instant,
  '*-Attachment': __attachSpell,
  'Dragging-Attachment': __fastAttach,
  'Void-Attachment': __portallingAttach,
  'Limbo-Attachment': __portallingAttach,
  'Void-Field': __instantSummon,
  'Limbo-Field': __instantSummon,
  'Void-Hand': __instantPortal,
  'OptimisticCasting-Casting': __fastSnap,
  '*-Conjuring': __comeFromPortal,
  '*-Drafting': __doNotMove,
  '*-Field': __summonAnimation,
  'Conjuring-Field': __unDustCreatureAnimation,
  '*-OptimisticCasting': optimisticCastingStartAnimation,
  '*-Casting': castingStartAnimation,
  '*-Staging': stagingStartAnimation,
  'Staging-*': stagingEndAnimation,
  '*-HeroAbilityStaging': heroAbilityStagingStartAnimation,
  'HeroAbilityStaging-*': heroAbilityStagingEndAnimation,
  'Casting-Graveyard': castingEndAnimation,
  'Field-Hand': __unsummonToHandAnimation,
  'OptimisticCasting-Hand': stagingEndAnimation,
  'Field-Deck': __unsummonToDeckAnimation,
  '*-Dust': __dustAnimation,
  '*-CardSelection': __cardSelectionStartAnimation,
  'CardSelection-Deck': __cardSelectionEndDeckAnimation,
  'CardSelection-Hand': __cardSelectionEndHandAnimation,
  'Deck-Hand': __cardDrawAnimation,
  'Hand-Deck': __discardAnimation,
  'Deck-Deck': __cardOwnershipSwapAnimation,
  'Field-Field': __cardOwnershipSwapAnimation, // for owner changes
  'Graveyard-Graveyard': __cardOwnershipSwapAnimation, // for owner changes
  'Hand-Hand': __cardOwnershipSwapAnimation, // for owner changes
  'Graveyard-Deck': __returnToDeckAnimation, // unfallow, etc
  'Field-Graveyard': __deathAnimation,
  'Reward-DisabledReward': __spinOutReward,
  'DisabledReward-Reward': __interZoneGeneric,
  'ConquestPotentialReward-DisabledReward': __spinOutReward,
  'DisabledReward-ConquestPotentialReward': __spinInReward,
  'DisabledReward-ConquestReward': __spinInReward,
  'CardSelection-OptimisticHand': __zip,
  'OptimisticHand-CardSelection': __zip,
  'OptimisticHand-Hand': __instant
}

export function getZoneAnimationComponent(
  from: CardStatus,
  to: CardStatus
): AnimationFunction {
  return (
    __animationLibrary[`${from}-${to}` as const] ||
    __animationLibrary[`*-${to}` as const] ||
    __animationLibrary[`${from}-*` as const] ||
    __animationLibrary['*-*']
  )
}

//Unit specific summon sounds
const __soundNameByCardId = new Map<'Death' | 'Summon', Map<BaseCard, string>>()
  .set(
    'Summon',
    new Map<BaseCard, string>()
      .set('2005', 'Summon_111')
      // .set('150', 'Summon_150')
      .set('1017', 'Summon_430')
      .set('2029', 'Summon_487')
  )
  .set(
    'Death',
    new Map<BaseCard, string>().set('3003', 'Death_45').set('1002', 'Death_141')
  )

function __playCardSpecificSound(id: BaseCard, category: 'Death' | 'Summon') {
  const sounds = __soundNameByCardId.get(category)!
  if (sounds.has(id)) {
    playSound('audioFxCards', sounds.get(id)!)
    return true
  }
  return false
}

function __summonAnimation(entity: Entity<Components>, zoneData: ZoneData) {
  const card = getCardCache().getInstance(entity)

  if (!card) {
    console.error('Tried to run summon animation for a non-revealed card')
    return new IsAnimatingComponent('cardless summon?', nullAnimation(0))
  }

  const rarity = card.state.view.rarity
  let soundDelay = 200

  if (rarity === 'gold') {
    playOrderedSoundVariation(
      'audioFxCommonVariations',
      'SummonGold',
      5000,
      true
    )
  } else if (rarity === 'silver') {
    playOrderedSoundVariation(
      'audioFxCommonVariations',
      'SummonSilver',
      5000,
      true
    )
  } else if (card.state.view.cost > 6) {
    playSound('audioFxCommon', 'SummonGreat')
    soundDelay = 300
  } else {
    playOrderedSoundVariation('audioFxCommonVariations', 'Summon', 5000, true)
  }

  animationDelay(soundDelay + 500).then(() => {
    __playCardSpecificSound(card.base, 'Summon')
  })

  const isPlayer = zoneData.owner === 'Player'
  const {
    fieldArriveHandle: handleEnd,
    handSummonHandle: handleStartHand,
    nullHandle: handleStartStage
  } = getCardMotionHandles(isPlayer)

  const adjustedHandleStartHand = __getOrientationCorrectHandle(
    handleStartHand,
    isPlayer,
    entity
  )

  const animComp = bezierCardAnimation(
    'summon',
    entity,
    zoneData,
    zoneData.previous.cardStatus === 'Staging'
      ? handleStartStage
      : adjustedHandleStartHand,
    handleEnd,
    {
      duration: 500,
      blockingDelayRatio: 0.4 * getYadaYadaDuration('summon'),
      characterOrCard: { character: true, delayRatio: 0.5 },
      startFromCurrentPositionInsteadOfPrevSeat: true
    },
    {
      quaternion: v => lerp(Easing.Quadratic.Out(v), v, 0.25),
      time: Easing.Custom.SummonTiming,
      position: {
        x: Easing.Quadratic.Out,
        y: Easing.Linear,
        z: Easing.Quadratic.Out
      },
      scale: Easing.Cubic.Out,
      positionTime: Easing.Cubic.InOut
    }
  )

  animComp.value.onComplete(function slamDust(entity, status) {
    if (status !== CompleteStatus.Finished) {
      return
    }
    if (!entity.has('transform')) {
      return
    }
    const transform = entity.get('transform')
    __tempVec.copy(transform.position)
    __tempVec.y -= 0.035
    __tempVec.z += 0.02
    getBeamLauncher('dustStomps', scene).launch(__tempVec, __tempVec)

    meshAnimationPlayer({ ID: 'summonCrack', entity })
    meshAnimationPlayer({ ID: 'borderGlint', entity })

    // Shake
    if (card.state.view.cost <= 6) {
      cameraShaker.add(0.015)
    } else {
      cameraShaker.add(0.04)
    }
  })
  return animComp
  // return new IsAnimatingComponent('summon', anim, undefined, true)
}

function __unDustCreatureAnimation(
  entity: Entity<Components>,
  zoneData: ZoneData
) {
  if (isReefDiver(entity)) {
    entity.add(new CharacterComponent())
    const anim = buildAnimatingSubmergeMSA(entity, false)
    if (anim) {
      const animComp = new IsAnimatingComponent(
        'dusting',
        anim,
        1,
        undefined,
        false
      )
      return animComp
    }
    return undefined
  }
  return __summonAnimation(entity, zoneData)
}

function __getOrientationCorrectHandle(
  handleStartHand: Vector3,
  isPlayer: boolean,
  entity: Entity<Components>
) {
  if (
    (!isPlayer && entity.has('isRevealed')) ||
    (!entity.has('cardInstance') && isPlayer)
  ) {
    const adjustedHandleStartHand = handleStartHand.clone()
    adjustedHandleStartHand.z *= -1
    adjustedHandleStartHand.y *= -1
    return adjustedHandleStartHand
  } else {
    return handleStartHand
  }
}

function __moveSeatForward(zoneData: ZoneData) {
  const pSeat = zoneData.previous.seat
  const endTransform = {
    position: pSeat.position.clone(),
    scale: pSeat.scale.clone(),
    quaternion: pSeat.quaternion
      .clone()
      .multiply(getTempQuatFromEuler(rand(0.1, 0.25), rand2(-0.3), 0))
  }
  endTransform.position.z += 0.02
  animateTransformToTarget(
    zoneData.previous.seat,
    endTransform,
    200,
    Easing.Quartic.Out
  )
}

function __unsummonToHandAnimation(
  entity: Entity<Components>,
  zoneData: ZoneData
) {
  playSound('audioFxCommon', 'CardBounce')
  const isPlayer = entity.has('player')
  const { fieldDepartHandle: handleStart, handHandle: handleEnd } =
    getCardMotionHandles(isPlayer)
  const adjustedHandleEnd = __getOrientationCorrectHandle(
    handleEnd,
    isPlayer,
    entity
  )
  __moveSeatForward(zoneData)
  return bezierCardAnimation(
    'unsummon to hand',
    entity,
    zoneData,
    handleStart,
    adjustedHandleEnd,
    {
      duration: 1000,
      blockingDelayRatio: 0.4 * getYadaYadaDuration('summon'),
      characterOrCard: { character: false, delayRatio: 0.5 }
    },
    {
      quaternion: isPlayer ? Easing.Cubic.Out : Easing.Cubic.In
    }
  )
}

function __unsummonToDeckAnimation(
  entity: Entity<Components>,
  zoneData: ZoneData
) {
  const isPlayer = entity.has('player')
  const { fieldDepartHandle: handleStart, deckHandle: handleEnd } =
    getCardMotionHandles(isPlayer)
  __moveSeatForward(zoneData)
  return bezierCardAnimation(
    'unsummon to hand',
    entity,
    zoneData,
    handleStart,
    handleEnd,
    {
      duration: 1000,
      blockingDelayRatio: 0.4 * getYadaYadaDuration('summon'),
      characterOrCard: { character: false, delayRatio: 0.5 }
    },
    {
      quaternion: Easing.Cubic.Out
    }
  )
}
type BezierEaseParams = {
  quaternion: Ease
  time: Ease
  position: Ease | Ease3
  scale: Ease
  positionTime: Ease
}
const __bezierEaseParamDefaults: BezierEaseParams = {
  quaternion: Easing.Quadratic.InOut,
  time: Easing.Quadratic.InOut,
  position: Easing.Quadratic.InOut,
  scale: Easing.Quadratic.InOut,
  positionTime: Easing.Linear
}

type BezierParams = {
  duration: number
  blockingDelayRatio: number
  characterOrCard: { character: boolean; delayRatio: number }
  cancellable: boolean
  startFromCurrentPositionInsteadOfPrevSeat: boolean
  delay: number
}
const __bezierParamDefaults: BezierParams = {
  duration: 1000,
  blockingDelayRatio: 1,
  characterOrCard: { character: false, delayRatio: 1 },
  cancellable: false,
  startFromCurrentPositionInsteadOfPrevSeat: false,
  delay: 0
}

function bezierCardAnimation(
  extraDescription = '',
  entity: Entity<Components>,
  zoneData: ZoneData,
  handleStart: Vector3,
  handleEnd: Vector3,
  options: Partial<BezierParams> = __bezierParamDefaults,
  easeOptions: Partial<BezierEaseParams> = __bezierEaseParamDefaults
) {
  const params = buildParameters(__bezierParamDefaults, options)
  const easeParams = buildParameters(__bezierEaseParamDefaults, easeOptions)
  const transform = entity.get('transform')
  const fromTransform = params.startFromCurrentPositionInsteadOfPrevSeat
    ? cloneTransform(transform)
    : zoneData.previous.seat
  const toTransform = zoneData.current.seat
  const handleStartRotated = new Vector3()
  const handleEndRotated = new Vector3()
  const a = new Vector3()
  const b = new Vector3()
  const progress = { val: 0 }

  const easingPosition = easeParams.position
  const finalPositionTween = isEase3(easingPosition)
    ? function ease3(target: Vector3, a: Vector3, b: Vector3, amt: number) {
        target.x = lerp(a.x, b.x, easingPosition.x(amt))
        target.y = lerp(a.y, b.y, easingPosition.y(amt))
        target.z = lerp(a.z, b.z, easingPosition.z(amt))
      }
    : function ease(target: Vector3, a: Vector3, b: Vector3, amt: number) {
        target.lerpVectors(a, b, easingPosition(amt))
      }

  bezierAnimTestParams.repeatNth--
  const testLoops =
    bezierAnimTestParams.repeatNth === 0 ? bezierAnimTestParams.repeats : 1
  const easing = testLoops > 1 ? Easing.Linear : easeParams.time
  const easingInner =
    testLoops > 1
      ? (k: number) => easeParams.time((k * testLoops) % 1)
      : Easing.Linear
  const animComp = new IsAnimatingComponent(
    'bezier movement ' + extraDescription,
    simpleTweener.to({
      description: 'bezier card anim',
      target: progress,
      easing,
      propertyGoals: { val: 1 },
      duration: params.duration * (testLoops > 1 ? 200 : 1),
      delay: params.delay,
      onUpdate: (dt, p) => {
        const amt = easingInner(p)
        handleStartRotated
          .copy(handleStart)
          .applyQuaternion(fromTransform.quaternion)
        handleEndRotated.copy(handleEnd).applyQuaternion(toTransform.quaternion)
        a.copy(fromTransform.position).addScaledVector(handleStartRotated, amt)
        b.copy(toTransform.position).addScaledVector(handleEndRotated, 1 - amt)
        const amt2 = easeParams.positionTime(amt)
        finalPositionTween(transform.position, a, b, amt2)
        transform.quaternion
          .copy(fromTransform.quaternion)
          .slerp(toTransform.quaternion, easeParams.quaternion(amt))
        transform.scale.lerpVectors(
          fromTransform.scale,
          toTransform.scale,
          easeParams.scale(amt)
        )
      }
    }),
    params.blockingDelayRatio,
    params.cancellable
  )
  let animCancelled = false
  animComp.value.finishedFull.then(
    status => (animCancelled = status === CompleteStatus.Killed)
  )
  animationDelay(params.duration * params.characterOrCard.delayRatio).then(
    () => {
      if (params.characterOrCard.character) {
        onNextFrame(() => {
          if (!entity.has('character') && !animCancelled) {
            entity.add(new CharacterComponent())
          }
        })
      } else {
        onNextFrame(() => {
          if (!animCancelled) {
            entity.remove('character')
          }
        })
      }
    }
  )
  return animComp
}
function __destroyUnpickedOption(entity: Entity<Components>) {
  const parentMesh = entity.get('mesh')
  // When we dust a parent, its attachment isn't dusted, it just stays attached in the dust zone.
  // Because of this, we should destroy the attachment information / mesh / visuals on client side
  // when the parent is dusted.

  if (entity.has('hostingAttachment')) {
    const hostingAttachment = entity.get('hostingAttachment')
    const attachedSpellTransform = hostingAttachment.entity.get('transform')
    try {
      // Steal the visuals of the attached spell for the dusting animation!
      // This will fail if the attached spell visuals don't exist,
      // or if the transform is not in the world.
      parentMesh.attach(attachedSpellTransform.children[0])

      // Now, tell the attached spell's mesh component to leave the hierarchy alone
      // so that removing the component doesn't destroy the geometry
      // that we've transplanted
      hostingAttachment.entity.getComponent('mesh')!.leaveHierarchyAlone = true
    } catch {
      console.warn(
        'Could not include attached spell as part of this entity dusting animation'
      )
    }
    // Always destroy the entity for the child attached spell,
    // since we've already stolen its geometry and it's going away.
    const attachmentEntity = hostingAttachment.entity
    entity.remove('hostingAttachment')
    getCardCache().removeEntity(attachmentEntity)
    removeWorldEntity(attachmentEntity.id)
  }

  const animComp = new IsAnimatingComponent(
    'dusting',
    nullAnimation(0),
    undefined,
    undefined,
    false
  )
  animComp.onComponentDetach.then(() => {
    getCardCache().removeEntity(entity)
    removeWorldEntity(entity.id)
  })
  return animComp
}
function __dustAnimation(entity: Entity<Components>) {
  const transform = entity.get('transform')
  const parentMesh = entity.get('mesh')
  // When we dust a parent, its attachment isn't dusted, it just stays attached in the dust zone.
  // Because of this, we should destroy the attachment information / mesh / visuals on client side
  // when the parent is dusted.

  if (entity.has('hostingAttachment')) {
    const hostingAttachment = entity.get('hostingAttachment')
    const attachedSpellTransform = hostingAttachment.entity.get('transform')
    try {
      // Steal the visuals of the attached spell for the dusting animation!
      // This will fail if the attached spell visuals don't exist,
      // or if the transform is not in the world.
      parentMesh.attach(attachedSpellTransform.children[0])

      // Now, tell the attached spell's mesh component to leave the hierarchy alone
      // so that removing the component doesn't destroy the geometry
      // that we've transplanted
      hostingAttachment.entity.getComponent('mesh')!.leaveHierarchyAlone = true
    } catch {
      console.warn(
        'Could not include attached spell as part of this entity dusting animation'
      )
    }
    // Always destroy the entity for the child attached spell,
    // since we've already stolen its geometry and it's going away.
    const attachmentEntity = hostingAttachment.entity
    entity.remove('hostingAttachment')
    getCardCache().removeEntity(attachmentEntity)
    removeWorldEntity(attachmentEntity.id)
  }

  if (isReefDiver(entity) && entity.has('specialConjure')) {
    const anim = buildAnimatingSubmergeMSA(entity, true)

    if (anim) {
      const animComp = new IsAnimatingComponent(
        'dusting',
        anim,
        1,
        undefined,
        false
      )
      animComp.onComponentDetach.then(() => {
        getCardCache().removeEntity(entity)
        removeWorldEntity(entity.id)
      })

      return animComp
    }
    return undefined
  }

  const isNotUnderField = transform.position.y > -0.01
  if (isNotUnderField) {
    const p = playPortalEffect(entity, undefined, undefined, undefined)
    if (p) {
      p.animation.finished.then(() => {
        if (transform.parent && p && p.portalPivot.parent) {
          transform.parent.attach(p.portalPivot)
        }
      })
      const animComp = new IsAnimatingComponent(
        'dusting portal',
        p.animation,
        0.4 * getYadaYadaDuration('dust')
      )
      animComp.value.isTransformAnimation = false
      animComp.onComponentDetach.then(() => {
        getCardCache().removeEntity(entity)
        removeWorldEntity(entity.id)
      })
      return animComp
    }
  }
  const animComp = new IsAnimatingComponent(
    'dusting',
    nullAnimation(0),
    undefined,
    undefined,
    false
  )
  animComp.onComponentDetach.then(() => {
    getCardCache().removeEntity(entity)
    removeWorldEntity(entity.id)
  })
  return animComp
}

function __deathAnimation(entity: Entity<Components>, zoneData: ZoneData) {
  const isPlayer = entity.has('player')
  const { fieldDepartHandle: handleStart, graveyardHandle: handleEnd } =
    getCardMotionHandles(isPlayer)
  __moveSeatForward(zoneData)

  // findAndAffectCardArtMaterial(entity.get('mesh'), mat =>
  //   mat.colorMatrixStackWhole.deathGrayscale.animator.pulseFull()
  // )
  // we will turn grayscale on and off based on markedForDeath, but the grayscale pulse will conflict with that, so disabling pulses for now

  const card = entity.get('cardInstance')
  if (!__playCardSpecificSound(card.base, 'Death')) {
    playOrderedSoundVariation(
      'audioFxCommonVariations',
      'CardDeath',
      5000,
      true
    )
  }

  return bezierCardAnimation(
    'death',
    entity,
    zoneData,
    handleStart,
    handleEnd,
    {
      duration: 1000,
      blockingDelayRatio: 0.4 * getYadaYadaDuration('summon'),
      characterOrCard: { character: false, delayRatio: 0.5 }
    },
    {
      quaternion: isPlayer ? Easing.Cubic.Out : Easing.Cubic.In
    }
  )
}

function __returnToDeckAnimation(
  entity: Entity<Components>,
  zoneData: ZoneData
) {
  return __interZoneGeneric(
    entity,
    zoneData,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    0.1
  )
}

function __attachSpell(entity: Entity<Components>, zoneData: ZoneData) {
  if (!entity.has('frontFacesVisible')) {
    entity.add(new FrontFacesVisibleComponent())
  }
  return __interZoneGeneric(
    entity,
    zoneData,
    undefined,
    800,
    Easing.Custom.RoundedOut,
    Easing.Custom.RoundedOut,
    Easing.Custom.RoundedOutHard,
    0.5
  )
}

// function __interZoneGenericAndHide(
//   entity: Entity<Components>,
//   zoneData: ZoneData
// ) {
//   const anim = __interZoneGeneric(
//     entity,
//     zoneData,
//     undefined,
//     undefined,
//     Easing.Quartic.In
//   )
//   anim?.value.animationFull.finished.then(() => {
//     entity.get('mesh').visible = false
//   })
//   return anim
// }

function __spinOutReward(entity: Entity<Components>, zoneData: ZoneData) {
  const anim = spinAnimBetweenSeats(
    entity.get('transform'),
    zoneData.previous.seat,
    zoneData.current.seat,
    'out',
    4.5
  )

  const animComp = new IsAnimatingComponent(
    'spin out reward',
    anim,
    0,
    true,
    true
  )
  animComp.value.animationFull.finished.then(() => {
    entity.get('mesh').visible = false
  })
  return animComp
}

function __spinInReward(entity: Entity<Components>, zoneData: ZoneData) {
  const anim = spinAnimBetweenSeats(
    entity.get('transform'),
    zoneData.current.seat,
    zoneData.previous.seat,
    'in',
    -4.5
  )

  const animComp = new IsAnimatingComponent(
    'spin in reward',
    anim,
    0,
    true,
    true
  )
  return animComp
}

function spinAnimBetweenSeats(
  transform: Object3D,
  seatStart: Seat,
  seatEnd: Seat,
  dir: 'in' | 'out',
  cardSpin = 4.5
) {
  const axis = new Vector3()
  const camPos = cameraShaker.camera.position
  const initVal = dir === 'out' ? 0 : 1
  const target = { val: initVal }
  const angleDir = dir === 'out' ? 1 : -1
  return simpleTweener.to({
    description: 'spin between seats',
    target,
    propertyGoals: { val: 1 - initVal },
    duration: dir === 'out' ? 1000 : 3000,
    easing: dir === 'out' ? Easing.Quartic.In : Easing.Quartic.Out,
    onUpdate() {
      const v = target.val
      transform.position.copy(seatStart.position).lerp(seatEnd.position, v)
      transform.scale.copy(seatStart.scale).lerp(seatEnd.scale, v)
      transform.quaternion
        .copy(seatStart.quaternion)
        .slerp(seatEnd.quaternion, v)
      axis.copy(camPos).sub(seatEnd.position).normalize()
      const mat = new Matrix4()
      mat.makeRotationAxis(axis, v * 6 * angleDir)
      transform.applyMatrix4(mat)
      transform.rotateOnWorldAxis(axis, v * cardSpin)
    }
  })
}

function __interZoneGeneric(
  entity: Entity<Components>,
  zoneData: ZoneData,
  fromWhereverYouAre = false,
  duration = 1000,
  easingTime?: Ease,
  easingPosition?: Ease,
  easingQuat?: Ease,
  blockingDelayRatio = 1
) {
  const transform = entity.get('transform')
  if (zoneData.instantaneous) {
    if (zoneData.current.seat) {
      copyTransform(transform, zoneData.current.seat)
    }
    return undefined
  } else {
    const handleStart = getCardMotionHandle(
      zoneData.previous.owner === 'Player',
      zoneData.previous.cardStatus
    )
    const handleEnd = getCardMotionHandle(
      zoneData.current.owner === 'Player',
      zoneData.current.cardStatus
    )
    return bezierCardAnimation(
      'interzone generic ' + (fromWhereverYouAre ? 'fromWhereverYouAre' : ''),
      entity,
      zoneData,
      handleStart,
      handleEnd,
      {
        duration,
        blockingDelayRatio,
        startFromCurrentPositionInsteadOfPrevSeat: fromWhereverYouAre
      },
      {
        quaternion: easingQuat,
        time: easingTime,
        position: easingPosition
      }
    )
  }
}

function __fastAttach(entity: Entity<Components>, zoneData: ZoneData) {
  return __fastSnap(entity, zoneData)
}

function __fastSnap(
  entity: Entity<Components>,
  zoneData: ZoneData,
  speed = 400
) {
  const transform = entity.get('transform')
  return new IsAnimatingComponent(
    'fast snap',
    animateTransformToTarget(
      transform,
      zoneData.current.seat,
      speed,
      Easing.Quintic.Out
    ),
    0,
    true
  )
}

function __zip(entity: Entity<Components>, zoneData: ZoneData) {
  return __fastSnap(entity, zoneData, 230)
}

function castingStartAnimation(entity: Entity<Components>, zoneData: ZoneData) {
  const isPlayer = entity.has('player')
  const { handSummonHandle: handleStart, castingStartHandle: handleEnd } =
    getCardMotionHandles(isPlayer)
  const adjustedHandleStart = __getOrientationCorrectHandle(
    handleStart,
    isPlayer,
    entity
  )
  const isAUnit =
    entity.has('cardInstance') && isUnit(entity.get('cardInstance'))
  const seats = getZoneSystem().zones.Player_Casting.seatController.seats
  const firstInQueue = seats.indexOf(zoneData.current.seat) === 0
  const stayStill = isAUnit && firstInQueue
  const cancellable = isAUnit

  if (!isAUnit && entity.has('interactiveIndicators')) {
    animationDelay(150).then(async () => {
      if (
        !(
          entity.has('mesh') &&
          entity.has('transform') &&
          entity.has('interactiveIndicators')
        )
      ) {
        return
      }
      findAndAffectCardArtMaterial(entity.get('mesh'), mat =>
        mat.colorMatrixStackWhole.castStart.animator.pulseFull()
      )
      playSound('audioFxCommon', 'SpellCast')
      // entity.get('interactiveIndicators').castingState.value = true
      const emitterLineShapeAssembly = emitParticlesInLineShape(
        entity.get('transform'),
        cardShapeCoords,
        'evaporatedMagic'
      )
      await animationDelay(400)
      emitterLineShapeAssembly.destroy()
      if (!entity.has('interactiveIndicators')) {
        return
      }
      // entity.get('interactiveIndicators').castingState.value = false
    })
  }
  return bezierCardAnimation(
    'casting start',
    entity,
    zoneData,
    stayStill || zoneData.previous.cardStatus === 'Attachment'
      ? nullHandle
      : adjustedHandleStart,
    stayStill ? nullHandle : handleEnd,
    {
      duration: 500,
      blockingDelayRatio: cancellable ? 0 : 1,
      characterOrCard: { character: false, delayRatio: 0.5 },
      cancellable,
      startFromCurrentPositionInsteadOfPrevSeat: true
    },
    {
      quaternion: isPlayer ? Easing.Cubic.Out : Easing.Cubic.In,
      time: Easing.Quartic.Out,
      position: Easing.Linear
    }
  )
}
function optimisticCastingStartAnimation(
  entity: Entity<Components>,
  zoneData: ZoneData
) {
  const isPlayer = entity.has('player')
  const {
    handSummonHandle: handleStart,
    optimisticCastingStartHandle: handleEnd
  } = getCardMotionHandles(isPlayer)
  const adjustedHandleStart = __getOrientationCorrectHandle(
    handleStart,
    isPlayer,
    entity
  )
  const isAUnit =
    entity.has('cardInstance') && isUnit(entity.get('cardInstance'))
  const seats = getZoneSystem().zones.Player_Casting.seatController.seats
  const firstInQueue = seats.indexOf(zoneData.current.seat) === 0
  const stayStill = isAUnit && firstInQueue
  const cancellable = isAUnit

  if (!isAUnit && entity.has('interactiveIndicators')) {
    animationDelay(150).then(async () => {
      if (
        !(
          entity.has('mesh') &&
          entity.has('transform') &&
          entity.has('interactiveIndicators')
        )
      ) {
        return
      }
      findAndAffectCardArtMaterial(entity.get('mesh'), mat =>
        mat.colorMatrixStackWhole.castStart.animator.pulseFull()
      )
      playSound('audioFxCommon', 'SpellCast')

      // entity.get('interactiveIndicators').castingState.value = true
      const emitterLineShapeAssembly = emitParticlesInLineShape(
        entity.get('transform'),
        cardShapeCoords,
        'evaporatedMagic'
      )
      await animationDelay(400)
      emitterLineShapeAssembly.destroy()
      if (!entity.has('interactiveIndicators')) {
        return
      }
      // entity.get('interactiveIndicators').castingState.value = false
    })
  }
  return bezierCardAnimation(
    'casting start',
    entity,
    zoneData,
    stayStill || zoneData.previous.cardStatus === 'Attachment'
      ? nullHandle
      : adjustedHandleStart,
    stayStill ? nullHandle : handleEnd,
    {
      duration: 500,
      blockingDelayRatio: cancellable ? 0 : 1,
      characterOrCard: { character: false, delayRatio: 0.5 },
      cancellable,
      startFromCurrentPositionInsteadOfPrevSeat: true
    },
    {
      quaternion: isPlayer ? Easing.Cubic.Out : Easing.Cubic.In,
      time: Easing.Quartic.Out,
      position: Easing.Linear
    }
  )
}

function stagingStartAnimation(entity: Entity<Components>, zoneData: ZoneData) {
  const isPlayer = entity.has('player')
  const { nullHandle: handleStart, stagingEndHandle: handleEnd } =
    getCardMotionHandles(isPlayer)
  return bezierCardAnimation(
    'staging start',
    entity,
    zoneData,
    handleStart,
    handleEnd,
    {
      duration: 500,
      blockingDelayRatio: 1,
      characterOrCard: { character: false, delayRatio: 0.5 },
      cancellable: true
    },
    {
      quaternion: Easing.Cubic.Out,
      time: Easing.Quartic.Out,
      position: Easing.Linear
    }
  )
}

function stagingEndAnimation(entity: Entity<Components>, zoneData: ZoneData) {
  const isPlayer = entity.has('player')
  const { nullHandle: handleEnd, stagingEndHandle: handleStart } =
    getCardMotionHandles(isPlayer)
  return bezierCardAnimation(
    'staging end',
    entity,
    zoneData,
    handleStart,
    handleEnd,
    {
      duration: 500,
      blockingDelayRatio: 1,
      characterOrCard: { character: false, delayRatio: 0.5 },
      cancellable: true,
      startFromCurrentPositionInsteadOfPrevSeat: true
    },
    {
      quaternion: isPlayer ? Easing.Cubic.Out : Easing.Cubic.In,
      time: Easing.Quartic.Out,
      position: Easing.Linear
    }
  )
}

function heroAbilityStagingStartAnimation(
  entity: Entity<Components>,
  zoneData: ZoneData
) {
  const isPlayer = entity.has('player')
  const { nullHandle: handleStart, heroAbilityStagingStartHandle: handleEnd } =
    getCardMotionHandles(isPlayer)
  return bezierCardAnimation(
    'staging start',
    entity,
    zoneData,
    handleStart,
    handleEnd,
    {
      duration: 500,
      blockingDelayRatio: 1,
      characterOrCard: { character: false, delayRatio: 0.5 },
      cancellable: true
    },
    {
      quaternion: Easing.Cubic.Out,
      time: Easing.Quartic.Out,
      position: Easing.Linear
    }
  )
}

function heroAbilityStagingEndAnimation(
  entity: Entity<Components>,
  zoneData: ZoneData
) {
  const isPlayer = entity.has('player')
  const { nullHandle: handleEnd, nullHandle: handleStart } =
    getCardMotionHandles(isPlayer)
  return bezierCardAnimation(
    'staging end',
    entity,
    zoneData,
    handleStart,
    handleEnd,
    {
      duration: 500,
      blockingDelayRatio: 1,
      characterOrCard: { character: false, delayRatio: 0.5 },
      cancellable: true,
      startFromCurrentPositionInsteadOfPrevSeat: true
    },
    {
      quaternion: isPlayer ? Easing.Cubic.Out : Easing.Cubic.In,
      time: Easing.Quartic.Out,
      position: Easing.Linear
    }
  )
}

function castingEndAnimation(entity: Entity<Components>, zoneData: ZoneData) {
  const isPlayer = entity.has('player')
  const {
    castingEndAloneHandle: handleStartAlone,
    castingEndQueueHandle: handleStartQueue,
    graveyardHandle: handleEnd
  } = getCardMotionHandles(isPlayer)
  const zones = ownedZoneCollections
  const zone = isPlayer ? zones.Player_Casting : zones.Opponent_Casting
  const alone = zone.length === 0
  return bezierCardAnimation(
    'casting end',
    entity,
    zoneData,
    alone ? handleStartAlone : handleStartQueue,
    handleEnd,
    {
      duration: alone ? 1000 : 500,
      blockingDelayRatio: 0.5,
      characterOrCard: { character: false, delayRatio: 0.5 }
    },
    {
      quaternion: isPlayer
        ? alone
          ? Easing.Cubic.InOut
          : Easing.Cubic.Out
        : alone
        ? Easing.Cubic.InOut
        : Easing.Cubic.In
    }
  )
}

function __cardSelectionStartAnimation(
  entity: Entity<Components>,
  zoneData: ZoneData
) {
  const isPlayer = entity.has('player')

  const { cardSelectHandle: handleEnd, deckHandle: handleStart } =
    getCardMotionHandles(isPlayer)
  return bezierCardAnimation(
    'card selection start',
    entity,
    zoneData,
    handleStart,
    handleEnd,
    {
      duration: 1000,
      blockingDelayRatio: 0.06,
      characterOrCard: { character: false, delayRatio: 0.5 }
    },
    {
      quaternion: isPlayer ? Easing.Cubic.Out : Easing.Cubic.In,
      scale: Easing.Quadratic.InOut
    }
  )
}

function __cardSelectionEndHandAnimation(
  entity: Entity<Components>,
  zoneData: ZoneData
) {
  const isPlayer = entity.has('player')
  const { nullHandle: handleStart, handHandle: handleEnd } =
    getCardMotionHandles(isPlayer)
  const adjustedHandleEnd = __getOrientationCorrectHandle(
    handleEnd,
    isPlayer,
    entity
  )
  return bezierCardAnimation(
    'card selection end',
    entity,
    zoneData,
    handleStart,
    adjustedHandleEnd,
    {
      duration: 750,
      delay: (1 - getYadaYadaDuration('cardSelectionToHand')) * 1000,
      blockingDelayRatio: 0.25,
      characterOrCard: { character: false, delayRatio: 0.5 }
    },
    {
      quaternion: isPlayer ? Easing.Cubic.Out : Easing.Cubic.In,
      scale: Easing.Quadratic.InOut
    }
  )
}

function __cardSelectionEndDeckAnimation(
  entity: Entity<Components>,
  zoneData: ZoneData
) {
  const isPlayer = entity.has('player')
  const { cardSelectHandle: handleStart, deckHandle: handleEnd } =
    getCardMotionHandles(isPlayer)
  return bezierCardAnimation(
    'card selection end deck',
    entity,
    zoneData,
    handleStart,
    handleEnd,
    {
      duration: 750,
      blockingDelayRatio: 0.25,
      characterOrCard: { character: false, delayRatio: 0.5 },
      delay: (1 - getYadaYadaDuration('cardSelectionToDeck')) * 1000
    },
    {
      quaternion: isPlayer ? Easing.Cubic.Out : Easing.Cubic.In,
      scale: Easing.Quadratic.InOut
    }
  )
}

function __cardDrawAnimation(entity: Entity<Components>, zoneData: ZoneData) {
  const transform = entity.get('transform')
  const fromTransform = zoneData.previous.seat || cloneTransform(transform)
  const toTransform = zoneData.current.seat
  const isPlayer = entity.has('player')
  const { deckHandle: handleStart, handHandle: handleEnd } =
    getCardMotionHandles(isPlayer)
  const adjustedHandleEnd = __getOrientationCorrectHandle(
    handleEnd,
    isPlayer,
    entity
  )
  const quatEase = isPlayer ? Easing.Cubic.Out : Easing.Cubic.In
  const handleStartRotated = new Vector3()
  const handleEndRotated = new Vector3()
  const a = new Vector3()
  const b = new Vector3()
  const progress = { val: 0 }
  return new IsAnimatingComponent(
    'draw',
    simpleTweener.to({
      description: 'draw',
      target: progress,
      easing: Easing.Linear,
      propertyGoals: { val: 1 },
      duration: 1000,
      onUpdate: () => {
        const rawAmt = progress.val

        const amt = Easing.Quartic.InOut(rawAmt)
        if (isPlayer) {
          const cardBack = transform.getObjectByName('card-back')
          if (cardBack) {
            cardBack.scale.y = Easing.Cubic.In(1 - rawAmt) * 1.2 + 0.0001
          }
        }

        handleStartRotated
          .copy(handleStart)
          .applyQuaternion(fromTransform.quaternion)
        handleEndRotated
          .copy(adjustedHandleEnd)
          .applyQuaternion(toTransform.quaternion)
        a.copy(fromTransform.position).addScaledVector(handleStartRotated, amt)
        b.copy(toTransform.position).addScaledVector(handleEndRotated, 1 - amt)
        const remappedAmt = Easing.Quadratic.InOut(amt)
        transform.position.lerpVectors(a, b, remappedAmt)
        transform.quaternion
          .copy(fromTransform.quaternion)
          .slerp(toTransform.quaternion, quatEase(amt))
        transform.scale.lerpVectors(fromTransform.scale, toTransform.scale, amt)
      }
    }),
    0.06
  )
}

function __cardOwnershipSwapAnimation(
  entity: Entity<Components>,
  zoneData: ZoneData
) {
  const transform = entity.get('transform')
  const fromTransform = zoneData.previous.seat || cloneTransform(transform)
  const toTransform = zoneData.current.seat
  const isPlayer = entity.has('player')
  const { behindCardHandle: handleStart, behindCardHandle: handleEnd } =
    getCardMotionHandles(isPlayer)
  const quatEase = isPlayer ? Easing.Cubic.Out : Easing.Cubic.In
  const handleStartRotated = new Vector3()
  const handleEndRotated = new Vector3()
  const a = new Vector3()
  const b = new Vector3()
  const progress = { val: 0 }
  return new IsAnimatingComponent(
    'draw',
    simpleTweener.to({
      description: 'card ownership swap',
      target: progress,
      easing: Easing.Quartic.InOut,
      propertyGoals: { val: 1 },
      duration: 600,
      onUpdate: () => {
        const amt = progress.val
        handleStartRotated
          .copy(handleStart)
          .applyQuaternion(fromTransform.quaternion)
        handleEndRotated.copy(handleEnd).applyQuaternion(toTransform.quaternion)
        a.copy(fromTransform.position).addScaledVector(handleStartRotated, amt)
        b.copy(toTransform.position).addScaledVector(handleEndRotated, 1 - amt)
        const remappedAmt = Easing.Quadratic.InOut(amt)
        transform.position.lerpVectors(a, b, remappedAmt)
        transform.quaternion
          .copy(fromTransform.quaternion)
          .slerp(toTransform.quaternion, quatEase(amt))
        transform.scale.lerpVectors(fromTransform.scale, toTransform.scale, amt)
      }
    }),
    getYadaYadaDuration('ownershipSwap')
  )
}

function __discardAnimation(entity: Entity<Components>, zoneData: ZoneData) {
  const transform = entity.get('transform')
  const fromTransform = cloneTransform(transform)
  const toTransform = zoneData.current.seat
  const isPlayer = entity.has('player')
  const { handDiscardHandle: handleStart, deckHandle: handleEnd } =
    getCardMotionHandles(isPlayer)
  const adjustedHandleStart = __getOrientationCorrectHandle(
    handleStart,
    isPlayer,
    entity
  )
  const quatEase = isPlayer ? Easing.Cubic.Out : Easing.Cubic.In
  const handleStartRotated = new Vector3()
  const handleEndRotated = new Vector3()
  const a = new Vector3()
  const b = new Vector3()
  const progress = { val: 0 }
  const anim = simpleTweener.to({
    description: 'discard',
    target: progress,
    easing: Easing.Quartic.InOut,
    propertyGoals: { val: 1 },
    duration: 1000,
    onUpdate: () => {
      const amt = progress.val
      handleStartRotated
        .copy(adjustedHandleStart)
        .applyQuaternion(fromTransform.quaternion)
      handleEndRotated.copy(handleEnd).applyQuaternion(toTransform.quaternion)
      a.copy(fromTransform.position).addScaledVector(handleStartRotated, amt)
      b.copy(toTransform.position).addScaledVector(handleEndRotated, 1 - amt)
      const amt2 = Easing.Quadratic.InOut(amt)
      transform.position.lerpVectors(a, b, amt2)
      transform.quaternion
        .copy(fromTransform.quaternion)
        .slerp(toTransform.quaternion, quatEase(amt))
      transform.scale.lerpVectors(fromTransform.scale, toTransform.scale, amt)
    }
  })
  return new IsAnimatingComponent('discard', anim, 0.06, true)
}

function __instant(entity: Entity<Components>, zoneData: ZoneData) {
  entity.remove('character')
  const transform = entity.get('transform')
  if (zoneData.current.seat) {
    copyTransform(transform, zoneData.current.seat)
  }
  return undefined
}

function __doNotMove() {
  return undefined
}

const heroAbilityRotation = new Euler(1.021017612416683, 0, 0)

function __comeFromPortal(entity: Entity<Components>, zoneData: ZoneData) {
  if (
    (isReefDiver(entity) ||
      isSpearShot(entity) ||
      (entity.has('cardInstance') &&
        isMercurial(entity.get('cardInstance')))) &&
    entity.has('specialConjure')
  ) {
    if (
      entity.has('cardInstance') &&
      isMercurial(entity.get('cardInstance')) &&
      entity.has('transform')
    ) {
      const helper = entity.has('player')
        ? playerHeroAbilityHelper
        : opponentHeroAbilityHelper

      const transform = entity.get('transform')
      transform.rotation.copy(heroAbilityRotation)
      transform.position.copy(helper.position)

      meshAnimationPlayer({
        ID: entity.get('cardInstance').base,
        entity,
        type: 'aura'
      })
    }

    if (isSpearShot(entity) && entity.has('transform')) {
      const transform = entity.get('transform')
      const heroAbilityEntity = getHeroAbility(entity.has('player'))
      if (heroAbilityEntity && heroAbilityEntity.has('transform')) {
        const heroAbilityTransform = heroAbilityEntity.get('transform')

        transform.position.copy(heroAbilityTransform.position)
        transform.quaternion.copy(heroAbilityTransform.quaternion)

        const translation = new Vector3(
          entity.has('player') ? 0.0235 : 0.00095,
          -0.001,
          entity.has('player') ? -0.0715 : 0.0715
        ).applyQuaternion(transform.quaternion)

        transform.position.add(translation)
        if (entity.has('mesh')) {
          entity.get('mesh').visible = false
        }

        simpleTweener.to({
          description: 'null animation',
          target: {},
          propertyGoals: {},
          duration: 800,
          onComplete: () => {
            if (entity.has('mesh')) {
              entity.get('mesh').visible = true
            }
            if (!entity.has('frontFacesVisible')) {
              entity.add(new FrontFacesVisibleComponent())
            }
          }
        })

        return new IsAnimatingComponent('pause', nullAnimation(1900))
      }
    }

    // disable portal animation
    return
  }

  return comeFromPortal(entity, zoneData.current.seat, zoneData.instantaneous)
}

function isReefDiver(entity: Entity<Components>) {
  return (
    entity.has('cardInstance') &&
    entity.get('cardInstance').base === '4132' /* Reef Diver */
  )
}

function isSpearShot(entity: Entity<Components>) {
  return (
    entity.has('cardInstance') &&
    entity.get('cardInstance').base === '4157' /* Spear Shot */
  )
}

function comeFromPortal(
  entity: Entity<Components>,
  targetTransform: TargetTransform,
  instant: boolean
) {
  const transform = entity.get('transform')

  //TODO get rid of this and let the seat manage it (find out why it can't)
  const startingTransform = instant
    ? targetTransform
    : {
        position: get2DPositionAtDepth(
          cameraShaker.camera,
          cameraShaker.cameraWorldPos,
          0,
          0.05,
          FIELD_HEIGHT_CONJURE
        ),
        quaternion: getTempQuatFromEuler(
          ARENA_ANGLE + (entity.has('cardInstance') ? Math.PI : 0),
          -0.0625,
          0
        ),
        scale: SCALE_CARD
      }

  copyTransform(transform, startingTransform)
  //end TODO

  if (!instant) {
    let portalAnimation: AnimatedObject<any> | undefined
    if (transform.position.y > -0.01) {
      ensureBoundsExist(transform)
      transform.updateMatrixWorld()
      const p = playPortalEffect(
        entity,
        () => copyTransform(transform, targetTransform),
        undefined,
        true
      )
      if (p) {
        portalAnimation = p.animation
      }
    }
    if (portalAnimation) {
      return new IsAnimatingComponent('conjure portal', portalAnimation) //TODO use a smaller manditoryMinumum once seat fix is in
    } else {
      return undefined
    }
  } else {
    return new IsAnimatingComponent('instant conjure', nullAnimation(0))
  }
}

function __instantSummon(entity: Entity<Components>, zoneData: ZoneData) {
  return __instantPortal(entity, zoneData, true)
}

function __instantPortal(
  entity: Entity<Components>,
  zoneData: ZoneData,
  shouldBeCharacter = false
) {
  if (shouldBeCharacter && !entity.has('character')) {
    entity.add(new CharacterComponent())
  }
  const transform = entity.get('transform')
  if (!zoneData.instantaneous) {
    ensureBoundsExist(transform)
    transform.updateMatrixWorld()
    const seat = zoneData.current.seat
    const p = playPortalEffect(
      entity,
      () => {
        copyTransform(transform, seat)
      },
      undefined,
      true
    )
    return new IsAnimatingComponent(
      'conjure summon',
      p ? p.animation : nullAnimation(0),
      0.3
    )
  } else {
    const anim = new IsAnimatingComponent(
      'instant summon',
      nullAnimation(0),
      0,
      true
    )
    anim.value.isTransformAnimation = false
    return anim
  }
}

function __portallingAttach(entity: Entity<Components>, zoneData: ZoneData) {
  buildReceiveAttachmentMSA(entity)
  return fastAttach(entity, zoneData.instantaneous)
}

function fastAttach(
  entity: Entity<Components>,
  instantaneous: boolean
): IsAnimatingComponent {
  if (
    entity.has('frontFacesVisible') &&
    entity.has('attachedTo') &&
    entity.get('attachedTo').entity.has('hostingAttachment') &&
    !instantaneous
  ) {
    const host = entity.get('attachedTo').entity.get('hostingAttachment')
    const transform = entity.get('transform')
    const finalScale = host.scale
    host.scale = 0.001
    const cardAnimation = new IsAnimatingComponent(
      'fast attach',
      simpleTweener.to({
        description: 'portalling attach',
        target: host,
        propertyGoals: {
          scale: finalScale
        },
        duration: 1000,
        easing: Easing.Elastic.Out
      }),
      0.4 * getYadaYadaDuration('fastAttach'),
      true,
      false
    )
    if (entity.has('frontFacesVisible') && transform.position.y > -0.01) {
      ensureBoundsExist(transform)
      transform.updateMatrixWorld()
      playPortalEffect(entity, undefined, undefined, true)
    }
    return cardAnimation
  } else {
    return new IsAnimatingComponent('instant attach', nullAnimation(0))
  }
}

function playPortalEffect(
  entity: Entity<Components>,
  onUpdate?: () => void,
  duration = 1000,
  reverse = false
) {
  if (!entity.has('mesh')) {
    return
  }
  if (entity.has('attachedTo')) {
    const parent = entity.get('attachedTo').entity
    const parentZone = parent?.has('zone') && parent.get('zone').stateZone
    if (parentZone === 'Graveyard' || parentZone === 'Deck') {
      return
    }
  }

  let variant: SupportedPortalVariants | undefined
  if (entity.has('cardInstance')) {
    const cardInstance = entity.get('cardInstance')
    const prism = cardInstance.state.view.prism
    if (prism !== 'tok' && prism !== 'tut') {
      variant = prism
    }
  }

  playSound('audioFxCommon', reverse ? 'Conjure' : 'Dust')

  const transform = entity.get('mesh')
  const portalPivot = new Object3D()
  portalPivot.position.copy(transform.position)
  portalPivot.rotation.set(0, 0, 0)
  const size = new Vector3()
  ensureBoundsExist(entity.get('mesh'))
  getBounds(entity.get('mesh')).getSize(size)
  const s =
    // TODO XXX - Math.max is used as a hack to limit size of portals,
    // because dusting your deck sometimes causes portals to be huge for unknown reasons
    Math.min(size.length(), 0.14) *
    5.5 *
    (entity.has('attachedTo') ? SIZE_RATIO_CARD_TO_ATTACHMENT : 1)
  portalPivot.scale.set(s, 0.001, s)
  transform.parent!.add(portalPivot)
  const animVal = { val: reverse ? 1 : 0 }
  const startPos = transform.position.clone()
  const startScale = transform.scale.clone()
  const endScale = new Vector3(0.001, 0.001, 0.001)
  const startQuat = transform.quaternion.clone()
  const euler = new Euler()
  const fullAngle = reverse ? 1.0 : -12.0
  const scaleEase = reverse ? Easing.Cubic.In : Easing.Quartic.In
  entity.toggle(PortallingComponent, true)
  openPortal(
    portalPivot,
    duration + 500,
    reverse ? (variant ? variant : 'conjure') : undefined
  ).animation.finished.then(() => {
    entity.remove('portalling')
  })
  const animation = simpleTweener.to({
    description: 'play portal effect',
    target: animVal,
    propertyGoals: {
      val: reverse ? 0 : 1
    },
    onUpdate() {
      const v = animVal.val
      transform.position
        .copy(startPos)
        .lerp(portalPivot.position, Easing.Quartic.Out(v))
      transform.translateY(Easing.Quartic.In(v) * 0.012)
      transform.scale.copy(startScale).lerp(endScale, scaleEase(v))
      euler.y = Easing.Quartic.In(v) * fullAngle
      transform.quaternion.setFromEuler(euler).multiply(startQuat)
      if (onUpdate) {
        onUpdate()
      }
    },
    easing: Easing.Linear,
    duration
  })
  return {
    animation,
    portalPivot
  }
}

let __zoneSystem: ZoneSystem
function getZoneSystem() {
  if (!__zoneSystem) {
    throw new Error('Regiester a ZoneSystem!')
  }
  return __zoneSystem
}

export function registerZoneSystem(zoneSystem: ZoneSystem) {
  __zoneSystem = zoneSystem
}
