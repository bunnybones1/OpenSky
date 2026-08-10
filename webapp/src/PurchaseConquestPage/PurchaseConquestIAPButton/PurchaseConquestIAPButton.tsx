import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { Box } from '~/shared/components/Base/Box'
import { Button } from '~/shared/components/Button'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { IAPDialog } from './IAPDialog/IAPDialog'

interface PurchaseConquestIAPButtonProps {
  isFetching: boolean
}

export const PurchaseConquestIAPButton = memo(
  ({ isFetching }: PurchaseConquestIAPButtonProps) => {
    const isTabletWide = useResponsiveQuery('tabletWide')

    const { Dialog, openDialog } = useDialog({
      Element: IAPDialog,
      id: 'IAP_DIALOG',
      isCloseButtonDisabled: true
    })

    const { t } = useTranslation()

    const _openDialog = useCallback(() => openDialog(), [openDialog])

    return (
      <>
        <Box height="100%" flex={1}>
          <Button
            frameType="default"
            colorType="secondary"
            height={isTabletWide ? '52px' : '36px'}
            onClick={_openDialog}
            text={
              isFetching
                ? t('market.fetchingCardBalances')
                : t('market.buyTicketsNow')
            }
            data-id="chooseIap"
            leftAdornment={{
              icon: isFetching ? 'spinner' : undefined
            }}
            className={Sprinkles({ width: 'full' })}
          />
        </Box>
        {Dialog}
      </>
    )
  }
)

PurchaseConquestIAPButton.displayName = 'PurchaseConquestIAPButton'
