import { BaseCard } from '@skyweaver/state-metadata'
import clsx from 'clsx'
import { memo } from 'react'

import { useDeckStats } from '~/shared/hooks/decks/useDeckStats'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ImageIcon } from '../../ImageIcon/ImageIcon'
import { ImageIconTypes } from '../../ImageIcon/ImageIconConfig'
import { Text } from '../../Text'
import {
  BreakdownCount,
  BreakdownGradient,
  DeckCardsListBreakdownStyle
} from './DeckCardsListBreakdown.css'

interface BreakdownProps {
  count: number
  icon: ImageIconTypes
  hasBorderLeft?: boolean
}

const Breakdown = memo(({ count, icon, hasBorderLeft }: BreakdownProps) => (
  <div
    className={clsx(
      Sprinkles({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: 'full',
        justifyContent: 'space-between'
      }),
      BreakdownCount,
      { isZero: count === 0, hasBorderLeft }
    )}
  >
    <ImageIcon type={icon} height="14px" />
    <Text color="purple8" fontSize="12px">
      {count}
    </Text>
  </div>
))

Breakdown.displayName = 'Breakdown'

interface DeckCardsListBreakdownProps {
  cardIds: BaseCard[]
}

export const DeckCardsListBreakdown = memo(
  ({ cardIds }: DeckCardsListBreakdownProps) => {
    const {
      numWater,
      numAir,
      numEarth,
      numFire,
      numDark,
      numLight,
      numMetal,
      numMind,
      numUnits,
      numSpells
    } = useDeckStats(cardIds)

    return (
      <>
        <div
          className={clsx(
            Sprinkles({
              position: 'relative',
              width: 'full',
              paddingBottom: '20px',
              borderBottom: '1px solid',
              borderRight: '1px solid',
              borderColor: 'purple6'
            }),
            DeckCardsListBreakdownStyle
          )}
        >
          <Breakdown count={numWater} icon="element-water" />
          <Breakdown count={numAir} icon="element-air" />
          <Breakdown count={numEarth} icon="element-earth" />
          <Breakdown count={numFire} icon="element-fire" />
          <Breakdown count={numDark} icon="element-dark" />
          <Breakdown count={numLight} icon="element-light" />
          <Breakdown count={numMetal} icon="element-metal" />
          <Breakdown count={numMind} icon="element-mind" />
          <Breakdown count={numUnits} icon="unit" hasBorderLeft />
          <Breakdown count={numSpells} icon="spell" />
        </div>
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              pointerEvents: 'none',
              borderRight: '1px solid',
              borderColor: 'purple6'
            }),
            BreakdownGradient
          )}
        />
      </>
    )
  }
)

DeckCardsListBreakdown.displayName = 'DeckCardsListBreakdown'
