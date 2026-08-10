import {
  BaseCard,
  CardLibrary,
  PlayerAction,
  ResolvedPhaseDamage
} from '@skyweaver/state-metadata'
import { Entity } from 'gg'

import { CardCacheWithEntities, getCardCache } from '~/cardCache'
import { Components } from '~/components'
import DamageIndicatorComponent from '~/components/DamageIndicatorComponent'
import DeckPreviewOptInComponent from '~/components/DeckPreviewOptInComponent'
import DiscountIndicatorComponent from '~/components/DiscountIndicatorComponent'
import EnchantmentBounceComponent from '~/components/EnchantmentBounceComponent'
import PreviewIconComponent from '~/components/PreviewIconComponent'
import { ZoneData } from '~/components/ZoneComponent'
import { getDeck } from '~/factories/DeckFactory'
import { playSound } from '~/helpers/soundHelpers'
import { IconIndicatorName } from '~/meshes/IconIndicator'
import queryParams from '~/queryParams'
import { store } from '~/state'
import { MessageSimulation } from '~/state/StateSharedTypes'
import { matchInfoStore } from '~/state/stores/MatchInfoStore'
import { NO_STATE_FOR_SIMULATE_ERROR } from '~/state/WorkerProxyStore'

import { enchantIdsByName } from './enchantmentHelpers'

type E = Entity<Components>

type CurrentPreview = {
  hoverer?: E
  hoveree?: E
  preview?: Preview
}
const currentPreview: CurrentPreview = {}

export function getCurrentPreview(): Readonly<CurrentPreview> {
  return currentPreview
}

export function setCurrentPreview(hoverer?: E, hoveree?: E) {
  if (
    hoverer !== currentPreview.hoverer ||
    hoveree !== currentPreview.hoveree
  ) {
    clearCurrentPreview()

    currentPreview.hoverer = hoverer
    currentPreview.hoveree = hoveree

    if (currentPreview.hoverer && currentPreview.hoveree) {
      if (!currentPreview.hoveree.has('targetable')) {
        return
      }
      playSound('audioFxCommon', 'TargetHover')

      const key = `${currentPreview.hoverer.id} -> ${currentPreview.hoveree.id}`

      if (previews.has(key)) {
        const preview = previews.get(key)

        if (preview && !(preview instanceof Promise)) {
          matchInfoStore.playerInfo.manaPreview = preview.mana[store.player!]
          matchInfoStore.opponentInfo.manaPreview =
            preview.mana[1 - store.player!]

          for (const entityPreview of preview.entities) {
            for (const component of entityPreview.components) {
              entityPreview.entity.add(component)
            }
          }

          currentPreview.preview = preview
        }
        return
      }
      const isAttack = currentPreview.hoverer.has('character')
      const attacker = currentPreview.hoverer.has('card')
        ? currentPreview.hoverer
        : undefined
      const defender = currentPreview.hoveree.has('card')
        ? currentPreview.hoveree
        : undefined

      let action: PlayerAction | undefined

      if (isAttack) {
        if (attacker && defender) {
          action = {
            type: 'Attack',
            attackerID: attacker.get('cardInstance').id,
            defenderID: defender.get('cardInstance').id
          }
        }
      } else if (attacker) {
        action = {
          type: 'PlayCard',
          cardID: attacker.get('cardInstance').id,
          targetID: defender?.get('cardInstance').id
        }
      }

      if (!action) {
        return
      }

      const thisPreviewHoverer = currentPreview.hoverer
      previews.set(
        key,
        store
          .simulate(action, store.player)
          .then(simulation => {
            const preview = generatePreviewFromSimulation(
              thisPreviewHoverer,
              simulation
            )
            previews.set(key, preview)

            if (
              currentPreview.hoverer !== hoverer ||
              currentPreview.hoveree !== hoveree
            ) {
              return
            }

            clearCurrentPreview()

            matchInfoStore.playerInfo.manaPreview = preview.mana[store.player!]
            matchInfoStore.opponentInfo.manaPreview =
              preview.mana[1 - store.player!]

            for (const entityPreview of preview.entities) {
              for (const component of entityPreview.components) {
                entityPreview.entity.add(component)
              }
            }

            currentPreview.preview = preview
          })
          .catch((err: unknown) => {
            // silently ignore preview errors for invalid player actions
            const isPreviewError =
              err === NO_STATE_FOR_SIMULATE_ERROR ||
              (err &&
                typeof err === 'object' &&
                (err as any).type === 'Error' &&
                (err as any).level === 'user' &&
                (err as any).error?.message?.type === 'Simulate')
            if (!isPreviewError) {
              if (
                currentPreview.hoverer !== hoverer ||
                currentPreview.hoveree !== hoveree
              ) {
                return
              }

              clearCurrentPreview()

              console.error('Failed to show preview: ', err)
            }
          })
      )
    }
  }
}

