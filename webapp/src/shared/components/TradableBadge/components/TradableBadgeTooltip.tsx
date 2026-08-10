import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Theme } from '~/__deprecated__/style/Theme'
import { FlexBox } from '~/shared/components/Base'
import { Icon } from '~/shared/components/Icon/Icon'

const TradableBadgeTooltip = memo(() => {
  const { t } = useTranslation()

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '380px 1fr',
        padding: '12px',
        height: '100%'
      }}
    >
      <FlexBox
        type="start-row"
        flexWrap="nowrap"
        style={{
          alignItems: 'center'
        }}
      >
        <Icon type="tradable" height="32px" color="white" />
        <FlexBox type="start-column" flexWrap={'wrap'} width="95%">
          <span
            style={{
              color: Theme.colors.purple9,
              textAlign: 'left',
              marginLeft: '12px',
              lineHeight: ' 16px',
              fontSize: '14px'
            }}
          >
            {t('skypass.tradableTooltip')}
          </span>
        </FlexBox>
      </FlexBox>
    </div>
  )
})

TradableBadgeTooltip.displayName = 'TradableBadgeTooltip'

export default TradableBadgeTooltip
