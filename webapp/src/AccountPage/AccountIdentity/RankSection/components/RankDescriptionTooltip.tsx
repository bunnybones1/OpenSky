import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/__deprecated__/Text'
import { FlexBox } from '~/shared/components/Base/FlexBox'

const RankDescriptionTooltip = memo(() => {
  const { t } = useTranslation()

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        alignItems: 'center',
        columnGap: '10px',
        padding: '12px'
      }}
    >
      <FlexBox
        style={{
          flexDirection: 'column',
          fontWeight: 600,
          alignItems: 'flex-start'
        }}
      >
        <Text color="purple8">{t('tooltip.rankExplainerLineOne')}</Text>
        <Text color="purple8">{t('tooltip.rankExplainerLineTwo')}</Text>
        <Text color="purple8">{t('tooltip.rankExplainerLineThree')}</Text>
      </FlexBox>
    </div>
  )
})

export default RankDescriptionTooltip

RankDescriptionTooltip.displayName = 'RankDescriptionTooltip'
