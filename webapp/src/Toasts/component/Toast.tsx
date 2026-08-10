import clsx from 'clsx'
import { memo, MouseEvent, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useMount, useUnmount } from 'react-use'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { useErrorIcon } from '~/shared/hooks/useErrorIcon'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { removeToast, Toast as IToast } from '~/shared/state/toast-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ErrorIcon, ToastText } from './Toast.css'

export const Toast = memo(
  ({
    duration,
    icon,
    secondaryText,
    iconColor,
    text,
    id,
    isEvergreen,
    onClick,
    onClickText
  }: IToast) => {
    const timeRemaining = useRef(isEvergreen ? 0 : duration)
    const countDown = useRef<number | null>(null)
    const closeButtonRef = useRef<HTMLDivElement | null>(null)
    const { getAssetUrl } = useGetAssetContext()

    const { t } = useTranslation()

    const errorIcon = useErrorIcon()

    const showSendReport = useMemo(() => {
      return (
        !!text &&
        [t('notification.error'), t('notification.nativeError')].includes(text)
      )
    }, [text, t])

    const closeNotification = useCallback(() => {
      removeToast(id)
    }, [id])

    const startCountDown = useCallback(() => {
      if (timeRemaining.current) {
        countDown.current = window.setInterval(() => {
          if (!!timeRemaining.current && timeRemaining.current > 0) {
            timeRemaining.current = timeRemaining.current - 1
          } else {
            if (!!countDown.current) {
              window.clearInterval(countDown.current)
              removeToast(id)
            }
          }
        }, 1000)
      }
    }, [id])

    useMount(() => {
      startCountDown()
    })

    useUnmount(() => {
      if (countDown.current) window.clearInterval(countDown.current)
    })

    const _onClick = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        if (
          !closeButtonRef.current ||
          closeButtonRef.current.contains(e.target as HTMLDivElement)
        ) {
          return
        }

        if (onClick) onClick()
        closeNotification()
      },
      [closeNotification, onClick]
    )

    const pauseCountdown = useCallback(() => {
      if (timeRemaining.current && timeRemaining.current > 0) {
        if (!!countDown.current) window.clearInterval(countDown.current)
      }
    }, [])

    return (
      <div
        className={Sprinkles({
          height: 'auto',
          width: 'full',
          pointerEvents: 'all',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '12px',
          flexWrap: 'nowrap',
          position: 'relative'
        })}
        onMouseEnter={pauseCountdown}
        onMouseLeave={startCountDown}
        onClick={_onClick}
      >
        <>
          {icon === 'error' && !!getAssetUrl && (
            <img
              src={getAssetUrl(errorIcon)}
              className={clsx(ErrorIcon, Sprinkles({ marginRight: '12px' }))}
            />
          )}
          {!!icon && icon !== 'error' && (
            <div
              className={Sprinkles({
                display: 'flex',
                height: 'full',
                paddingRight: { base: '8px', mobile: '12px' },
                alignItems: 'center',
                justifyContent: 'center'
              })}
            >
              <Icon color={iconColor || 'white'} height="32px" type={icon} />
            </div>
          )}
          <div
            className={Sprinkles({
              height: 'full',
              flex: 1,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              overflow: 'hidden',
              flexDirection: 'column'
            })}
          >
            {!!text && (
              <Text
                color="warm7"
                fontSize="16px"
                fontWeight="500"
                fontFamily="condensed"
                className={clsx(Sprinkles({ width: 'full' }), ToastText)}
              >
                {text}
              </Text>
            )}
            {!!secondaryText && (
              <div
                className={Sprinkles({
                  marginY: '4px',
                  width: 'full',
                  display: 'flex'
                })}
              >
                <Text color="white" fontSize="12px">
                  {secondaryText}
                </Text>
              </div>
            )}
            {showSendReport && !!onClick ? (
              <Text color="purple9" fontSize="12px">
                {t('notification.sendReport')}
              </Text>
            ) : !!onClick && secondaryText === undefined ? (
              <Text color="purple9" fontSize="12px" marginTop="4px">
                {onClickText || t('notification.moreDetails')}
              </Text>
            ) : null}
          </div>
        </>
        <div
          className={Sprinkles({
            padding: '4px',
            right: 0,
            top: 0,
            position: 'absolute',
            zIndex: 2,
            cursor: 'pointer'
          })}
          ref={closeButtonRef}
          onClick={closeNotification}
        >
          <Icon type="close" height="14px" color="white" />
        </div>
      </div>
    )
  }
)

Toast.displayName = 'Toast'
