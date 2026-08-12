import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import env from '~/env'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  ConquestProgressBarTooltipPetals,
  ConquestProgressBarTooltipStyle,
  ConquestProgressBarTooltipText
} from './ConquestProgressBarTooltip.css'

export const ConquestProgressBarTooltip = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()
  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'grid',
          fontSize: '12px',
          padding: '12px'
        }),
        ConquestProgressBarTooltipStyle
      )}
    >
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexWrap: 'nowrap'
        })}
      >
        {!!getAssetUrl && (
          <img
            src={getAssetUrl('webapp/icons/petal-silver-gold.webp')}
            className={ConquestProgressBarTooltipPetals}
          />
        )}
        <span
          className={clsx(
            Sprinkles({
              fontWeight: '600',
              marginLeft: '8px',
              textAlign: 'left',
              color: 'purple9'
            }),
            ConquestProgressBarTooltipText
          )}
          dangerouslySetInnerHTML={{
            __html: t(
              env.AUTH_MODE === 'google'
                ? 'tooltip.progressionInfoOffchain'
                : 'tooltip.progressionInfo'
            )
          }}
        />
      </div>
    </div>
  )
})

ConquestProgressBarTooltip.displayName = 'ConquestProgressBarTooltip'
