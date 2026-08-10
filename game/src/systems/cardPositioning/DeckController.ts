import { Entity } from 'gg'

import { Components } from '~/components'
import CardInstanceComponent from '~/components/CardInstanceComponent'
import InspectableComponent from '~/components/InspectableComponent'
import { ReadonlyTrackableCollection } from '~/utils/TrackableCollection'

import { moveSeat } from '../animation/zoneSeatUtils'
import { sortEntitiesByReverseOrder } from './ecsUtils'
import ZoneSeatController from './ZoneSeatController'

export default class DeckController {
  private set interactive(val: boolean) {
    if (!this.entity.has('selectable')) {
      return
    }
    if (val !== this._interactive && this.entity) {
      if (val) {
        this.entity.add(new InspectableComponent())
      } else {
        this.entity.remove('inspectable')
      }
      this.entity.get('interactiveIndicators').playableState.value = val
      this._interactive = val
    }
  }

  private _interactive = false

  constructor(
    cardsInZone: ReadonlyTrackableCollection<Entity<Components>>,
    seatController: ZoneSeatController,
    public entity: Entity<Components>
  ) {
    const onCardsChange = (cards: Array<Entity<Components>>) => {
      cards.sort(sortEntitiesByReverseOrder)

      const currentHoverCard =
        entity.has('cardInstance') && entity.get('cardInstance')

      const topDeckZoneCard =
        cards.length &&
        cards[0].has('cardInstance') &&
        cards[0].get('cardInstance')

      // If our hover state has a card that isn't the new top card, remove it.
      if (currentHoverCard && currentHoverCard !== topDeckZoneCard) {
        entity.remove('cardInstance')
        entity.remove('hostingAttachment')
      }

      // If the top card isn't the same as our current hover card, add it.
      if (topDeckZoneCard && topDeckZoneCard !== currentHoverCard) {
        entity.add(new CardInstanceComponent(topDeckZoneCard))
        if (cards[0].has('hostingAttachment')) {
          entity.add(cards[0].getComponent('hostingAttachment')!)
        }
      }
    }
    cardsInZone.listenForChange(onCardsChange)

    const onCardAdd = () => {
      this.interactive = cardsInZone.length > 0
    }

    // first ones for free, if there's already something in the collection
    onCardsChange(cardsInZone.items)
    onCardAdd()

    cardsInZone.listenForAdd(onCardAdd)
    cardsInZone.listenForRemove(entity => {
      //for deck, although random, this hack makes cards appear to always come from the top
      if (!this.entity.get('deck').reverseOrder) {
        const seats = seatController.seats
        let j = 0
        const seat = seats.find(s => s.entity === entity)
        for (const seat of seats) {
          if (seat.entity.has('transform')) {
            moveSeat(seat, seatController.makeIndexTransform(seat, j))
            if (seat.entity !== entity) {
              j++
            }
          }
        }
        if (seat && seat.entity.has('transform')) {
          moveSeat(
            seat,
            seatController.makeIndexTransform(seat, seats.length - 1)
          )
        }
      }
    })

    this.interactive = cardsInZone.length > 0
  }
}
