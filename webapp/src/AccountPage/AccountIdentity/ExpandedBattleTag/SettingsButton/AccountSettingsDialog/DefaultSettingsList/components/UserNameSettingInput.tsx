import styled from '@emotion/styled'
import debounce from 'lodash-es/debounce'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUnmount } from 'react-use'

import { Input, InputProps } from '~/__deprecated__/Input/Input'
import { Box, FlexBox, Text } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import {
  getUsernameError,
  USERNAME_INVALIDATION_REGEXP
} from '~/shared/helpers/account/username-validation'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useUpdatedAuthedAccount } from '~/shared/mutations/useUpdateAuthedAccount'

const SpinnerIcon = { icon: 'spinner' } as const
const SaveIcon = { icon: 'check' } as const

export const UserNameSettingInput = memo(() => {
  const { t } = useTranslation()
  const { data: authedAccount } = useAuthedAccount()
  const [userNameError, setUserNameError] = useState<string | undefined>(undefined)
  const [userName, setUserName] = useState(authedAccount?.name || '')

  useEffect(() => {
    if (!!authedAccount?.name) {
      setUserName((name) => (!!name ? name : authedAccount.name))
    }
  }, [authedAccount?.name])

  const validateUserName = useCallback((newUserName: string) => {
    const userNameError = getUsernameError(newUserName)

    if (!!userNameError) {
      setUserNameError(userNameError)
    }
  }, [])

  const debouncedValidateUserName = useMemo(
    () => debounce(validateUserName, 400),
    [validateUserName]
  )

  const handleKeyDown: InputProps['onKeyDown'] = useCallback((e) => {
    if (USERNAME_INVALIDATION_REGEXP.test(e.key)) {
      e.preventDefault()
    }
  }, [])

  const handleClearUsername = useCallback(() => {
    setUserNameError(undefined)
    setUserName('')
  }, [])

  const handleChange: InputProps['onChange'] = useCallback(
    ({ target: { value: newUserName } }) => {
      setUserNameError(undefined)
      setUserName(newUserName)
      debouncedValidateUserName(newUserName)
    },
    [debouncedValidateUserName]
  )

  useUnmount(() => {
    debouncedValidateUserName.cancel()
  })

  const updateAuthedAccount = useUpdatedAuthedAccount()

  const onSave = useCallback(async () => {
    try {
      await updateAuthedAccount.mutateAsync({
        name: userName
      })
    } catch (error) {
      if (error.message.includes('already_exists')) {
        setUserNameError(t('support.usernameIsTaken'))
      }
    }
  }, [updateAuthedAccount, userName, t])

  return (
    <FlexBox width="100%" type="centered-column" pt={32}>
      <Text pb={10} fontSize={18} color="purple9" fontWeight="bold">
        {t('general.ACCOUNT')}
      </Text>
      <FlexBox type="centered-row" height={36} width="100%">
        <Box width={282} height="100%" marginRight="8px">
          <UserNameInputWrapper width="100%" height="100%">
            <Input
              rounded={true}
              onChange={handleChange}
              isErrored={!!userNameError}
              toolTip={userNameError}
              label={t('profile.usernameLabel')}
              onKeyDown={handleKeyDown}
              value={userName}
              onClear={handleClearUsername}
              height="100%"
              className="userNameInput"
              toolTipDirection="bottom"
            />
          </UserNameInputWrapper>
        </Box>
        <Button
          text={t('general.save')}
          leftAdornment={updateAuthedAccount.isLoading ? SpinnerIcon : SaveIcon}
          frameType="default"
          colorType="blue"
          onClick={onSave}
          disabled={
            updateAuthedAccount.isLoading ||
            userName === authedAccount?.name ||
            !!userNameError
          }
        />
      </FlexBox>
    </FlexBox>
  )
})

const UserNameInputWrapper = styled(FlexBox)`
  .userNameInput {
    background-image: linear-gradient(
      to bottom,
      ${(props) => props.theme.colors.black},
      #261747
    );
  }
`

UserNameSettingInput.displayName = 'UserNameSettingInput'
