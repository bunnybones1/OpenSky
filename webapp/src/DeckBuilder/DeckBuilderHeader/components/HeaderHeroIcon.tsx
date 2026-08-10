import { DECKCLASS_HEROES } from '@opensky/shared/constants'
import clsx from 'clsx'
import { memo } from 'react'

import { deckBuilderDeckClassSelector } from '~/DeckBuilder/shared/selectors'
import { DeckClass } from '~/lib/proto'
import { Text } from '~/shared/components/Text'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useSelector } from '~/shared/redux'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { HeaderHeroIconImage, HeaderHeroIconStyle } from './HeaderHeroIcon.css'

const MarginLeft = { base: '0px', tabletWide: '4px' } as const
const FlexDirection = { base: 'column', tabletWide: 'row' } as const

export const HeaderHeroIcon = memo(() => {
  const { getAssetUrl } = useGetAssetContext()

  const deckClass = useSelector(deckBuilderDeckClassSelector)

  if (!deckClass) return null

  return (
    <div
      className={Sprinkles({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: FlexDirection,
        marginLeft: '16px'
      })}
    >
      <div
        className={clsx(
          Sprinkles({
            overflow: 'hidden',
            marginBottom: '4px'
          }),
          HeaderHeroIconStyle
        )}
      >
        {!!getAssetUrl && (
          <img
            className={HeaderHeroIconImage}
            src={getAssetUrl(`webapp/icons/${deckClass}-thumbnail-hex.webp`)}
          />
        )}
      </div>
      <Text marginLeft={MarginLeft} color="purple8" fontWeight="700" fontSize="12px">
        {`${DECKCLASS_HEROES[deckClass as DeckClass]}`}
      </Text>
    </div>
  )
})

HeaderHeroIcon.displayName = 'HeaderHeroIcon'
