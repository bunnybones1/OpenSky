import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { SoundClient } from '~/shared/clients'
import { Text } from '~/shared/components/Text'
import { Cards } from '~/shared/constants/cards'
import { useCardTexts } from '~/shared/hooks/cards/useCardTexts'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { RowArt } from '../RowArt/RowArt'
import {
  AbilityRowBorder,
  AbilityRowGradeOverlay,
  AbilityRowImage,
  AbilityRowWrapper,
  CardNameWrapper,
  ManaIconImage,
  ManaIconText,
  ManaIconWrapper
} from './AbilityRow.css'

interface AbilityRowProps {
  id: number
  className?: string
}

const ManaGemFontSizes = {
  tablet: '16px',
  tabletWide: '18px'
} as const

const NameFontSizes = {
  tablet: '16px',
  tabletWide: '16px',
  desktop: '18px'
} as const

const _AbilityRow = memo(({ id, className }: AbilityRowProps) => {
  const card = useMemo(() => Cards.get(id), [id])

  const { getAssetUrl } = useGetAssetContext()

  const cardTexts = useCardTexts(card?.baseId)

  if (!card) return null

  return (
    <div
      onMouseEnter={() => SoundClient.playSound('CursorHoverSlip')}
      className={clsx(
        Sprinkles({
          width: 'full',
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start'
        }),
        AbilityRowWrapper,
        className
      )}
      data-card-id={id}
      data-card-base-id={card.baseId}
    >
      {/* Mana Icon */}
      <div
        className={clsx(
          Sprinkles({ position: 'absolute', zIndex: 4, left: 0 }),
          ManaIconWrapper
        )}
      >
        {!!getAssetUrl && (
          <img
            src={getAssetUrl('webapp/icons/mana-gem.webp')}
            className={clsx(
              ManaIconImage,
              Sprinkles({
                width: 'full',
                height: 'full',
                top: 0,
                left: 0,
                position: 'absolute',
                zIndex: 5
              })
            )}
          />
        )}
        <Text
          className={clsx(ManaIconText, Sprinkles({ position: 'absolute' }))}
          color="black"
          fontWeight="700"
          fontSize={ManaGemFontSizes}
        >
          {card.cost === 'no' || !card.cost ? 0 : card.cost}
        </Text>
      </div>
      {/* Name */}
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            zIndex: 2,
            pointerEvents: 'none'
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
            position: 'relative',
            zIndex: 1,
            flex: 1
          }),
          AbilityRowBorder
        )}
      >
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              height: 'full',
              position: 'absolute',
              zIndex: 5,
              left: 0,
              top: 0
            }),
            AbilityRowGradeOverlay
          )}
        />
        <RowArt
          className={clsx(Sprinkles({ position: 'relative' }), AbilityRowImage)}
          url={`webapp/cards/art-rows/spells/2x/${card.artSlug}@2x.webp`}
        />
      </div>
    </div>
  )
})

_AbilityRow.displayName = 'AbilityRowWithRef'

export const AbilityRow = memo(_AbilityRow)

AbilityRow.displayName = 'AbilityRow'
