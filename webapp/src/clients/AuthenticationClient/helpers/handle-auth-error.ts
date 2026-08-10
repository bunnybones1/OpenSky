import { i18n } from '@opensky/language-manager'
import { SEQUENCE_JWT_KEY, SKYWEAVER_JWT_KEY } from '@opensky/shared/constants'

import { APIClient } from '~/shared/clients'
import { captureError } from '~/shared/helpers/sentry'
import { addToast } from '~/shared/state/toast-state'

import { getJWTs } from './get-set-jwts'
import { isJWTExpired } from './is-jwt-expired'

export const handleAuthError = (err: any) => {
  const errorLike = (error: Error, content: string) => {
    return (
      error.message.toLowerCase().includes(content.toLowerCase()) ||
      error.name.toLowerCase().includes(content.toLowerCase())
    )
  }

  if (err instanceof Error) {
    const { jwt } = getJWTs()
    if (
      (errorLike(err, 'session expired') && !!jwt && isJWTExpired(jwt)) ||
      errorLike(err, 'connect first') ||
      errorLike(err, 'address mismatch') ||
      errorLike(err, 'webrpc unauthenticated error')
    ) {
      APIClient.sequence.jwtAuth = ''
      APIClient.opensky.authToken = ''

      window.localStorage.removeItem(SEQUENCE_JWT_KEY)
      window.localStorage.removeItem(SKYWEAVER_JWT_KEY)

      addToast({
        text: i18n.t('webapp:support.sessionExpired'),
        secondaryText: i18n.t('webapp:support.pleaseLogInAgain'),
        icon: 'error',
        iconColor: 'warm9',
        duration: 5
      })

      // Silence connect first error
      if (!errorLike(err, 'connect first') && !errorLike(err, 'get address error')) {
        captureError(err, 'Auth Error')
      }
    } else {
      captureError(err, 'Auth Failed')
    }
  }
}
