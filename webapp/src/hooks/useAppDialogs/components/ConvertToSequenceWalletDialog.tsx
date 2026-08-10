import clsx from 'clsx'
import { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'

import { AuthenticationClient } from '~/shared/clients'
import { PromptDialog } from '~/shared/components/PromptDialog/PromptDialog'
import { Text } from '~/shared/components/Text'
import { CONVERT_TO_SEQUENCE_WALLET_DIALOG } from '~/shared/constants/ui'
import { setItem } from '~/shared/helpers/local-storage'
import { makeAccountRoute } from '~/shared/helpers/routes/general'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useDispatch } from '~/shared/redux/index'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ConvertToSequenceDesc } from './ConvertToSequenceWalletDialog.css'

const { closeDialog } = controlDialog(CONVERT_TO_SEQUENCE_WALLET_DIALOG)

export const ConvertToSequenceWalletDialog = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const [isLoading, setIsLoading] = useState(false)
  const isTabletWide = useResponsiveQuery('tabletWide')
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const onConfirm = useCallback(async () => {
    setIsLoading(true)
    const newAddress = await AuthenticationClient.convertBurnerToSequence()
    setIsLoading(false)
    const nowString = new Date(Date.now()).toISOString()
    setItem('lastSeenConversionDialog', nowString)

    if (window.location.pathname.includes('/account/') && !!newAddress) {
      dispatch(push(makeAccountRoute(newAddress)))
    }

    closeDialog()
  }, [dispatch])

  const onDismiss = useCallback(() => {
    const nowString = new Date(Date.now()).toISOString()
    setItem('lastSeenConversionDialog', nowString)
    closeDialog()
  }, [])

  return (
    <PromptDialog
      onDismiss={onDismiss}
      onConfirm={onConfirm}
      confirmColor="blue"
      dismissColor="red"
      dismissText="Maybe Later"
      isConfirmDisabled={isLoading}
      isDismissDisabled={isLoading}
      isConfirmLoading={isLoading}
      confirmText={isLoading ? 'Converting' : 'Sign In'}
      buttonHeight={isTabletWide ? '52px' : '36px'}
      imageUrl={
        !!getAssetUrl
          ? getAssetUrl('webapp/backgrounds/sequence-convert-bg.webp')
          : undefined
      }
    >
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            paddingY: { base: '24px', tabletWide: '32px' },
            paddingX: { base: '24px', tabletWide: '36px' }
          })
        )}
      >
        <Text
          marginBottom="16px"
          color="white"
          fontFamily="condensed"
          fontSize={{ base: '26px', tabletWide: '36px' }}
        >
          {t('profile.protectAccount')}
        </Text>
        <Text
          className={ConvertToSequenceDesc}
          fontSize={{ base: '16px', tabletWide: '22px' }}
          color="purple11"
        >
          {t('profile.protectAccountDesc')}
        </Text>
      </div>
    </PromptDialog>
  )
})

ConvertToSequenceWalletDialog.displayName = 'ConvertToSequenceWalletDialog'
