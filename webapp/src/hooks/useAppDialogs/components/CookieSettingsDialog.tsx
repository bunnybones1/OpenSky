import { TFuncKey } from '@opensky/language-manager'
import clsx from 'clsx'
import { produce } from 'immer'
import { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMount } from 'react-use'

import env from '~/env'
import { Button } from '~/shared/components/Button'
import { Checkbox } from '~/shared/components/Checkbox'
import { Text } from '~/shared/components/Text'
import { TitleDetail } from '~/shared/components/TitleDetail'
import { COOKIES } from '~/shared/constants/accounts'
import { COOKIE_SETTINGS_DIALOG_ID } from '~/shared/constants/ui'
import { saveAllCookieConsent } from '~/shared/helpers/analytics-old'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useSaveCookiePolicy } from '~/shared/mutations/useSaveCookiePolicy'
import { useCookiePolicy } from '~/shared/queries/useCookiePolicy'
import { updateUIState } from '~/shared/state/ui/ui-state'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  ButtonGrid,
  CookieDescription,
  CookieGrid,
  CookieSettingsDialogStyle,
  Header
} from './CookieSettingsDialog.css'

const { closeDialog } = controlDialog(COOKIE_SETTINGS_DIALOG_ID)
const COOKIE_OPTIONS =
  env.AUTH_MODE === 'google'
    ? COOKIES.filter(
        (cookie) =>
          cookie.id === 'AUTHENTICATION' || cookie.id === 'PRODUCT_ANALYTICS'
      )
    : COOKIES

export const CookieSettingsDialog = memo(() => {
  const { t } = useTranslation()
  const { data: cookiePolicy } = useCookiePolicy()
  const saveCookiePolicy = useSaveCookiePolicy()
  const [cookieConsentTemporary, setCookieConsentTemporary] = useState({})
  useMount(async () => {
    // Fetched cookie policy from API
    if (cookiePolicy) {
      setCookieConsentTemporary(cookiePolicy)
    }
    // Fetched cookie policy from localStorage
    else {
      const storedCookieConsent = window.localStorage.getItem('consented_cookies')
      if (storedCookieConsent) {
        const parsedStoredCookieConsent = JSON.parse(storedCookieConsent)['policy']
        const mappedCookieConsent = {}
        COOKIE_OPTIONS.forEach((cookie) => {
          const id = cookie.id

          mappedCookieConsent[id] = parsedStoredCookieConsent[cookie.id]
        })

        setCookieConsentTemporary(mappedCookieConsent)
      }
    }
  })

  const onConfirmSelected = useCallback(() => {
    const selectedCookies = {}
    COOKIE_OPTIONS.forEach((cookie) => {
      if (cookieConsentTemporary[cookie.id] || cookie.essential) {
        selectedCookies[cookie.id] = true
      }
    })

    saveAllCookieConsent(selectedCookies)
    saveCookiePolicy.mutate(selectedCookies)

    updateUIState('isCookieDisclaimerHidden', true)

    closeDialog()
  }, [cookieConsentTemporary, saveCookiePolicy])

  const onCheckBoxChange = useCallback(
    (cookieId: string) => (value: boolean) => {
      setCookieConsentTemporary((current) => {
        return produce(current, (draft) => {
          draft[cookieId] = !value
        })
      })
    },
    []
  )

  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexDirection: 'column',
          flexWrap: 'nowrap'
        }),
        CookieSettingsDialogStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            borderBottom: '1px solid',
            borderColor: 'purple7',
            backgroundColor: 'purple1'
          }),
          Header
        )}
      >
        <TitleDetail title={t('general.cookies')} />
      </div>
      <div
        className={Sprinkles({
          width: 'full',
          flex: 1,
          paddingX: '32px',
          paddingTop: '32px',
          overflow: 'auto'
        })}
      >
        <div
          className={Sprinkles({
            color: 'purple9',
            fontWeight: '500',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start'
          })}
        >
          {env.AUTH_MODE === 'google' ? (
            <>
              Cloud Weasel stores only essential sign-in data and your optional
              analytics preference. No analytics provider is configured in the current
              deployment.
            </>
          ) : (
            <>
              {t('support.forMoreInfoAboutOur')}
              <a
                href="https://sequence.xyz/cookies.html"
                target="_blank"
                rel="noreferrer"
                className={Sprinkles({ color: 'white', marginX: '4px' })}
              >
                {t('cookies.cookiePolicy')}
              </a>
              {t('support.pleaseFollowLink')}
            </>
          )}
        </div>
        {COOKIE_OPTIONS &&
          cookieConsentTemporary &&
          COOKIE_OPTIONS.map((cookie) => (
            <div
              className={clsx(
                Sprinkles({
                  width: 'full',
                  marginTop: '24px',
                  alignItems: 'flex-start',
                  display: 'grid'
                }),
                CookieGrid
              )}
              key={cookie.id}
            >
              <Text color="white" fontSize="16px" fontWeight="500">
                {env.AUTH_MODE === 'google'
                  ? cookie.id === 'AUTHENTICATION'
                    ? 'Authentication & Session'
                    : 'Product Analytics'
                  : t(cookie.reason as TFuncKey<'webapp'>)}
              </Text>
              <div
                className={Sprinkles({
                  display: 'flex',
                  width: 'full',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start'
                })}
              >
                <Checkbox
                  value={
                    cookie.essential ? true : !!cookieConsentTemporary[cookie.id]
                  }
                  isActive={
                    cookie.essential ? true : !!cookieConsentTemporary[cookie.id]
                  }
                  onChange={onCheckBoxChange(cookie.id)}
                  text={
                    cookie.essential ? t('cookies.required') : t('cookies.enable')
                  }
                />
                <div
                  className={Sprinkles({
                    color: 'purple7',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginTop: '12px'
                  })}
                >
                  <span
                    className={Sprinkles({ color: 'purple9', marginRight: '4px' })}
                  >
                    {t('cookies.type')}
                  </span>
                  {cookie.type}
                </div>
                <div
                  className={clsx(
                    Sprinkles({
                      color: 'purple7',
                      fontSize: '14px',
                      fontWeight: '500',
                      marginTop: '8px'
                    }),
                    CookieDescription
                  )}
                >
                  <span
                    className={Sprinkles({ color: 'purple9', marginRight: '4px' })}
                  >
                    {t('cookies.description')}:
                  </span>
                  {env.AUTH_MODE === 'google'
                    ? cookie.id === 'AUTHENTICATION'
                      ? 'Keeps your Google sign-in and essential Cloud Weasel app preferences working.'
                      : 'Stores whether you allow a future Cloud Weasel-owned product analytics integration.'
                    : t(cookie.description as unknown as any)}
                </div>
              </div>
            </div>
          ))}
        <div
          className={clsx(
            Sprinkles({
              display: 'grid',
              paddingY: '32px'
            }),
            ButtonGrid
          )}
        >
          <Button
            height="36px"
            className={FullWidthButtonStyle}
            buttonClassName={FullWidthButtonStyle}
            colorType="blue"
            frameType="default"
            text={t('general.cancel')}
            onClick={closeDialog}
          />
          <Button
            height="36px"
            className={FullWidthButtonStyle}
            buttonClassName={FullWidthButtonStyle}
            colorType="blue"
            frameType="default"
            text={t('cookies.confirmSelected')}
            onClick={onConfirmSelected}
          />
        </div>
      </div>
    </div>
  )
})

CookieSettingsDialog.displayName = 'CookieSettingsDialog'
