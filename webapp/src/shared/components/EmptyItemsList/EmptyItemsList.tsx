import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/components/Button'
import { Text } from '~/shared/components/Text'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  EmptyListEnd,
  EmptyListImage,
  EmptyListImageWrapper
} from './EmptyItemsList.css'

interface EmptyItemsListProps {
  bgSrc?: string
  subText?: string
  text?: string
  ctaText?: string
  ctaClick?: () => void
}

export const EmptyItemsList = memo(
  ({ bgSrc, subText, text, ctaText, ctaClick }: EmptyItemsListProps) => {
    const { getAssetUrl } = useGetAssetContext()

    const { t } = useTranslation()

    return (
      <div
        className={Sprinkles({
          width: 'full',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        })}
      >
        <div className={EmptyListImageWrapper}>
          {!!bgSrc ? (
            <img src={bgSrc} className={EmptyListImage} />
          ) : !!getAssetUrl ? (
            <img
              src={getAssetUrl('webapp/backgrounds/empty-list-base.webp')}
              className={EmptyListImage}
            />
          ) : null}
        </div>
        <Text
          fontSize={{ mobile: '22px', desktop: '26px' }}
          color="purple9"
          fontFamily="condensed"
        >
          {text ||
            t('search.emptySearch', { item: t('generic.Items').toLowerCase() })}
        </Text>
        {!!subText && (
          <div
            className={Sprinkles({
              fontSize: '16px',
              fontFamily: 'condensed',
              color: 'white',
              marginTop: '12px',
              fontWeight: '400'
            })}
            dangerouslySetInnerHTML={{
              __html: subText
            }}
          />
        )}
        {!!ctaText && !!ctaClick && (
          <div
            className={Sprinkles({
              width: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '12px'
            })}
          >
            <Button
              text={ctaText}
              onClick={ctaClick}
              height="36px"
              frameType="default"
              colorType="green"
            />
          </div>
        )}
        {!!getAssetUrl && (
          <img
            className={EmptyListEnd}
            src={getAssetUrl('webapp/misc/end-of-list.webp')}
          />
        )}
      </div>
    )
  }
)

EmptyItemsList.displayName = 'EmptyItemsList'
