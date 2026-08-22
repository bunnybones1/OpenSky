import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ItemCardDetailsControlsStyle } from './ItemsCardDetailsControls.css'

export const IdentityItemsCardDetailsControls = memo(() => {
  const { t } = useTranslation()

  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          width: 'full'
        }),
        ItemCardDetailsControlsStyle
      )}
    >
      <Icon type="info-empty" height="16px" color="purple9" />
      <Text marginLeft="8px" fontSize="16px" color="purple9">
        {t('cardDetails.offchainInventory')}
      </Text>
    </div>
  )
})

IdentityItemsCardDetailsControls.displayName = 'IdentityItemsCardDetailsControls'
