import { SwapType } from '@0xsequence/metadata'
import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { MarketMode } from '~/shared/types/market'

import { FancyBackButton } from '../../FancyBackButton/FancyBackButton'
import { FancyPageTitle } from '../../FancyPageTitle/FancyPageTitle'
import { BASKET_DIALOG_ID } from '../exported/constants'
import {
  BackButtonWrapper,
  BasketDialogHeaderStyle,
  HeaderLeftSide,
  HeaderText
} from './BasketDialogHeader.css'

const { closeDialog } = controlDialog(BASKET_DIALOG_ID)

interface BasketDialogHeaderProps {
  mode: MarketMode
}

export const BasketDialogHeader = memo(({ mode }: BasketDialogHeaderProps) => {
  const { t } = useTranslation()
  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          position: 'relative',
          borderBottom: '1px solid',
          borderColor: 'purple7'
        }),
        BasketDialogHeaderStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            position: 'absolute',
            left: 0,
            top: 0
          }),
          HeaderLeftSide
        )}
      >
        <div
          className={clsx(
            Sprinkles({ position: 'absolute', left: 0, top: 0, zIndex: 3 }),
            BackButtonWrapper
          )}
        >
          <FancyBackButton onClick={closeDialog} />
        </div>
        <FancyPageTitle
          text={mode === SwapType.BUY ? t('shop.PURCHASE') : t('shop.SALE')}
          textClassName={HeaderText}
        />
      </div>
      <div
        className={Sprinkles({
          paddingBottom: '4px',
          height: 'full',
          position: 'absolute',
          right: 0,
          top: 0,
          display: 'flex'
        })}
      >
        <svg
          className={Sprinkles({ height: 'full' })}
          viewBox="0 0 54 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clipPath="url(#basket-header-clip)">
            <g opacity="0.25">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M24.9545 25.1857L18.8093 19.1513L13.3132 24.6705L24.4121 35.6819L29.9615 30.1762L24.9545 25.1857ZM19.1695 18.7929L27.0133 10.9174L36.2801 1.81434L49.4822 14.779L53.5064 18.7705L36.2801 35.6864L25.2658 24.8676L19.1695 18.7929ZM29.9615 7.32454L26.7021 10.5993L18.7648 18.3942L0.311264 0L0 0.318069L18.538 18.7929L1.39624 36H2.02767L12.9975 24.9886L24.0963 36H24.7322L30.2727 30.4988L35.871 36H36.6003L54 18.9094V18.5913L49.7935 14.4609L42.5988 7.32006L49.5667 0.318069L49.251 0L42.2431 7.04679L36.4358 1.34395H36.1245L30.3172 7.04679L23.3048 0L22.9891 0.318069L29.9615 7.32454Z"
                fill="#AC8FFF"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M24.9545 25.1857L18.8093 19.1513L13.3132 24.6705L24.4121 35.6819L29.9615 30.1762L24.9545 25.1857ZM19.1695 18.7929L27.0133 10.9174L36.2801 1.81434L49.4822 14.779L53.5064 18.7705L36.2801 35.6864L25.2658 24.8676L19.1695 18.7929ZM29.9615 7.32454L26.7021 10.5993L18.7648 18.3942L0.311264 0L0 0.318069L18.538 18.7929L1.39624 36H2.02767L12.9975 24.9886L24.0963 36H24.7322L30.2727 30.4988L35.871 36H36.6003L54 18.9094V18.5913L49.7935 14.4609L42.5988 7.32006L49.5667 0.318069L49.251 0L42.2431 7.04679L36.4358 1.34395H36.1245L30.3172 7.04679L23.3048 0L22.9891 0.318069L29.9615 7.32454Z"
                fill="url(#basket-header-paint)"
              />
            </g>
          </g>
          <defs>
            <linearGradient
              id="basket-header-paint"
              x1="27"
              y1="5.36442e-08"
              x2="27"
              y2="13.8"
              gradientUnits="userSpaceOnUse"
            >
              <stop />
              <stop offset="1" stopOpacity="0" />
            </linearGradient>
            <clipPath id="basket-header-clip">
              <rect
                width="54"
                height="36"
                fill="white"
                transform="matrix(-1 0 0 1 54 0)"
              />
            </clipPath>
          </defs>
        </svg>
      </div>
    </div>
  )
})

BasketDialogHeader.displayName = 'BasketDialogHeader'
