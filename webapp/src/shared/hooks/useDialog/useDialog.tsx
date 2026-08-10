import { AppPlatform, getAppPlatform } from '@opensky/shared/get-app-platform'
import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock-upgrade'
import { ComponentType, createElement, useCallback, useEffect } from 'react'

import { SoundClient } from '~/shared/clients'
import {
  DECK_BUILDER_CARDS_LIST_ID,
  DECK_VIEWER_ID,
  NAVBAR_ID
} from '~/shared/constants/ui'

import { Dialog as DialogComponent } from './Dialog'
import { isDialogAlreadyOpen } from './shared/is-dialog-already-open'
import { DialogOptions } from './types'

const platform = getAppPlatform()
const isIOS = platform === AppPlatform.IOS_NATIVE || platform === AppPlatform.IOS_WEB

export const adjustLayoutOnDialogChange = (isAdd: boolean) => {
  const scrollBarGap = window.innerWidth - document.documentElement.clientWidth
  const navBar = document.getElementById(NAVBAR_ID) as HTMLDivElement
  const deckViewer = document.getElementById(DECK_VIEWER_ID) as HTMLDivElement
  const deckBuilderCardsList = document.getElementById(
    DECK_BUILDER_CARDS_LIST_ID
  ) as HTMLDivElement

  if (scrollBarGap > 0 || !isAdd) {
    if (!!navBar) {
      navBar.style.paddingRight = isAdd ? `${scrollBarGap}px` : '0px'
    }
    if (!!deckViewer) {
      deckViewer.style.right = isAdd ? `${scrollBarGap}px` : '0px'
    }
    if (!!deckBuilderCardsList) {
      deckBuilderCardsList.style.right = isAdd ? `${scrollBarGap}px` : '0px'
    }
  }
}

export const useDialog = <C extends ComponentType>(options: DialogOptions<C>) => {
  useEffect(() => {
    return () => {
      const element = document.getElementById(options.id)
      const hasOpenDialog = isDialogAlreadyOpen(options.id)

      if (!!element && !hasOpenDialog && !isIOS) {
        adjustLayoutOnDialogChange(false)
        enableBodyScroll(element)
      }
    }
  }, [options.id])

  const openDialog = useCallback(() => {
    const element = document.getElementById(options.id) as HTMLDialogElement | null

    const hasOpenDialog = isDialogAlreadyOpen()

    if (!!element && !element.open) {
      element.showModal()

      if (!options.isSoundDisabled) SoundClient.playSound('OpenDialog')

      if (!hasOpenDialog && !isIOS) {
        adjustLayoutOnDialogChange(true)
        disableBodyScroll(element, { reserveScrollBarGap: true })
      }
    }
  }, [options.id, options.isSoundDisabled])

  const closeDialog = useCallback(() => {
    const element = document.getElementById(options.id) as HTMLDialogElement | null
    const hasOpenDialog = isDialogAlreadyOpen(options.id)

    if (!!element && !!element.open) {
      element.close()
      if (!hasOpenDialog) {
        adjustLayoutOnDialogChange(false)
        enableBodyScroll(element)
      }
    }
  }, [options.id])

  return {
    Dialog: createElement(DialogComponent, options),
    openDialog,
    closeDialog
  }
}
