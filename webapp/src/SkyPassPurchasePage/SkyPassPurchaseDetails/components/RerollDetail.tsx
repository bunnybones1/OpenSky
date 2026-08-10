import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  SkyPassDetail,
  SkyPassDetailDesc,
  SkyPassDetailInner,
  SkyPassDetailTitle
} from '../shared/SkyPassDetail.css'

export const RerollDetail = memo(() => {
  const { t } = useTranslation()
  const { getAssetUrl } = useGetAssetContext()

  return (
    <div
      className={clsx(
        Sprinkles({
          backgroundColor: 'purple3',
          overflow: 'hidden'
        }),
        SkyPassDetail
      )}
    >
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
            ? `url(${getAssetUrl('webapp/backgrounds/premium-rerolls.webp')})`
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
            {t('skypass.detailsTitles.ReRolls')}
          </div>
          <div className={SkyPassDetailDesc}>{t('skypass.detailsDescs.ReRolls')}</div>
        </div>
        {!!getAssetUrl && (
          <div
            className={Sprinkles({
              position: 'relative',
              width: 'full',
              height: 'full'
            })}
          />
        )}
      </div>
    </div>
  )
})

RerollDetail.displayName = 'RerollDetail'