function generatePreviewFromSimulation(
  hoverer: E,
  { baseState, baseSecret, log }: MessageSimulation
) {
  const beforeCache = new CardCacheWithEntities(baseSecret.player, [
    baseState,
    baseSecret
  ])
  const afterCache = new CardCacheWithEntities(beforeCache)
  const mana: [[number, number], [number, number]] = [
    [0, 0],
    [0, 0]
  ]

  const healthModifierAppliedCards = new Set<E>()
  const statChangeCards = new Set<E>()
  const costChangeCards = new Set<E>()
  const damagedCards = new Map<E, Array<ResolvedPhaseDamage>>()
  const attackingCards = new Set<E>()
  const defendingCards = new Set<E>()
  const targetedCards = new Set<E>()
  const deadCards = new Set<E>()
  const discardedCards = new Set<E>()
  const dustedCards = new Set<E>()
  const mulliganedCards = new Set<E>()
  const revealedCards = new Set<E>()
  const returnedToHandCards = new Set<E>()
  const sentToDeckCards = new Set<E>()
  const summonedCards = new Set<E>()
  const didEnterDrawPhase: [boolean, boolean] = [false, false]

  // We should only show the skull if a card would go field -> graveyard,
  // so track if a card *ever* went field -> graveyard.
  // This is a helper to decide if things should stay in deadCards,
  // not actually used as a preview collection.
  const diedOnFieldCards = new Set<E>()

  // If this preview is for a card we're not allowed to play,
  // and we ran it for some reason, bail. The client will never submit this.
  const isPreviewInvalid = log.events.some(
    event =>
      event.type === 'GameEvent' &&
      event.payload.event.type === 'EnterPhase' &&
      event.payload.event.payload.type === 'ModifyCard' &&
      event.payload.event.payload.payload.modifier ===
        'CheatedByPlayingIllegalHandCard'
  )
  if (!isPreviewInvalid) {
    for (const event of log.events) {
      if (
        !queryParams.previewTriggers &&
        event.type === 'GameEvent' &&
        event.payload.event.type === 'FinishCardResolution'
      ) {
        break
      }

      if (event.type === 'ModifyCard') {
        const newInstance = event.payload.instance
        const beforeInstance = afterCache.getInstance(newInstance)
        const entity = afterCache.getEntity(newInstance)
        if (entity && beforeInstance) {
          const beforeView = beforeInstance.state.view
          const newView = newInstance.state.view
          if (beforeView.cost !== newView.cost) {
            costChangeCards.add(entity)
          }
          if (
            beforeView.health !== newView.health ||
            beforeView.power !== newView.power
          ) {
            statChangeCards.add(entity)
          }
          if (newView.markedForDeath !== undefined) {
            const location = afterCache.getLocation(newInstance)
            if (location && location.location[0].name === 'Field') {
              deadCards.add(entity)
            }
          }
        }
      }

      afterCache.processEvent(event)

      switch (event.type) {
        case 'MoveCard': {
          const { from, to } = event.payload
          const entity = afterCache.getEntity(to)
          if (entity) {
            const fromZone = from.location?.[0]
            const fromZoneName = fromZone?.name
            const toZone = to.location[0]

            // "Revealed" preview (eye icon)
            if (fromZone?.name === 'Hand') {
              if (toZone.name === 'Hand') {
                // If sent from private hand -> public hand,
                // set the reveal preview.
                if (!fromZone?.public && toZone.public) {
                  revealedCards.add(entity)
                }
              } else if (getCardCache().isZonePublic(toZone)) {
                // If sent from hand -> another public zone,
                // clear the reveal preview, since reveal is implied.
                revealedCards.delete(entity)
              }
            }

            // Returning to hand as the final zone change
            if (
              (fromZoneName === 'Field' || fromZoneName === 'Graveyard') &&
              toZone.name === 'Hand'
            ) {
              returnedToHandCards.add(entity)
            } else {
              returnedToHandCards.delete(entity)
            }

            // Returning to deck as the final zone change
            if (toZone.name === 'Deck') {
              sentToDeckCards.add(entity)
            } else {
              sentToDeckCards.delete(entity)
            }

            if (toZone.name === 'Graveyard') {
              if (fromZoneName === 'Field') {
                diedOnFieldCards.add(entity)
                deadCards.add(entity)
              } else {
                discardedCards.add(entity)
                // if a card is discarded, even if it's not reset, wipe any stat change events.
                statChangeCards.delete(entity)
                costChangeCards.delete(entity)
              }
            }

            // If a card is marked dead, but goes to a zone other than graveyard *first*,
            // it didn't ever actually die.
            if (fromZoneName !== 'Graveyard' && !diedOnFieldCards.has(entity)) {
              deadCards.delete(entity)
            }

            // Discard only cares about where the card will end up.
            if (fromZoneName === 'Graveyard') {
              discardedCards.delete(entity)
            }

            // Going to dust (always the final zone change)
            if (toZone.name === 'Dust') {
              dustedCards.add(entity)

              // if from zone is graveyard, initiate count
            }

            // Going to the field at any point,
            // not only as the final zone change.
            if (toZone.name === 'Field' && fromZone?.name !== 'Field') {
              summonedCards.add(entity)
              // Don't show costs resetting for a unit being played.
              costChangeCards.delete(entity)
            }

            // Any zone change clears damage.
            damagedCards.delete(entity)
          }
          break
        }

        case 'GameEvent': {
          const action = event.payload.event
          switch (action.type) {
            case 'EnterPhase': {
              switch (action.payload.type) {
                case 'Draw': {
                  didEnterDrawPhase[action.payload.payload.from[0]] = true
                  break
                }
                case 'Mulligan':
                  for (const card of action.payload.payload.toMulligan) {
                    const entity = afterCache.getEntity(card)
                    if (entity) {
                      mulliganedCards.add(entity)
                    }
                  }
                  break
                case 'ChangeMana':
                  mana[action.payload.payload.player][0] +=
                    action.payload.payload.delta
                  break
                case 'ChangeMaxMana':
                  mana[action.payload.payload.player][1] +=
                    action.payload.payload.delta
                  break
              }
              break
            }
            case 'ExitPhase': {
              switch (action.payload.type) {
                case 'Damage': {
                  const entity = afterCache.getEntity(
                    action.payload.payload.target
                  )
                  if (entity) {
                    if (!damagedCards.has(entity)) {
                      damagedCards.set(entity, [])
                    }
                    damagedCards.get(entity)!.push(action.payload.payload)
                  }
                  break
                }
                case 'Attack': {
                  const attacker = afterCache.getEntity(
                    action.payload.payload.attacker
                  )
                  const defender = afterCache.getEntity(
                    action.payload.payload.defender
                  )
                  if (attacker) {
                    attackingCards.add(attacker)
                  }
                  if (defender) {
                    defendingCards.add(defender)
                  }
                  break
                }
                case 'ResolveCardEffect': {
                  const target = action.payload.payload.targetId
                    ? afterCache.getEntity(action.payload.payload.targetId)
                    : undefined
                  if (target) {
                    targetedCards.add(target)
                  }
                  break
                }
                case 'ResetCard': {
                  const entity = afterCache.getEntity(action.payload.payload)
                  if (entity) {
                    statChangeCards.delete(entity)
                    costChangeCards.delete(entity)
                  }
                  break
                }
                case 'ModifyCard': {
                  const entity = afterCache.getEntity(
                    action.payload.payload.card
                  )
                  const mod = action.payload.payload.modifier
                  if (
                    entity &&
                    typeof mod !== 'string' &&
                    'ModifyHealth' in mod
                  ) {
                    healthModifierAppliedCards.add(entity)
                  }
                }
              }
              break
            }
          }
          break
        }
      }
    }
  }

  const allPreviewedEntities = new Set([
    ...statChangeCards,
    ...costChangeCards,
    ...damagedCards.keys(),
    ...attackingCards,
    ...defendingCards,
    ...targetedCards,
    ...deadCards,
    ...dustedCards,
    ...discardedCards,
    ...mulliganedCards,
    ...revealedCards,
    ...returnedToHandCards,
    ...sentToDeckCards,
    ...summonedCards,
    ...healthModifierAppliedCards
  ])

  const allPreviews: Array<{
    entity: E
    components: Component[]
  }> = []

  for (const cardEntity of allPreviewedEntities) {
    const originalCard = beforeCache.getInstance(cardEntity)
    const newCard = afterCache.getInstance(cardEntity)

    const cardZone = cardEntity.get('zone')
    const components = []

    let deckPreviewOptIn: DeckPreviewOptInComponent | undefined
    const attemptDeckPreviewOptIn = (iconName: IconIndicatorName) => {
      if (!deckPreviewOptIn) {
        deckPreviewOptIn = new DeckPreviewOptInComponent(iconName)
        components.push(deckPreviewOptIn)
      } else {
        deckPreviewOptIn.value.add(iconName)
      }
    }
    // if (isZoneADeck(cardZone)) {
    //   attemptDeckPreviewOptIn('buff-arrow-encircled-flipped-up')
    // }

    if (deadCards.has(cardEntity)) {
      if (cardZone.stateZone === 'Graveyard' || cardZone.stateZone === 'Deck') {
        throw new Error('TODO: implement deck death previews')
      }

      components.push(
        new DamageIndicatorComponent({
          death: true
        })
      )
    } else if (
      statChangeCards.has(cardEntity) ||
      damagedCards.has(cardEntity) ||
      healthModifierAppliedCards.has(cardEntity)
    ) {
      if (originalCard && newCard) {
        const healthChange =
          newCard.state.view.health - originalCard.state.view.health
        const powerChange =
          newCard.state.view.power - originalCard.state.view.power
        if (isZoneADeck(cardZone)) {
          if (healthChange > 0 || powerChange > 0) {
            attemptDeckPreviewOptIn('buff-arrow-encircled-flipped-up')
          }
          if (healthChange < 0 || powerChange < 0) {
            attemptDeckPreviewOptIn('buff-arrow-encircled')
          }
        } else {
          components.push(
            new DamageIndicatorComponent({
              damage:
                healthChange !== 0 ||
                damagedCards.has(cardEntity) ||
                healthModifierAppliedCards.has(cardEntity)
                  ? -healthChange
                  : undefined,
              wither: powerChange !== 0 ? -powerChange : undefined,
              death: false
            })
          )
        }
      }
    }
    const enchantmentsToBounce: Set<BaseCard> = new Set()
    const damageEvents = damagedCards.get(cardEntity) ?? []
    for (const damage of damageEvents) {
      if (damage.amount <= 0) {
        continue
      }
      if (damage.kind.type === 'Combat') {
        enchantmentsToBounce.add(enchantIdsByName.Shield)
      } else if (damage.kind.type === 'CardEffect') {
        enchantmentsToBounce.add(enchantIdsByName.Barrier)
      }
    }
    if (enchantmentsToBounce.size) {
      components.push(new EnchantmentBounceComponent([...enchantmentsToBounce]))
    }
    if (costChangeCards.has(cardEntity)) {
      if (
        originalCard &&
        newCard &&
        CardLibrary.get(originalCard.base)?.cost !== 'X' &&
        !summonedCards.has(cardEntity)
      ) {
        components.push(
          new DiscountIndicatorComponent({
            discount: +originalCard.state.view.cost - newCard.state.view.cost
          })
        )
      }
    }

    if (dustedCards.has(cardEntity)) {
      if (isZoneADeck(cardZone)) {
        attemptDeckPreviewOptIn('dust')
      } else if (!isAttachedToACardInADeck(cardEntity)) {
        components.push(new PreviewIconComponent('dust'))
      }
    } else if (mulliganedCards.has(cardEntity)) {
      components.push(new PreviewIconComponent('Mulligan'))
    } else if (returnedToHandCards.has(cardEntity)) {
      if (isZoneADeck(cardZone)) {
        attemptDeckPreviewOptIn('ReturnToHand')
      } else {
        components.push(new PreviewIconComponent('ReturnToHand'))
      }
    } else if (sentToDeckCards.has(cardEntity)) {
      components.push(new PreviewIconComponent('SendToDeck'))
      const damageIndicator = components.find(
        c => c instanceof DamageIndicatorComponent
      ) as DamageIndicatorComponent | undefined
      if (damageIndicator && !damageIndicator.value.death) {
        components.splice(components.indexOf(damageIndicator), 1)
      }
    } else if (revealedCards.has(cardEntity)) {
      components.push(new PreviewIconComponent('eye'))
    } else if (
      summonedCards.has(cardEntity) &&
      currentPreview.hoverer !== cardEntity
    ) {
      if (isZoneADeck(cardZone)) {
        attemptDeckPreviewOptIn('Summon')
      } else {
        components.push(new PreviewIconComponent('Summon'))
      }
    } else if (discardedCards.has(cardEntity) && cardEntity !== hoverer) {
      components.push(new PreviewIconComponent('SendToGraveyard'))
    }

    if (components.length > 0) {
      allPreviews.push({ entity: cardEntity, components })
    }
  }

  for (const [player, didDraw] of didEnterDrawPhase.map(
    (v, i) => [i, v] as const
  )) {
    if (!didDraw) {
      continue
    }
    const entity = getDeck(
      'Deck',
      player === store.player ? 'Player' : 'Opponent'
    ).entity

    allPreviews.push({
      entity,
      components: [new PreviewIconComponent('Draw')]
    })
  }

  return { mana, entities: allPreviews }
}

