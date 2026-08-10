import clsx from 'clsx'
import { forwardRef, memo, useCallback, useMemo } from 'react'

import { SoundClient } from '~/shared/clients'
import { ImageIcon } from '~/shared/components/ImageIcon/ImageIcon'
import { Text } from '~/shared/components/Text'
import { Cards, CardType } from '~/shared/constants/cards'
import { useCardTexts } from '~/shared/hooks/cards/useCardTexts'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { Icon } from '../Icon/Icon'
import { RowArt } from '../RowArt/RowArt'
import {
  CardElementWrapper,
  CardNameWrapper,
  CardRowBorder,
  CardRowBorderColor,
  CardRowGradeOverlay,
  CardRowGradeOverlayBg,
  CardRowTypeIcon,
  CardRowWrapper
} from './CardRow.css'
import { CardRowManaOrGradeIcon } from './components/CardRowManaOrGradeIcon'

interface CardRowProps {
  id: number
  isLocked?: boolean
  className?: Parameters<typeof clsx>[0]
  prioritizeGrade?: boolean
  onClick?: (card: CardType) => void
}

const NameFontSizes = {
  tablet: '16px',
  tabletWide: '16px',
  desktop: '18px'
} as const

const _CardRow = forwardRef<HTMLDivElement, CardRowProps>(
  ({ id, isLocked, className, prioritizeGrade, onClick }, ref) => {
    const card = useMemo(() => Cards.get(id), [id])

    const cardTexts = useCardTexts(card?.baseId)

    const _onClick = useCallback(() => {
      if (card && onClick) onClick(card)
    }, [card, onClick])

    if (!card) return null

    return (
      <div
        onMouseEnter={() =>
          setTimeout(() => SoundClient.playSound('CursorHoverSlip'), 300)
        }
        className={clsx(
          Sprinkles({
            width: 'full',
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            cursor: !!onClick ? 'pointer' : undefined
          }),
          CardRowWrapper,
          className,
          {
            isLocked
          }
        )}
        data-card-id={id}
        data-card-base-id={card.baseId}
        ref={ref}
        onClick={_onClick}
      >
        {/* Mana Icon */}
        <CardRowManaOrGradeIcon
          prioritizeGrade={!!prioritizeGrade}
          cost={card.cost}
          grade={card.grade}
        />
        {/* Name */}
        <div
          className={clsx(
            Sprinkles({
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start'
            }),
            CardNameWrapper
          )}
        >
          <Text
            color="white"
            fontSize={NameFontSizes}
            fontWeight="400"
            fontFamily="condensed"
          >
            {cardTexts?.name || 'Name'}
          </Text>
        </div>
        <div className={clsx(CardRowTypeIcon)}>
          {isLocked ? (
            <Icon height="16px" type="lock" color="purple9" />
          ) : (
            <ImageIcon type={card.type === 'unit' ? 'unit' : 'spell'} height="20px" />
          )}
        </div>
        {/* Element Icon */}
        {card.element !== 'sky' && (
          <div
            className={clsx(Sprinkles({ position: 'absolute' }), CardElementWrapper)}
          >
            <ImageIcon type={`element-${card.element}`} height="20px" />
          </div>
        )}
        {/* Border & Overlay */}
        <div
          className={clsx(
            Sprinkles({
              border: '1px solid',
              marginLeft: { base: '12px', mobile: '12px', tablet: '16px' },
              height: 'full',
              alignItems: 'center',
              justifyContent: 'flex-start',
              backgroundColor: 'purple1',
              overflow: 'hidden',
              position: 'relative'
            }),
            CardRowBorder,
            { hoverBorder: !!onClick },
            CardRowBorderColor[isLocked ? 'locked' : card.grade]
          )}
        >
          {!isLocked && (
            <div
              className={clsx(
                Sprinkles({ width: 'full', height: 'full' }),
                CardRowGradeOverlay,
                CardRowGradeOverlayBg[card.grade]
              )}
            />
          )}
          <RowArt
            url={`webapp/cards/art-rows/${card.type.toLowerCase()}s/2x/${
              card.artSlug
            }@2x.webp`}
          />
        </div>
      </div>
    )
  }
)

_CardRow.displayName = 'CardRowWithRef'

export const CardRow = memo(_CardRow)

CardRow.displayName = 'CardRow'
