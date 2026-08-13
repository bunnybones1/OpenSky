import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import env from '~/env'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  SkyPassDetail,
  SkyPassDetailBadge,
  SkyPassDetailDesc,
  SkyPassDetailInner,
  SkyPassDetailTitle
} from '../shared/SkyPassDetail.css'
import { SilverCardDetailImage } from './SilverCardDetail.css'

export const SilverCardDetail = memo(() => {
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
      {!!getAssetUrl && env.AUTH_MODE !== 'google' && (
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
            ? `url(${getAssetUrl('webapp/backgrounds/premium-silver-card.webp')})`
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
            {t('skypass.detailsTitles.SilverCard')}
          </div>
          <div className={SkyPassDetailDesc}>
            {t(
              env.AUTH_MODE === 'google'
                ? 'skypass.detailsDescsOffchain.SilverCard'
                : 'skypass.detailsDescs.SilverCard'
            )}
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
                SilverCardDetailImage,
                Sprinkles({ position: 'absolute' })
              )}
              src={getAssetUrl('webapp/misc/reward-hexinv-singlecard-silver.webp')}
            />
          </div>
        )}
      </div>
    </div>
  )
})

SilverCardDetail.displayName = 'SilverCardDetail'
