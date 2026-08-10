import { AppPlatform, getAppPlatform } from '@opensky/shared/get-app-platform'
import { enableBodyScroll } from 'body-scroll-lock-upgrade'
import clsx from 'clsx'
import {
  ComponentType,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef
} from 'react'

import { SoundClient } from '~/shared/clients'
import { FancyCloseButton } from '~/shared/components/FancyCloseButton/FancyCloseButton'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DialogCloseButton, DialogInnerStyle, DialogStyle } from './Dialog.css'
import { isDialogAlreadyOpen } from './shared/is-dialog-already-open'
import { DialogChildProps, DialogOptions } from './types'
import { adjustLayoutOnDialogChange } from './useDialog'

const platform = getAppPlatform()
const isIOS = platform === AppPlatform.IOS_NATIVE || platform === AppPlatform.IOS_WEB

export const Dialog = memo(
  <C extends ComponentType<any & DialogChildProps>>({
    id,
    className,
    isCloseButtonDisabled,
    isBorderDisabled,
    isGlowDisabled,
    isClickoffDisabled,
    isAnimationDisabled,
    onCancel,
    Element,
    ...props
  }: DialogOptions<C>) => {
    const onCancelRef = useRef<DialogOptions<C>['onCancel']>(onCancel)

    useLayoutEffect(() => {
      onCancelRef.current = onCancel
    }, [onCancel])

    const closeDialog = useCallback(() => {
      const element = document.getElementById(id) as HTMLDialogElement | null
      const alreadyHasDialog = isDialogAlreadyOpen(id)

      if (!!onCancel) onCancel()

      if (isCloseButtonDisabled) SoundClient.playSound('ModalCloseSwipe')

      if (!!element && !!element.open) {
        element.close()
        if (!alreadyHasDialog && !isIOS) {
          enableBodyScroll(element)
          adjustLayoutOnDialogChange(false)
        }
      }
    }, [id, onCancel, isCloseButtonDisabled])

    useEffect(() => {
      const element = document.getElementById(id) as HTMLDialogElement | null

      const handler = (e?: Event) => {
        if (e) e.preventDefault()
        if (!!onCancelRef.current) onCancelRef.current()
        if (!!element && element.open) {
          const alreadyHasDialog = isDialogAlreadyOpen(id)
          element.close()
          if (!alreadyHasDialog && !isIOS) {
            enableBodyScroll(element)
            adjustLayoutOnDialogChange(false)
          }
        }
      }

      if (!!element) {
        element.addEventListener('cancel', handler)
      }
      return () => {
        if (!!element) {
          element.removeEventListener('cancel', handler)
          handler()
        }
      }
    }, [id])

    const onClick = useCallback(
      (event: MouseEvent) => {
        if (!(event.target instanceof HTMLDialogElement) || isClickoffDisabled) return

        const element = document.getElementById(id) as HTMLDialogElement | null

        if (
          !!event.target &&
          event.target.nodeName === 'DIALOG' &&
          !!element &&
          !!element.open
        ) {
          closeDialog()
        }
      },
      [closeDialog, isClickoffDisabled, id]
    )

    useEffect(() => {
      const element = document.getElementById(id)
      if (element) {
        element.addEventListener('click', onClick)
      }
      return () => {
        if (element) {
          element.removeEventListener('click', onClick)
        }
      }
    }, [onClick, id])

    return (
      <dialog
        className={clsx(
          Sprinkles({ backgroundColor: 'purple1' }),
          DialogStyle,
          {
            isBorderDisabled,
            isGlowDisabled,
            isAnimationDisabled
          },
          className
        )}
        id={id}
      >
        <div
          className={clsx(
            Sprinkles({
              position: 'relative'
            }),
            DialogInnerStyle
          )}
        >
          {/* @ts-ignore */}
          <Element id={id} {...props} />
          {!isCloseButtonDisabled && (
            <div
              className={clsx(
                Sprinkles({
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  zIndex: 2
                }),
                DialogCloseButton
              )}
            >
              <FancyCloseButton onClick={closeDialog} />
            </div>
          )}
        </div>
      </dialog>
    )
  }
)

Dialog.displayName = 'Dialog'
