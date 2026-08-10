import { isMobileBrowser } from '@opensky/shared/native'
import { isNativeMobileApp } from '@opensky/shared/native'
import clsx from 'clsx'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import env from '~/env'
import { AuthenticationClient } from '~/shared/clients'
import { Button } from '~/shared/components/Button'
import { Text } from '~/shared/components/Text'
import {
  trackAccountCreation,
  trackAccountCreationStarted,
  trackButtonClick
} from '~/shared/helpers/analytics-old'
import { getIsStandalone } from '~/shared/helpers/get-is-standalone'
import { captureError } from '~/shared/helpers/sentry'
import { useIsIOSDevice } from '~/shared/hooks/ui/useIsIOSDevice'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  AuthenticationPageBackground,
  AuthenticationPageButtonWrapper,
  AuthenticationPageContainer,
  AuthenticationPageLogo
} from './AuthenticationPage.css'
import { AppleHomescreenDialog } from './components/AppleHomescreenDialog'
import { LanguageSelect } from './components/LanguageSelect'
import Logo from './images/auth-logo.webp'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

const isPWASectionVisible =
  !isNativeMobileApp() &&
  !getIsStandalone() &&
  isMobileBrowser() &&
  (!env.DEBUG || !window.location.host.includes('localhost'))

const isDownloadMode =
  !getIsStandalone() &&
  isMobileBrowser() &&
  (!env.DEBUG || !window.location.host.includes('localhost'))

export const AuthenticationPage = memo(() => {
  const [isLoggingIn, setLoggingIn] = useState(false)
  const isIOSDevice = useIsIOSDevice()
  const { t } = useTranslation()

  const pwaPrompt = useRef<BeforeInstallPromptEvent | null>(null)
  const { Dialog, openDialog } = useDialog({
    Element: AppleHomescreenDialog,
    id: 'APPLE_HOME_SCREEN_DIALOG'
  })

  const onDownloadClick = useCallback(() => {
    trackButtonClick('Install Mobile App Button')

    if (isIOSDevice) {
      window.open(
        'https://apps.apple.com/us/app/opensky/id1469294062?ls=1',
        '_blank'
      )

      return
    }

    window.open(
      'https://play.google.com/store/apps/details?id=net.opensky.android',
      '_blank'
    )
  }, [isIOSDevice])

  useEffect(() => {
    if (isPWASectionVisible) {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault()
        pwaPrompt.current = e
      })
    }
    return () => {
      if (isPWASectionVisible) {
        window.removeEventListener('beforeinstallprompt', (e) => {
          e.preventDefault()
          pwaPrompt.current = e
        })
      }
    }
  }, [])

  const onClickPwaApple = useCallback(() => {
    openDialog()
  }, [openDialog])

  const onClickPwaGoogle = useCallback(() => {
    if (!!pwaPrompt.current) {
      pwaPrompt.current.prompt()
    }
  }, [])

  const onCreate = useCallback(async () => {
    trackButtonClick('New Account')
    try {
      trackAccountCreationStarted()
      setLoggingIn(true)
      await AuthenticationClient.createBurnerAccount()
    } catch (e) {
      captureError(e, 'Login failed!')
    } finally {
      setLoggingIn(false)
      trackAccountCreation()
    }
  }, [])

  const onLoginClick = useCallback(async () => {
    trackButtonClick('Login')
    try {
      setLoggingIn(true)
      await AuthenticationClient.login()
    } catch (e) {
      captureError(e, 'Login failed!')
    } finally {
      setLoggingIn(false)
    }
  }, [])

  return (
    <>
      <div
        className={Sprinkles({ width: 'full', height: 'full', position: 'relative' })}
      >
        <div
          className={clsx(Sprinkles({ width: 'full' }), AuthenticationPageBackground)}
        />
        <div
          className={Sprinkles({
            width: 'full',
            height: 'full',
            position: 'absolute',
            left: 0,
            top: 0
          })}
        >
          <div
            className={clsx(
              Sprinkles({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                flex: 1,
                flexWrap: 'nowrap'
              }),
              AuthenticationPageContainer
            )}
          >
            <div
              className={clsx(AuthenticationPageLogo, Sprinkles({ width: 'full' }))}
            >
              <img className={Sprinkles({ width: 'full' })} src={Logo} />
            </div>
            <div
              className={Sprinkles({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column'
              })}
            >
              <Text
                marginTop={{ base: '8px', tabletWide: '16px' }}
                fontSize={{ base: '16px', tablet: '18px', tabletWide: '22px' }}
                fontWeight="700"
                color="white"
                fontFamily="condensed"
              >
                {t('dashboard.tagline')}
              </Text>
              {!isDownloadMode && (
                <div
                  data-id="newAccount"
                  className={clsx(
                    Sprinkles({
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column'
                    }),
                    AuthenticationPageButtonWrapper
                  )}
                >
                  <Button
                    disabled={isLoggingIn}
                    height="52px"
                    className={FullWidthButtonStyle}
                    buttonClassName={FullWidthButtonStyle}
                    colorType="blue"
                    frameType="default"
                    buttonId="new-account"
                    clickSound={null}
                    hoverSound={null}
                    onClick={onCreate}
                    leftAdornment={isLoggingIn ? { icon: 'spinner' } : undefined}
                    text={t('general.newAccount')}
                  />
                </div>
              )}
              <div
                data-id="existingAccount"
                className={clsx(
                  Sprinkles({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }),
                  AuthenticationPageButtonWrapper,
                  { isSecondButton: !isDownloadMode }
                )}
              >
                <Button
                  disabled={isLoggingIn}
                  height="52px"
                  className={FullWidthButtonStyle}
                  buttonClassName={FullWidthButtonStyle}
                  buttonId="login"
                  colorType={isDownloadMode ? 'blue' : 'default'}
                  frameType="default"
                  clickSound={null}
                  hoverSound={null}
                  leftAdornment={isLoggingIn ? { icon: 'spinner' } : undefined}
                  onClick={isDownloadMode ? onDownloadClick : onLoginClick}
                  text={t(
                    isDownloadMode
                      ? 'mobileInstallPrompt.download'
                      : 'dashboard.login'
                  )}
                />
              </div>
              {isPWASectionVisible && (
                <>
                  {isIOSDevice && Dialog}
                  <Text color="white" marginTop="12px" fontSize="14px">
                    {t('support.or')}
                  </Text>
                  <div
                    className={clsx(
                      Sprinkles({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }),
                      'isSecondButton',
                      AuthenticationPageButtonWrapper
                    )}
                  >
                    <Button
                      disabled={isLoggingIn}
                      height="52px"
                      className={FullWidthButtonStyle}
                      buttonClassName={FullWidthButtonStyle}
                      colorType="default"
                      frameType="default"
                      clickSound={null}
                      hoverSound={null}
                      text={t('support.addToHomeScreen')}
                      onClick={isIOSDevice ? onClickPwaApple : onClickPwaGoogle}
                      leftAdornment={{
                        icon: isIOSDevice ? 'share-apple' : 'download'
                      }}
                    />
                  </div>
                </>
              )}
              <LanguageSelect />
            </div>
          </div>
        </div>
      </div>
    </>
  )
})

AuthenticationPage.displayName = 'AuthenticationPage'

export default AuthenticationPage
