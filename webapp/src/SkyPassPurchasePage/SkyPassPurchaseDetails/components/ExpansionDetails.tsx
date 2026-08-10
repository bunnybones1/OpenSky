import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  SkyPassDetail,
  SkyPassDetailBadge,
  SkyPassDetailDesc,
  SkyPassDetailInner,
  SkyPassDetailTitle
} from '../shared/SkyPassDetail.css'
import { FirstExpansionImage } from './ExpansionDetails.css'

export const ExpansionDetails = memo(() => {
  const { t } = useTranslation()
  const { getAssetUrl } = useGetAssetContext()
  return (
    <div
      className={clsx(
        Sprinkles({
          backgroundColor: 'purple3',
          overflow: 'hidden',
          position: 'relative'
        }),
        SkyPassDetail
      )}
    >
      {!!getAssetUrl && (
        <div
          className={clsx(
            Sprinkles({
              position: 'absolute',
              zIndex: 4
            }),
            SkyPassDetailBadge
          )}
        >
          <img
            src={getAssetUrl('webapp/icons/badge-mint-reward.webp')}
            className={Sprinkles({ width: 'full' })}
          />
        </div>
      )}
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            height: 'full',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start'
          }),
          SkyPassDetailInner
        )}
        style={{
          backgroundImage: !!getAssetUrl
            ? `url(${getAssetUrl('webapp/backgrounds/premium-new-expansion.webp')})`
            : undefined
        }}
      >
        <div
          className={Sprinkles({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 2,
            width: 'full',
            height: 'full'
          })}
        >
          <div className={SkyPassDetailTitle}>
            {t('skypass.detailsTitles.NewExpansionCards')}
          </div>
          <div className={SkyPassDetailDesc}>
            {t('skypass.detailsDescs.NewExpansionCards')}
          </div>
        </div>
        {!!getAssetUrl && (
          <div
            className={Sprinkles({
              position: 'relative',
              width: 'full',
              height: 'full'
            })}
          >
            <img
              className={clsx(
                Sprinkles({
                  zIndex: 2,
                  position: 'absolute',
                  objectFit: 'contain'
                }),
                FirstExpansionImage
              )}
              src={getAssetUrl('webapp/misc/reward-hexinv-multicard.webp')}
            />
          </div>
        )}
      </div>
    </div>
  )
})

ExpansionDetails.displayName = 'ExpansionDetails'
