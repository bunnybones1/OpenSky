import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Text } from '~/__deprecated__/Text'
import { AuthenticationClient } from '~/shared/clients'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Button } from '~/shared/components/Button'
import { Portal } from '~/shared/components/Portal'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { authenticationState } from '~/shared/state/authentication-state'

const NetworkWarning = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()
  const { userAddress } = useSnapshot(authenticationState)

  const { data: authedAccount } = useAuthedAccount()

  if (!authedAccount || !userAddress) return null

  if (authedAccount.isBurnerWallet) return null

  if (
    !!AuthenticationClient.wallet &&
    AuthenticationClient.wallet.isConnected() &&
    AuthenticationClient.wallet.address
  ) {
    return null
  }

  if (!getAssetUrl) {
    return null
  }

  return (
    <Portal>
      <FlexBox
        position="fixed"
        type="centered-start-column"
        height="100%"
        width="100%"
        px={4}
        top={0}
        left={0}
        zIndex={14}
        style={{
          backgroundImage: `url('${getAssetUrl('webapp/backgrounds/clouds.webp')}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom'
        }}
      >
        <FlexBox
          position="fixed"
          top="50%"
          left="50%"
          zIndex={2}
          type="centered-column"
          style={{
            transform: 'translate(-50%, -50%)'
          }}
        >
          <Text
            fontSize={4}
            color="purple9"
            textWrap={true}
            textAlign="center"
            padding={3}
          >
            {t('shop.networkWarning')}
          </Text>
          <Button
            frameType="default"
            colorType="default"
            text={t('shop.changeNetwork')}
            onClick={() => {
              AuthenticationClient.wallet?.openWalletWindow('/settings/network')
            }}
          />
        </FlexBox>
      </FlexBox>
    </Portal>
  )
})

export default NetworkWarning

NetworkWarning.displayName = 'NetworkWarning'