function isZoneADeck(cardZone: ZoneData) {
  return cardZone.stateZone === 'Deck' || cardZone.stateZone === 'Graveyard'
}

function isAttachedToACardInADeck(cardEntity: E) {
  if (cardEntity.has('attachedTo')) {
    const parentZone = cardEntity.get('attachedTo').entity.get('zone').stateZone
    return parentZone === 'Graveyard' || parentZone === 'Deck'
  }
  return false
}

function clearCurrentPreview() {
  if (currentPreview.preview) {
    for (const entityPreview of currentPreview.preview.entities) {
      for (const component of entityPreview.components) {
        entityPreview.entity.remove(component.type as keyof Components)
      }
    }
    matchInfoStore.playerInfo.manaPreview = [0, 0]
    matchInfoStore.opponentInfo.manaPreview = [0, 0]
  }

  delete currentPreview.hoverer
  delete currentPreview.hoveree
  delete currentPreview.preview
}

export function clearAllPreviews() {
  clearCurrentPreview()
  previews.clear()
}

const previews = new Map<string, Preview | Promise<void>>()

interface Preview {
  mana: [[number, number], [number, number]]
  entities: EntityPreview[]
}

interface EntityPreview {
  entity: E
  components: Component[]
}
type Component = Components[keyof Components]
