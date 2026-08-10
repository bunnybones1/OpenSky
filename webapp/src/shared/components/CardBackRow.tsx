import { CardBack } from '@opensky/shared/constants'
import clsx from 'clsx'
import { forwardRef, memo, useCallback, useMemo } from 'react'

import { ImageIcon } from '~/shared/components/ImageIcon/ImageIcon'
import { AllCardBacks } from '~/shared/constants/card-backs'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { useGetAssetContext } from '../hooks/useGetAssetContext'
import {
  CardBackIcon,
  CardBackImg,
  NameWrapper,
  RowBorder,
  RowOverlay,
  RowWrapper
} from './CardBackRow.css'
import { Text } from './Text'

interface CardBackRowProps {
  id: number
  isLocked?: boolean
  className?: Parameters<typeof clsx>[0]
  onClick?: (card: CardBack) => void
}

const NameFontSizes = {
  tablet: '16px',
  tabletWide: '16px',
  desktop: '18px'
} as const

const IconHeight = { base: '24px', tablet: '32px' } as const

const _CardBackRow = forwardRef<HTMLDivElement, CardBackRowProps>(
  ({ id, isLocked, className, onClick }, ref) => {
    const cardBack = useMemo(() => AllCardBacks.get(id), [id])
    const { getAssetUrl } = useGetAssetContext()
    const _onClick = useCallback(() => {
      if (cardBack && onClick) onClick(cardBack)
    }, [cardBack, onClick])

    if (!cardBack) return null

    return (
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            cursor: !!onClick ? 'pointer' : undefined
          }),
          RowWrapper,
          className,
          {
            isLocked
          }
        )}
        ref={ref}
        onClick={_onClick}
      >
        <div
          className={clsx(
            CardBackIcon,
            Sprinkles({
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            })
          )}
        >
          <ImageIcon type="card-back-solid" height={IconHeight} />
        </div>
        {/* Name */}
        <div
          className={clsx(
            Sprinkles({
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start'
            }),
            NameWrapper
          )}
        >
          <Text
            color="white"
            fontSize={NameFontSizes}
            fontWeight="400"
            fontFamily="condensed"
          >
            {cardBack.name}
          </Text>
        </div>
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
            RowBorder,
            { hoverBorder: !!onClick }
          )}
        >
          {!isLocked && <div className={RowOverlay} />}
          {!!getAssetUrl && (
            <img
              className={clsx(
                Sprinkles({
                  position: 'absolute',
                  top: 0,
                  zIndex: 5
                }),
                CardBackImg
              )}
              src={getAssetUrl(`webapp/card-backs/2x/${cardBack.artID}.webp`)}
            />
          )}
        </div>
      </div>
    )
  }
)

_CardBackRow.displayName = 'CardBackRowWithRef'

export const CardBackRow = memo(_CardBackRow)

CardBackRow.displayName = 'CardBackRow'
