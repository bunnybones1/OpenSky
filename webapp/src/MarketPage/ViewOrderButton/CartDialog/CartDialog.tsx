import { SwapType } from '@0xsequence/metadata'
import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/components/Button'
import { TitleDetail } from '~/shared/components/TitleDetail'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { MarketMode } from '~/shared/types/market'

import { CART_DIALOG_ID } from '../shared/constants'
import {
  CartDialogHeaderBackButton,
  CartDialogHeaderStyle,
  CartDialogStyle
} from './CartDialog.css'
import { CartItemsList } from './CartItemsList/CartItemsList'
import { CartTotalRow } from './CartTotalRow/CartTotalRow'
import { CartControlsRow } from './components/CartControlsRow'

const { closeDialog } = controlDialog(CART_DIALOG_ID)

interface CartModalProps {
  mode?: MarketMode
}

export const CartDialog = memo(({ mode }: CartModalProps) => {
  const isTabletWide = useResponsiveQuery('tabletWide')
  const { t } = useTranslation()

  const onBackClick = useCallback(() => {
    closeDialog()
  }, [])

  if (!mode) return null

  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          flexDirection: 'column',
          flexWrap: 'nowrap'
        }),
        CartDialogStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            position: 'relative',
            borderBottom: '1px solid',
            borderColor: 'purple6',
            backgroundColor: 'purple2'
          }),
          CartDialogHeaderStyle
        )}
      >
        <TitleDetail
          title={t(mode === SwapType.BUY ? 'shop.titleCart' : 'shop.titleSell')}
          rightDisabled={true}
        />
        {!isTabletWide && (
          <div
            className={clsx(
              Sprinkles({
                position: 'absolute',
                top: 0,
                height: 'full',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start'
              }),
              CartDialogHeaderBackButton
            )}
          >
            <Button
              onClick={onBackClick}
              frameType="default"
              colorType="default"
              leftAdornment={{ icon: 'arrow-back' }}
              text={t('general.Back')}
              clickSound="BackReturnSwipe"
              hoverSound={null}
            />
          </div>
        )}
      </div>
      <CartItemsList mode={mode} />
      <CartTotalRow mode={mode} />
      <CartControlsRow mode={mode} />
    </div>
  )
})

CartDialog.displayName = 'CartDialog'
