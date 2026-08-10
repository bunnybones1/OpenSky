import { useQueryClient } from '@tanstack/react-query'
import { memo, useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Input, InputProps } from '~/__deprecated__/Input/Input'
import { Account } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { Box, FlexBox, Text } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import { getUseAccountKey } from '~/shared/constants/react-query-keys'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'

import { ConfirmInvitedByDialog } from './components/ConfirmInvitedByDialog'
import { CONFIRM_INVITED_BY_DIALOG_ID } from './shared/constants'

export const InvitedByInput = memo(() => {
  const valueRef = useRef('')
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [address, setAddress] = useState<string | undefined>(undefined)
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const onClose = useCallback(() => {
    valueRef.current = ''
    setAddress(undefined)
    setIsLoading(false)
    setValue('')
    setError(undefined)
  }, [])

  const { Dialog, openDialog } = useDialog({
    Element: ConfirmInvitedByDialog,
    isCloseButtonDisabled: true,
    isClickoffDisabled: true,
    id: CONFIRM_INVITED_BY_DIALOG_ID,
    address,
    onClose
  })

  const onAddressChange: Required<InputProps>['onChange'] = useCallback((e) => {
    setError(undefined)
    if (valueRef.current !== e.target.value) {
      valueRef.current = e.target.value
      setValue(e.target.value)
    }
  }, [])

  const onSubmit = useCallback(async () => {
    try {
      if (!valueRef.current) return

      setIsLoading(true)

      const { account } = await APIClient.opensky.getAccount({
        address: valueRef.current
      })

      queryClient.setQueryData<Account | undefined>(
        getUseAccountKey(account.address),
        account
      )

      setAddress(account.address)

      openDialog()

      setIsLoading(false)
    } catch (error) {
      setIsLoading(false)
      setError('Unable to find that account')
    }
  }, [queryClient, openDialog])

  return (
    <>
      <Text
        fontFamily="condensed"
        fontWeight="bold"
        fontSize={18}
        lineHeight="21.6px"
        color="purple9"
        mb={12}
      >
        {t('inviteFriends.invitedByHeader')}
      </Text>
      <FlexBox alignItems="center" justifyContent="flex-start">
        <Box width="224px" mr={10}>
          <Input
            rounded={true}
            value={value}
            height={36}
            onChange={onAddressChange}
            placeholder={t('generic.walletAddress')}
            isErrored={!!error}
            toolTip={error}
          />
        </Box>
        <Button
          frameType="default"
          colorType="default"
          text={isLoading ? undefined : t('general.Confirm')}
          leftAdornment={{ icon: isLoading ? 'spinner' : undefined }}
          onClick={onSubmit}
          disabled={!value || !!error}
        />
      </FlexBox>
      <Text
        fontWeight="medium"
        fontSize={14}
        lineHeight="18px"
        mt={12}
        color="white"
        dangerouslySetInnerHTML={{
          __html: t('inviteFriends.invitedByBody')
        }}
      />
      <Text fontWeight="medium" fontSize={12} lineHeight="16px" color="purple8">
        {t('inviteFriends.invitedByFooter')}
      </Text>
      {Dialog}
    </>
  )
})

InvitedByInput.displayName = 'InvitedByInput'
