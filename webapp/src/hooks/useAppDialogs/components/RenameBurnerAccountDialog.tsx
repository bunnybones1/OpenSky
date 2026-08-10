import clsx from 'clsx'
import { debounce } from 'lodash-es'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUnmount } from 'react-use'

import { APIClient } from '~/shared/clients'
import { Button } from '~/shared/components/Button'
import { Input, InputProps } from '~/shared/components/Input/Input'
import { RENAME_BURNER_ACCOUNT_ID } from '~/shared/constants/ui'
import {
  getUsernameError,
  USERNAME_INVALIDATION_REGEXP
} from '~/shared/helpers/account/username-validation'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useUpdatedAuthedAccount } from '~/shared/mutations/useUpdateAuthedAccount'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  BannerImage,
  RenameBurnerAccountDialogStyle
} from './RenameBurnerAccountDialog.css'

const { closeDialog } = controlDialog(RENAME_BURNER_ACCOUNT_ID)

export const RenameBurnerAccountDialog = memo(() => {
  const [username, setUserName] = useState('')
  const [userNameError, setUserNameError] = useState<string | undefined>(undefined)
  const [isValidating, setIsValidating] = useState(false)
  const isTablet = useResponsiveQuery('tablet')
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()
  const updateAuthedAccount = useUpdatedAuthedAccount()

  const validateUserName = useCallback(
    (newUserName: string) => {
      const userNameError = getUsernameError(newUserName)

      if (!!userNameError) {
        setUserNameError(userNameError)
        setIsValidating(false)
      } else {
        setIsValidating(true)
        APIClient.opensky
          .accountExistsByName({ name: newUserName })
          .then((res) => {
            if (res.exists || res.pending_migration) {
              setUserNameError(t('account.usernameAlreadyMigratedWarning'))
            }
            setIsValidating(false)
          })
          .catch(() => setIsValidating(false))
      }
    },
    [t]
  )

  const debouncedValidateUserName = useMemo(
    () => debounce(validateUserName, 400),
    [validateUserName]
  )

  const onKeyDown: InputProps['onKeyDown'] = useCallback((e) => {
    if (USERNAME_INVALIDATION_REGEXP.test(e.key)) {
      e.preventDefault()
    }
  }, [])

  const onClear = useCallback(() => {
    setUserNameError(undefined)
    setUserName('')
  }, [])

  const onChange = useCallback(
    (newName: string) => {
      setIsValidating(true)
      setUserNameError(undefined)
      setUserName(newName)
      debouncedValidateUserName(newName)
    },
    [debouncedValidateUserName]
  )

  const onClick = useCallback(() => {
    updateAuthedAccount.mutate({ name: username })
    closeDialog()
  }, [updateAuthedAccount, username])

  useUnmount(() => {
    debouncedValidateUserName.cancel()
  })

  return (
    <div
      className={clsx(
        RenameBurnerAccountDialogStyle,
        Sprinkles({
          display: 'flex',
          alignItems: 'flex-start',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          overflow: 'auto'
        })
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            overflow: 'hidden',
            borderBottom: '1px solid',
            borderColor: 'purple8',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }),
          BannerImage
        )}
      >
        {!!getAssetUrl && (
          <img
            src={getAssetUrl('webapp/backgrounds/rename-burner-bg.webp')}
            className={Sprinkles({ height: 'full' })}
          />
        )}
      </div>
      <div
        className={Sprinkles({
          width: 'full',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          paddingX: { base: '24px', tablet: '36px' },
          paddingTop: { base: '24px', tablet: '32px' },
          paddingBottom: { base: '24px', tablet: '36px' }
        })}
      >
        <div
          className={Sprinkles({
            fontSize: { base: '18px', tablet: '22px' },
            fontWeight: '600',
            color: 'white',
            marginBottom: '4px',
            textAlign: 'center',
            width: 'full'
          })}
        >
          {t('account.renameAccountSubTitle')}
        </div>
        <div
          className={Sprinkles({
            fontSize: { base: '26px', tablet: '36px' },
            fontWeight: '600',
            color: 'white',
            marginTop: '4px',
            fontFamily: 'condensed',
            marginBottom: { base: '20px', tablet: '36px' },
            width: 'full',
            textAlign: 'center'
          })}
        >
          {t('account.renameAccountTitle')}
        </div>
        <div
          className={Sprinkles({
            width: 'full',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: { base: '16px', tablet: '32px' }
          })}
        >
          <Input
            placeholder={t('account.renameAccountPlaceholder')}
            value={username}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onClear={onClear}
            errorMessage={userNameError}
          />
        </div>
        <Button
          height={isTablet ? '52px' : '36px'}
          frameType="default"
          colorType="blue"
          disabled={!!userNameError || !username || isValidating}
          text={isValidating ? t('generic.Validating') : t('general.Confirm')}
          buttonClassName={Sprinkles({ paddingX: '16px' })}
          onClick={onClick}
        />
      </div>
    </div>
  )
})

RenameBurnerAccountDialog.displayName = 'RenameBurnerAccountDialog'
