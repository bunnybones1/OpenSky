import { useDialog } from '~/shared/hooks/useDialog/useDialog'

import { BasketDialog, BasketDialogProps } from '../BasketDialog'
import { BasketDialogOverride } from './BasketDialogOverride.css'
import { BASKET_DIALOG_ID } from './constants'

export const useBasketDialog = (props: BasketDialogProps) => {
  const { Dialog, openDialog, closeDialog } = useDialog({
    id: BASKET_DIALOG_ID,
    Element: BasketDialog,
    className: BasketDialogOverride,
    isClickoffDisabled: true,
    isBorderDisabled: true,
    isCloseButtonDisabled: true,
    ...props
  })

  return {
    Dialog,
    openDialog,
    closeDialog
  }
}
