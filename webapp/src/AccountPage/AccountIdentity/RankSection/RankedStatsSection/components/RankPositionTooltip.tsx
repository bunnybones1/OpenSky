import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/__deprecated__/Text'
import { FlexBox } from '~/shared/components/Base/FlexBox'

const RankPositionTooltip = memo(() => {
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
        <Text color="purple8">{t('tooltip.positionWithinRankedLineOne')}</Text>
        <Text color="purple8">{t('tooltip.positionWithinRankedLineTwo')}</Text>
      </FlexBox>
    </div>
  )
})

export default RankPositionTooltip

RankPositionTooltip.displayName = 'RankPositionTooltip'
