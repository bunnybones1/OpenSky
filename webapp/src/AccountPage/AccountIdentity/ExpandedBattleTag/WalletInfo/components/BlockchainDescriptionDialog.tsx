import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { ImageIcon } from '~/shared/components/ImageIcon/ImageIcon'
import { Text } from '~/shared/components/Text'
import { TitleDetail } from '~/shared/components/TitleDetail'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  Background,
  Grid,
  Header,
  LineHeight,
  Wrapper
} from './BlockchainDescriptionDialog.css'

export const BlockchainDescriptionDialog = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()

  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexDirection: 'column'
        }),
        Wrapper
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            borderBottom: '1px solid',
            borderColor: 'purple7',
            backgroundColor: 'purple1'
          }),
          Header
        )}
      >
        <TitleDetail title={t('profile.blockchainDescriptionTitle')} />
      </div>
      <div
        style={{
          backgroundImage: !!getAssetUrl
            ? `linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), linear-gradient(to top, rgba(12, 6, 30, 0.4), rgba(12, 6, 30, 0.9)), url(${getAssetUrl(
                'webapp/backgrounds/bg-dark-03.webp'
              )})`
            : undefined
        }}
        className={clsx(
          Sprinkles({
            flex: 1,
            width: 'full',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            position: 'relative'
          }),
          Background
        )}
      >
        <div className={clsx(Sprinkles({ display: 'grid', padding: '16px' }), Grid)}>
          <div
            className={Sprinkles({
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              display: 'flex'
            })}
          >
            {!!getAssetUrl && (
              <img
                src={getAssetUrl('webapp/misc/lockedcards.webp')}
                className={Sprinkles({ marginBottom: '8px' })}
              />
            )}
            <ImageIcon type="sequence" height="48px" />
          </div>
          <div
            className={Sprinkles({
              display: 'flex',
              flexDirection: 'column',
              paddingRight: '16px'
            })}
          >
            <Text
              className={clsx(
                Sprinkles({ width: 'full', marginBottom: '12px' }),
                LineHeight
              )}
              color="purple9"
              fontWeight="700"
              fontSize="16px"
            >
              {t('tooltip.blockchainPrimaryTextHeader')}
            </Text>
            <Text
              className={clsx(Sprinkles({ width: 'full' }), LineHeight)}
              color="purple9"
              fontSize="16px"
            >
              {t('tooltip.blockchainPrimaryText')}
            </Text>
          </div>
        </div>
      </div>
    </div>
  )
})

BlockchainDescriptionDialog.displayName = 'BlockchainDescriptionDialog'
