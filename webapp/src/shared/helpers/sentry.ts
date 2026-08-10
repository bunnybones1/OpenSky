// import * as Sentry from '@sentry/browser'
import { i18n } from '@opensky/language-manager'

import env from '~/env'
import { isDefined } from '~/shared/helpers/is-defined-is-not-null'

import { AuthenticationClient } from '../clients'
import { showErrorDialog } from '../state/error-dialog-state'
import { addToast } from '../state/toast-state'
import { parseError } from './parse-error'

export const setUser = (address: string, name: string) => {
  // if (isDefined(Sentry.getCurrentHub().getClient())) {
  //   Sentry.configureScope((scope) => {
  //     scope.setUser({
  //       id: address,
  //       username: name
  //     })
  //   })
  // }
}

export const captureError = (
  error: any,
  key: string,
  errorNotification = true,
  sendToSentry = true
) => {
  // Detect how to parse error message
  const err = parseError(error)

  let errorText = i18n.t('notification.error')

  const onClickFn = () => {
    showErrorDialog({
      error: key,
      title: 'Error',
      errorDetails: err.message,
      errorStack: err.stack
    })
  }

  const onClickText = ''
  // Banned account catch
  if (
    err.message &&
    typeof err.message === 'string' &&
    err.message.includes('account banned')
  ) {
    key = ''
    errorText = i18n.t('support.accountBanned')
    sendToSentry = false
  }

  if (
    err.message &&
    typeof err.message === 'string' &&
    err.message.includes('flagged for deletion')
  ) {
    // Log the user out if they're flagged for deletion
    AuthenticationClient.logout()
    return
  }

  if (errorNotification) {
    addToast({
      text: errorText,
      secondaryText: key,
      icon: 'error',
      iconColor: 'warm9',
      isEvergreen: true,
      onClick: onClickFn,
      onClickText
    })
  }

  // if (isDefined(Sentry.getCurrentHub().getClient()) && sendToSentry) {
  //   Sentry.withScope((scope) => {
  //     scope.setFingerprint([key])
  //     scope.setExtra('raw_error', err)
  //     Sentry.captureException(new Error(key))
  //   })
  // } else {
    console.error(err)
  // }
}

export const uiBreadCrumb = (message: string) => {
  // if (isDefined(Sentry.getCurrentHub().getClient())) {
  //   Sentry.addBreadcrumb({
  //     category: 'ui',
  //     message,
  //     level: 'info',
  //     type: 'user'
  //   })
  // }
}

export type SentryReport = {
  comments: string
  dateCreated: string
  email: string
  name: string
  event_id: string
  user?: unknown
  issue?: unknown
  event?: Event
}

const post = async (endpoint: string, payload: any): Promise<Response> => {
  return await fetch(
    // eslint-disable-next-line max-len
    `https://sentry.io/api/0/projects/0xsequence/opensky-webapp${endpoint}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.SENTRY_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  )
}

export const captureFeedback = async (report: SentryReport): Promise<Response> => {
  const { comments, dateCreated, email, name, event_id } = report
  return await post('/user-feedback/', {
    comments,
    dateCreated,
    email,
    name,
    event_id
  })
}
