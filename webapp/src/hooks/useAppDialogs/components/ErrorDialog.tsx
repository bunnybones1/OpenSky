import clsx from 'clsx'
import { noop } from 'lodash-es'
import { memo, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Button } from '~/shared/components/Button'
import { Input } from '~/shared/components/Input/Input'
import { Text } from '~/shared/components/Text'
import { captureFeedback, SentryReport } from '~/shared/helpers/sentry'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useErrorIcon } from '~/shared/hooks/useErrorIcon'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { authenticationState } from '~/shared/state/authentication-state'
import {
  ERROR_DIALOG_ID,
  errorDialogState,
  resetErrorDialogState
} from '~/shared/state/error-dialog-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ButtonRow, ErrorIcon, ErrorStack, Wrapper } from './ErrorDialog.css'

const { closeDialog } = controlDialog(ERROR_DIALOG_ID)

const FontSize = { base: '14px', tablet: '16px' } as const

export const ErrorDialog = memo(() => {
  const { title, error, errorDetails, errorStack } = useSnapshot(errorDialogState)
  const { sentryId } = useSnapshot(authenticationState)
  const { getAssetUrl } = useGetAssetContext()
  const errorIcon = useErrorIcon()
  const [sentryComment, setSentryComment] = useState('')
  const { data: authedAccount } = useAuthedAccount()
  const { t } = useTranslation()

  const sendFeedback = async () => {
    if (!authenticationState.sentryId) return

    //#TODO: Do we store email or should I get it from the user?
    const report: SentryReport = {
      email: 'testemail@gmail.com',
      comments: sentryComment,
      dateCreated: new Date().toString(),
      name: !authedAccount ? t('generic.guest') : authedAccount.name,
      event_id: authenticationState.sentryId
    }

    await captureFeedback(report)

    closeDialog()

    return
  }

  useEffect(() => {
    const dialog = document.getElementById(ERROR_DIALOG_ID) as HTMLDialogElement

    const handleClose = () => {
      resetErrorDialogState()
    }

    if (!!dialog) {
      dialog.addEventListener('close', handleClose)
    }

    return () => {
      if (!!dialog) {
        dialog.removeEventListener('close', handleClose)
      }
    }
  }, [])

  const handleSentryInputChange = useCallback((comment: string) => {
    setSentryComment(comment)
  }, [])

  return (
    <div
      className={clsx(
        Sprinkles({
          overflow: 'auto',
          backgroundColor: 'purple3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          paddingTop: { base: '16px', tablet: '24px' },
          flexWrap: 'nowrap',
          position: 'relative'
        }),
        Wrapper
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            paddingX: { base: '16px', tablet: '32px' },
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-start',
            paddingBottom: '8px'
          })
        )}
      >
        {!!getAssetUrl && <img src={getAssetUrl(errorIcon)} className={ErrorIcon} />}
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-start',
            flexDirection: 'column',
            paddingLeft: '12px'
          })}
        >
          <div
            className={Sprinkles({
              width: 'full',
              color: 'warm7',
              fontSize: '26px',
              fontFamily: 'condensed',
              fontWeight: '600'
            })}
          >
            {title || t('sentry.oops')}
          </div>
        </div>
      </div>

      <div
        className={Sprinkles({
          display: 'flex',
          width: 'full',
          paddingTop: '16px',
          backgroundColor: 'purple1',
          paddingX: '16px',
          paddingBottom: { base: '16px', tablet: '24px' },
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start'
        })}
      >
        <div
          className={Sprinkles({
            width: 'full',
            marginX: '8px',
            marginY: '4px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start'
          })}
        >
          <Text
            fontSize={FontSize}
            fontFamily="condensed"
            color="warm8"
            marginBottom="4px"
          >
            {error && <>{error}</>}
            {errorDetails && <>: {errorDetails}</>}
          </Text>
        </div>

        {errorStack && (
          <textarea
            className={clsx(
              Sprinkles({
                width: 'full',
                marginBottom: '8px',
                border: '1px solid',
                borderColor: 'warm3',
                color: 'white',
                fontFamily: 'condensed',
                padding: '12px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                fontSize: '16px',
                fontWeight: '500'
              }),
              ErrorStack
            )}
            disabled
          >
            {errorStack}
          </textarea>
        )}
        <div
          className={Sprinkles({
            display: 'flex',
            width: 'full',
            marginBottom: '8px'
          })}
        >
          <div
            className={Sprinkles({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            })}
          >
            <Text
              fontSize={FontSize}
              fontFamily="condensed"
              color="white"
              marginRight="4px"
            >
              {t('sentry.feedback')}
            </Text>
          </div>
        </div>
        <div className={Sprinkles({ width: 'full', display: 'flex' })}>
          <Input
            onChange={handleSentryInputChange}
            placeholder={t('sentry.placeholder')}
            value={sentryComment}
            formClassName={Sprinkles({ width: 'full' })}
          />
        </div>

        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingX: '12px'
            }),
            ButtonRow
          )}
        >
          <div
            className={Sprinkles({
              width: 'full',
              marginX: '8px',
              marginY: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start'
            })}
          >
            <Text fontSize={FontSize} fontFamily="condensed" color="warm7">
              {sentryId ? `Event ID: ${sentryId}` : 'No Sentry Id'}
            </Text>
          </div>

          <Button
            height="36px"
            disabled={!sentryId || sentryComment === ''}
            onClick={!sentryId || sentryComment !== '' ? sendFeedback : noop}
            text={t('sentry.submit')}
            colorType="default"
            frameType="default"
          />
        </div>
      </div>
    </div>
  )
})

ErrorDialog.displayName = 'ErrorDialog'
