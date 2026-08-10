import { removeFromArray } from '@opensky/shared/utils/arrayUtils'
import { Trait } from '@skyweaver/state-metadata'

import { createCardFrontInteractives } from '~/assemblages/CardAssemblage'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import { globalAccess } from '~/utils/globalAccess'
import { updateInteractivesForCard } from '~/utils/helpers/InteractivesHelpers'
import { makeQuickButtonColumn, QuickButtonData } from '~/utils/quickButton'

import { cardCarousel } from './cardCarousel'

async function cardViewerTraits() {
  const cards = await cardCarousel()

  const uiContainer = globalAccess.ui?.getContainer('randomTests')
  if (uiContainer) {
    await uiContainer.ready
    function updateVisibleCards() {
      for (const ce of cards.cardsEntities) {
        updateInteractivesForCard(ce, createCardFrontInteractives)
      }
    }

    const traits: Trait[] = [
      'stealth',
      'wither',
      'guard',
      'banner',
      'lifesteal',
      'armor'
    ]
    const unitOnly: Trait[] = ['stealth', 'guard']
    makeQuickButtonColumn(
      uiContainer,
      [
        new QuickButtonData('+ Traits', () => {
          // way to test potential layout issues by overloading cards with traits.
          for (const cardView of cards.cardViews) {
            const ci = cardView.state.view
            for (const trait of traits) {
              if (ci.type !== 'unit' && unitOnly.includes(trait)) {
                continue
              }
              if (!ci.traits.includes(trait)) {
                ci.traits.push(trait)
                break
              }
            }
          }
          updateVisibleCards()
        }),
        new QuickButtonData('- Traits', () => {
          // way to test potential layout issues by overloading cards with traits
          for (const cardView of cards.cardViews) {
            const ci = cardView.state.view
            for (const trait of traits) {
              if (ci.traits.includes(trait)) {
                removeFromArray(ci.traits, trait)
                break
              }
            }
          }
          updateVisibleCards()
        })
      ],
      ReadonlyPin.BottomRight,
      ReadonlyPin.BottomRight
    )
    uiContainer.show()
  }
}

export const test = cardViewerTraits
