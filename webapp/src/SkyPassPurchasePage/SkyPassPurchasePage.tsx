import clsx from 'clsx'
import { memo, useCallback } from 'react'

import { FancyBackButton } from '~/shared/components/FancyBackButton/FancyBackButton'
import { useNavigateToSkyPass } from '~/shared/hooks/useNavigateToSkypass'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { SkyPassPurchaseBackground } from './components/SkyPassPurchaseBackground'
import { SkyPassPurchaseDetails } from './SkyPassPurchaseDetails/SkyPassPurchaseDetails'
import { SkyPassPurchaseInfo } from './SkyPassPurchaseInfo/SkyPassPurchaseInfo'
import {
  SkypassPurchasePageBackButton,
  SkyPassPurchasePageInner,
  SkyPassPurchasePageStyle
} from './SkyPassPurchasePage.css'

export const SkyPassPurchasePage = memo(() => {
  const { navigateToSkypass } = useNavigateToSkyPass()

  const onBack = useCallback(() => navigateToSkypass(), [navigateToSkypass])

  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          paddingX: '16px'
        }),
        SkyPassPurchasePageStyle
      )}
    >
      <SkyPassPurchaseBackground />
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            left: 0,
            top: 0,
            zIndex: 4
          }),
          SkypassPurchasePageBackButton
        )}
      >
        <FancyBackButton onClick={onBack} />
      </div>

      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            overflow: 'auto',
            position: 'absolute',
            left: 0,
            height: 'full',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            top: 0,
            zIndex: 2,
            paddingX: '16px',
            flexWrap: 'nowrap'
          }),
          SkyPassPurchasePageInner
        )}
      >
        <SkyPassPurchaseInfo />
        <SkyPassPurchaseDetails />
      </div>
    </div>
  )
})

SkyPassPurchasePage.displayName = 'SkyPassPurchasePage'
