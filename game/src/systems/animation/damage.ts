import { i18n } from '@opensky/language-manager'
import { Entity } from 'gg'

import { Components } from '~/components'
import { createDamage } from '~/factories/DamageFactory'
import { getDeck } from '~/factories/DeckFactory'
import { removeWorldEntity } from '~/helpers/worldHelpers'
import { getYadaYadaDuration } from '~/helpers/yadaYadaDurationHelper'
import { ownedZoneCollections } from '~/helpers/zoneCollections'
import { showPlayerActionError } from '~/scenes/ui/containers/playerActionError'
import { animationDelay } from '~/utils/asyncUtils'
import { globalAccess } from '~/utils/globalAccess'
import { findObject3DByName, removeFromParent } from '~/utils/threeUtils'

import TextMesh from '../text/TextMesh'
import { Easing } from './Easing'
import { simpleTweener } from './tweeners'

export async function createDamageAnimation(
  parentEntity: Entity<Components>, //damage receiver
  damageDealt: number,
  isFatigue: boolean = false,
  damageMeshDisabled?: boolean
) {
  const damageEntity = createDamage(
    damageDealt,
    parentEntity.id,
    isFatigue,
    damageMeshDisabled
  )
  // const p = justInFrontOfElement(parentEntity, 0.02)
  // getBeamLauncher('damageHit', scene).launch(p, p)

  const entityId = damageEntity.id
  if (isFatigue) {
    const deck = getDeck(
      'Deck',
      parentEntity.has('player') ? 'Player' : 'Opponent'
    ).entity
    if (deck.has('interactiveIndicators')) {
      deck.get('interactiveIndicators').holdingState.pulse()
    }
  }
  const transform = damageEntity.get('transform')
  const textMesh = findObject3DByName(transform, 'damageText') as TextMesh

  textMesh.opacity = 0

  simpleTweener.to({
    description: 'show damage',
    target: textMesh,
    propertyGoals: { opacity: 1 },
    duration: 200,
    easing: Easing.Cubic.Out
  })

  simpleTweener.to({
    description: 'slide damage',
    target: textMesh.position,
    propertyGoals: {
      y: textMesh.position.y + 0.1
    },
    duration: 2000
  })

  animationDelay(500).then(() => {
    try {
      const spriteAnim = findObject3DByName(transform, 'spriteAnim')
      removeFromParent(spriteAnim)
    } catch (e) {
      console.warn(e)
    }
    simpleTweener.to({
      description: 'fade damage text',
      target: textMesh,
      propertyGoals: { opacity: 0 },
      duration: 500,
      easing: Easing.Cubic.Out,
      onComplete: () => {
        removeWorldEntity(entityId)
      }
    })
  })

  await animationDelay(400 * getYadaYadaDuration('damage'))
}

export async function createFatigueAnimation(
  damagedEntity: Entity<Components>,
  amount: number
) {
  if (!damagedEntity) {
    console.error(`Hero for player doesn't exist!`)
    return
  }

  if (!damagedEntity.has('transform')) {
    console.error(`Hit entity does not contain TransformComponent!`)
    return
  }

  const deckName = damagedEntity.has('player') ? 'Player_Deck' : 'Opponent_Deck'

  const deckCountBeforeDraw = ownedZoneCollections[deckName].length

  const message =
    deckCountBeforeDraw > 0
      ? i18n.t('ui.prompt.noCardsOfThatTypeLeftLose1HealthAndConjureInstead')
      : i18n.t('ui.prompt.noCardsLeftLose1HealthAndConjureInstead')

  globalAccess.ui && showPlayerActionError(globalAccess.ui, { msg: message })

  await Promise.all([createDamageAnimation(damagedEntity, amount, true)])
}
