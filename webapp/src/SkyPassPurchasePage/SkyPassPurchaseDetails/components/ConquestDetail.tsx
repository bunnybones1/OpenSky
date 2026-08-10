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
// import { ConquestDetailImage } from './ConquestDetail.css'

export const ConquestDetail = memo(() => {
  const { t } = useTranslation()

  const { getAssetUrl } = useGetAssetContext()

  return (
    <div
      className={clsx(
        Sprinkles({
          backgroundColor: 'purple3'
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
            ? `url(${getAssetUrl('webapp/backgrounds/premium-conquest.webp')})`
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
            {t('skypass.detailsTitles.ConquestTickets')}
          </div>
          <div className={SkyPassDetailDesc}>
            {t('skypass.detailsDescs.ConquestTickets')}
          </div>
        </div>
        <div
          className={Sprinkles({
            position: 'relative',
            width: 'full',
            height: 'full',
            overflow: 'hidden'
          })}
        />
      </div>
    </div>
  )
})

ConquestDetail.displayName = 'ConquestDetail'
