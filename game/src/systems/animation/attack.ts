import { PhaseAttack, ResolvedPhaseAttack } from '@skyweaver/state-metadata'

import { CardCacheWithEntities } from '~/cardCache'
import IsAnimatingComponent from '~/components/IsAnimatingComponent'
import { playSound } from '~/helpers/soundHelpers'
import { cameraShaker } from '~/utils/cameraShaker'
import { getCardInstanceName, TabbedLogger } from '~/utils/fancyLogs'
import { waitForNextFrame } from '~/utils/onNextFrame'
import { timeWarp } from '~/utils/timeWarp'
import { world } from '~/world'

import { ActionStack } from '../AnimationOrchestrator'
import EmoteSystem from '../EmoteSystem'
import { Easing } from './Easing'
import { buildHeroAbilityAttackMSA } from './meshAnimationBuilders'
import { simpleTweener } from './tweeners'

export async function onStartAttack(
  cardCache: CardCacheWithEntities,
  context: ActionStack,
  logger: TabbedLogger | undefined,
  payload: PhaseAttack
) {
  await waitForNextFrame() // TODO temporary workaround for ZoneSystem not allowing two zone changes to happen on the same frame.
  const attacker = cardCache.getEntity(payload.attacker)
  const defender = cardCache.getEntity(payload.defender)
  if (!attacker) {
    console.error('No entity for attacker!')
    return
  }
  if (!defender) {
    console.error('No entity for defender!')
    return
  }

  if (attacker.has('hero') && attacker.has('player')) {
    world.getSystem(EmoteSystem).cancelEmoteRings()
  }

  const attackerSeat = attacker.get('zone').current.seat
  const defenderSeat = defender.get('zone').current.seat
  const attackerCard = cardCache.getInstance(attacker)
  const defenderCard = cardCache.getInstance(defender)
  const attackerTransform = attacker.get('transform')

  if (!attackerCard) {
    console.error('No cardInstance component on attacker entity!')
    return
  }
  if (!defenderCard) {
    console.error('No cardInstance component on defender entity!')
    return
  }
  if (logger) {
    logger.logStory(
      `${getCardInstanceName(attackerCard)} attacking ${getCardInstanceName(
        defenderCard
      )}`
    )
  }

  // Wait for them to finish their current animations
  while (attacker.has('isAnimating') || defender.has('isAnimating')) {
    await Promise.all(
      [attacker, defender].map(e =>
        e.has('isAnimating') ? e.get('isAnimating').finishedFull : null
      )
    )
  }

  if (defenderCard.state.view.traits.includes('armor')) {
    if (attackerCard.state.view.power < 2) {
      playSound('audioFxCommon', 'AtkMiss')
    } else {
      playSound('audioFxCommon', 'Atk2')
    }
  } else if (attackerCard.state.view.power === 0) {
    playSound('audioFxCommon', 'AtkMiss')
  } else if (attackerCard.state.view.traits.includes('wither')) {
    playSound('audioFxCommon', 'AtkWither')
  } else if (attackerCard.state.view.power >= 6) {
    playSound('audioFxCommon', 'AtkGreat')
  } else {
    playSound('audioFxCommon', 'Atk')
  }

  const progress = { amt: 0 }
  function onUpdate() {
    attackerTransform.position
      .copy(attackerSeat.position)
      .lerp(defenderSeat.position, progress.amt)
    attackerTransform.position.y += 0.01 * progress.amt
  }

  const isHeroAbilityEmpoweredAttack =
    context.topPhase &&
    context.topPhase.type === 'ResolveCardEffect' &&
    cardCache.getEntity(context.topPhase.payload.id)?.has('heroAbility')
  if (isHeroAbilityEmpoweredAttack) {
    await buildHeroAbilityAttackMSA(
      context,
      attacker,
      attackerSeat,
      defenderSeat
    )
  } else {
    // regular attack animation
    const anim = simpleTweener.to({
      description: 'combat attack',
      target: progress,
      propertyGoals: { amt: 1 },
      easing: Easing.Back.In,
      duration: 400,
      onUpdate
    })
    attacker.add(new IsAnimatingComponent('attack start', anim, 1))

    await anim.finished

    const anim2 = simpleTweener.to({
      description: 'combat return',
      target: progress,
      propertyGoals: { amt: 0 },
      easing: Easing.Quartic.Out,
      duration: 300,
      onUpdate
    })
    attacker.add(new IsAnimatingComponent('attack end', anim2, 1))
  }
  timeWarp.add(0.1)
  if (attackerCard.state.view.power >= 6) {
    cameraShaker.add(0.04)
  } else if (attackerCard.state.view.power !== 0) {
    cameraShaker.add(0.015)
  }
}

export function onEndAttack(
  cardCache: CardCacheWithEntities,
  context: ActionStack,
  logger: TabbedLogger | undefined,
  payload: ResolvedPhaseAttack
) {
  const attacker = cardCache.getEntity(payload.attacker)?.get('cardInstance')
  const defender = cardCache.getEntity(payload.defender)?.get('cardInstance')

  if (logger) {
    logger.logStory(
      `${getCardInstanceName(
        typeof attacker === 'number' ? undefined : attacker
      )} attacked ${getCardInstanceName(
        typeof defender === 'number' ? undefined : defender
      )}`
    )
  }
}
