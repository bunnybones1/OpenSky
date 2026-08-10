import { useCallback } from 'react'

import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useGetHasEnoughCachedAssets } from '~/shared/hooks/useGetHasEnoughCachedAssets'

import { JoinQueueParams } from '../useJoinQueue/useJoinQueue'
import { AssetWarningDialog } from './components/AssetWarningDialog'
import { ASSET_WARNING_DIALOG_ID } from './shared/constants'

export const useAssetWarningDialog = (props: JoinQueueParams) => {
  const { Dialog, openDialog } = useDialog({
    Element: AssetWarningDialog,
    id: ASSET_WARNING_DIALOG_ID,
    ...props
  })

  const hasEnoughCached = useGetHasEnoughCachedAssets()

  const showAssetWarning = useCallback(() => {
    if (hasEnoughCached()) return false

    openDialog()

    return true
  }, [hasEnoughCached, openDialog])

  return {
    Dialog,
    showAssetWarning
  }
}
