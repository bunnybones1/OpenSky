import { CARD_ARTISTS } from '@opensky/shared/artists'
import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { getExternalLink } from '~/shared/helpers/mobile-native-links'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CardImage } from '../../CardImage/CardImage'
import {
  CardDetailsPageCardStyle,
  FlavorText,
  Inner
} from './CardDetailsPageCard.css'

interface CardDetailsPageCardProps {
  id: number
  asset: string
  set: string
  flavorText?: string
  flavorExplainer?: string
  author?: string
}

export const CardDetailsPageCard = memo(
  ({
    id,
    asset,
    set,
    flavorText,
    flavorExplainer,
    author
  }: CardDetailsPageCardProps) => {
    const { t } = useTranslation()
    const isTabletWide = useResponsiveQuery('tabletWide')

    const artists = useMemo(() => {
      return CARD_ARTISTS.filter((artist) => asset.includes(artist.id))
    }, [asset])

    return (
      <div
        className={clsx(
          Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            flexDirection: 'column',
            paddingTop: '8px',
            left: 0
          }),
          CardDetailsPageCardStyle
        )}
      >
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              flexDirection: 'column'
            }),
            Inner
          )}
        >
          <CardImage id={id} />
          {!!artists.length && (
            <div
              className={Sprinkles({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: '16px',
                flexWrap: 'wrap'
              })}
            >
              <Text
                fontSize="12px"
                color="purple8"
                fontWeight="400"
                marginRight="4px"
              >
                {`${t('cardDetails.artist')}:`}
              </Text>
              {artists.map((artist, i) => {
                return (
                  <a
                    key={artist.id}
                    href={artist.url ? getExternalLink(artist.url) : ''}
                    className={Sprinkles({
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      fontSize: '12px',
                      fontWeight: '400',
                      color: 'purple8',
                      marginRight: '4px',
                      cursor: 'pointer'
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {`${artist.name}${i !== artists.length - 1 ? ',' : ''}`}
                    {i === artists.length - 1 && (
                      <Icon
                        height="14px"
                        color="purple8"
                        type="external"
                        marginLeft="4px"
                      />
                    )}
                  </a>
                )
              })}
            </div>
          )}

          <Text color="purple8" fontSize="12px" marginTop="16px" fontWeight="400">
            {set}
          </Text>
          {isTabletWide && (
            <div
              className={Sprinkles({
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                flexDirection: 'column',
                width: 'full',
                marginTop: '32px'
              })}
            >
              {!!flavorText && (
                <Text
                  color="purple9"
                  fontWeight={'600'}
                  fontSize="14px"
                  className={FlavorText}
                >
                  {flavorText}
                </Text>
              )}
              {!!flavorExplainer && (
                <Text
                  color="purple9"
                  marginTop="8px"
                  fontSize="14px"
                  className={FlavorText}
                >
                  {`- ${flavorExplainer}`}
                </Text>
              )}
              {!!author && (
                <Text
                  color="purple9"
                  marginTop="8px"
                  fontSize="14px"
                  className={FlavorText}
                >
                  {`- ${author}`}
                </Text>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
)

CardDetailsPageCard.displayName = 'CardDetailsPageCard'
