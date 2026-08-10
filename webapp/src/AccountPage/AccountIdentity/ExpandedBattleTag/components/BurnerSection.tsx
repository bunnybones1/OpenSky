import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/components/Button'
import { Text } from '~/shared/components/Text'
import { CONVERT_TO_SEQUENCE_WALLET_DIALOG } from '~/shared/constants/ui'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

const { openDialog } = controlDialog(CONVERT_TO_SEQUENCE_WALLET_DIALOG)

export const BurnerSection = memo(() => {
  const { data: authedAccount } = useAuthedAccount()

  const { t } = useTranslation()

  if (!authedAccount?.isBurnerWallet) return null

  return (
    <div
      className={Sprinkles({
        width: 'full',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        backgroundColor: 'purple2',
        padding: { base: '12px', tabletWide: '20px' },
        borderBottom: '1px solid',
        borderColor: 'purple6'
      })}
    >
      <Button
        onClick={openDialog}
        colorType="blue"
        frameType="default"
        height="52px"
        className={Sprinkles({ paddingX: { base: '16px', tablet: '24px' } })}
        text={t('profile.protectAccount')}
      />
      <Text
        color="white"
        marginLeft="12px"
        fontWeight="500"
        fontSize={{ base: '14px', tabletWide: '16px' }}
      >
        {t('profile.protectNotice')}
      </Text>
    </div>
  )
})

BurnerSection.displayName = 'BurnerSection'
