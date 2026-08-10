import { DeckClass } from '@opensky/proto'
import { DECKCLASS_HEROES } from '@opensky/shared/constants'
import clsx from 'clsx'
import { memo, ReactNode } from 'react'

import { Icon } from '~/shared/components/Icon/Icon'
import { IconTypes } from '~/shared/components/Icon/IconConfig'
import { Text } from '~/shared/components/Text'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  DeckInfoHero,
  DeckInfoHeroImage,
  DeckInfoHeroWrapper,
  DeckInfoStyle,
  DeckNameStyle,
  DeckStatsWrapper
} from './DeckInfo.css'

interface DeckInfoProps {
  name: string
  deckClass: DeckClass
  isStarterDeck: boolean
  DeckStats?: ReactNode
  rankInfoNumber?: number
  rankInfoIcon?: IconTypes
}

export const DeckInfo = memo(
  ({
    name,
    isStarterDeck,
    DeckStats,
    deckClass,
    rankInfoNumber,
    rankInfoIcon
  }: DeckInfoProps) => {
    const { getAssetUrl } = useGetAssetContext()
    return (
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: isStarterDeck ? 'flex-end' : 'flex-start',
            flexWrap: 'nowrap'
          }),
          DeckInfoStyle
        )}
      >
        <Text
          fontSize={{ base: '16px', tablet: '18px', tabletWide: '22px' }}
          fontWeight="700"
          color="white"
          className={DeckNameStyle}
        >
          {name}
        </Text>
        {!!DeckStats && (
          <div
            className={clsx(
              Sprinkles({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px'
              }),
              DeckStatsWrapper
            )}
          >
            {DeckStats}
          </div>
        )}
        {!isStarterDeck && (
          <div
            className={clsx(
              Sprinkles({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }),
              DeckInfoHeroWrapper
            )}
          >
            <div
              className={clsx(
                Sprinkles({
                  overflow: 'hidden',
                  marginRight: '4px'
                }),
                DeckInfoHero
              )}
            >
              {!!getAssetUrl && (
                <img
                  className={DeckInfoHeroImage}
                  src={getAssetUrl(`webapp/icons/${deckClass}-thumbnail-hex.webp`)}
                />
              )}
            </div>
            <Text color="purple8" fontWeight="700" fontSize="14px">
              {`${DECKCLASS_HEROES[deckClass]}`}
            </Text>
            {rankInfoNumber !== undefined && (
              <>
                <Text
                  marginRight={!!rankInfoIcon ? '4px' : undefined}
                  color="warm7"
                  marginLeft="8px"
                  fontSize="14px"
                  fontWeight="700"
                >
                  {rankInfoNumber}
                </Text>
                {!!rankInfoIcon && (
                  <Icon type={rankInfoIcon} color="warm7" height="14px" />
                )}
              </>
            )}
          </div>
        )}
      </div>
    )
  }
)

DeckInfo.displayName = 'DeckInfo'
