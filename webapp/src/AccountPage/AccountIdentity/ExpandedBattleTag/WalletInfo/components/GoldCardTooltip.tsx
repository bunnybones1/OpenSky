import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/__deprecated__/Text'
import env from '~/env'
import { Asset } from '~/shared/components/Asset'
import { FlexBox } from '~/shared/components/Base/FlexBox'

const GoldCardTooltip = memo(() => {
  const { t } = useTranslation()

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr',
        alignItems: 'center',
        columnGap: '10px',
        padding: '12px'
      }}
    >
      <Asset url="webapp/icons/gold-card-with-letter.webp">
        {({ result }) => (
          <img src={result} style={{ width: '40px', height: '40px' }} />
        )}
      </Asset>

      <FlexBox
        style={{
          flexDirection: 'column',
          fontWeight: 600,
          alignItems: 'flex-start'
        }}
      >
        <Text color="purple8">
          {t(
            env.AUTH_MODE === 'google'
              ? 'tooltip.goldCardsExplainerLineOneOffchain'
              : 'tooltip.goldCardsExplainerLineOne'
          )}
        </Text>
        <Text color="purple8">
          {t(
            env.AUTH_MODE === 'google'
              ? 'tooltip.goldCardsExplainerLineTwoOffchain'
              : 'tooltip.goldCardsExplainerLineTwo'
          )}
        </Text>
      </FlexBox>
    </div>
  )
})

export default GoldCardTooltip

GoldCardTooltip.displayName = 'GoldCardTooltip'
