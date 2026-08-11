import clsx from 'clsx'
import { memo, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  identityClient,
  type IdentitySession
} from '~/clients/IdentityClient/IdentityClient'
import { Button } from '~/shared/components/Button'
import { Text } from '~/shared/components/Text'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'

import {
  IdentityActions,
  IdentityAvatar,
  IdentityButton,
  IdentityCopy,
  IdentityEmail,
  IdentityProfile,
  IdentityStatus
} from './GoogleIdentityActions.css'

interface Props {
  isPracticeEnabled: boolean
  onPractice: () => void
}

export const GoogleIdentityActions = memo(
  ({ isPracticeEnabled, onPractice }: Props) => {
    const { t } = useTranslation()
    const [session, setSession] = useState<IdentitySession>()
    const [isWorking, setIsWorking] = useState(true)
    const [status, setStatus] = useState<string>()

    useEffect(() => {
      const url = new URL(window.location.href)
      const authError = url.searchParams.get('auth_error')
      if (authError === 'cancelled') setStatus(t('identityAuth.cancelled'))
      else if (authError) setStatus(t('identityAuth.failed'))

      if (url.searchParams.has('auth') || authError) {
        url.searchParams.delete('auth')
        url.searchParams.delete('auth_error')
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
      }

      identityClient
        .getSession()
        .then((nextSession) => setSession(nextSession))
        .catch(() => setStatus(t('identityAuth.statusUnavailable')))
        .finally(() => setIsWorking(false))
    }, [t])

    const signIn = useCallback(() => {
      setStatus(undefined)
      setIsWorking(true)
      identityClient.signInWithGoogle()
    }, [])

    const signOut = useCallback(async () => {
      try {
        setStatus(undefined)
        setIsWorking(true)
        await identityClient.signOut()
        setSession(await identityClient.getSession())
      } catch (error) {
        setStatus(error instanceof Error ? error.message : t('identityAuth.failed'))
      } finally {
        setIsWorking(false)
      }
    }, [t])

    const googleAvailable = session?.providers.google === true
    const signedIn = session?.authenticated === true

    return (
      <div className={IdentityActions}>
        {signedIn ? (
          <div className={IdentityProfile}>
            {session.user.avatarUrl && (
              <img
                className={IdentityAvatar}
                src={session.user.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
              />
            )}
            <div className={IdentityCopy}>
              <Text color="white" fontSize="16px" fontWeight="700">
                {session.user.displayName}
              </Text>
              <div className={IdentityEmail}>
                <Text color="white" fontSize="12px">
                  {session.user.email}
                </Text>
              </div>
            </div>
          </div>
        ) : (
          <Text color="white" fontSize="14px">
            {t('identityAuth.description')}
          </Text>
        )}

        {!signedIn && (
          <div className={IdentityButton}>
            <Button
              disabled={isWorking || !googleAvailable}
              height="52px"
              className={FullWidthButtonStyle}
              buttonClassName={FullWidthButtonStyle}
              buttonId="google-sign-in"
              colorType="blue"
              frameType="default"
              clickSound={null}
              hoverSound={null}
              leftAdornment={isWorking ? { icon: 'spinner' } : undefined}
              onClick={signIn}
              text={t('identityAuth.continueWithGoogle')}
            />
          </div>
        )}

        {isPracticeEnabled && (
          <div className={clsx(IdentityButton)}>
            <Button
              disabled={isWorking}
              height="52px"
              className={FullWidthButtonStyle}
              buttonClassName={FullWidthButtonStyle}
              buttonId="local-practice"
              colorType={signedIn ? 'blue' : 'orange'}
              frameType="default"
              clickSound={null}
              hoverSound={null}
              onClick={onPractice}
              text={t('identityAuth.playPractice')}
            />
          </div>
        )}

        {signedIn && (
          <div className={IdentityButton}>
            <Button
              disabled={isWorking}
              height="52px"
              className={FullWidthButtonStyle}
              buttonClassName={FullWidthButtonStyle}
              buttonId="sign-out"
              colorType="default"
              frameType="default"
              clickSound={null}
              hoverSound={null}
              leftAdornment={isWorking ? { icon: 'spinner' } : undefined}
              onClick={signOut}
              text={t('identityAuth.signOut')}
            />
          </div>
        )}

        {!isWorking && !googleAvailable && !signedIn && (
          <div className={IdentityStatus} role="status">
            {t('identityAuth.notConfigured')}
          </div>
        )}
        {status && (
          <div className={IdentityStatus} role="alert">
            {status}
          </div>
        )}

        <Text color="white" marginTop="12px" fontSize="12px">
          {t('identityAuth.walletOptional')}
        </Text>
      </div>
    )
  }
)

GoogleIdentityActions.displayName = 'GoogleIdentityActions'
