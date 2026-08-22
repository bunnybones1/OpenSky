import styled from '@emotion/styled'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { TitleDetail } from '~/shared/components/TitleDetail'

const PendingGoldsHeader = memo(() => {
  const { t } = useTranslation()

  return (
    <StyledPlayerHeader
      width={'100%'}
      height={[44, 44, 44, 80]}
      borderBottom="1px solid"
      borderColor="purple7"
      bg="purple1"
      position="absolute"
      style={{
        left: '0px',
        top: '0px'
      }}
      zIndex={100}
      type="end-row"
    >
      <Box height="100%" width="100%" position="relative">
        <TitleDetail title={t('play.gameModes.CONQUEST.pendingGoldsOffchain')} />
      </Box>
    </StyledPlayerHeader>
  )
})

const StyledPlayerHeader = styled(FlexBox)`
  z-index: 10;
  ${(props) => props.theme.mediaQueries.mobile} {
    .titleDetailText {
      .sequence-platforms-text {
        font-size: 24px;
      }
      .conquest-exchange {
        font-size: 16px;
      }
    }
  }
`

export default PendingGoldsHeader

PendingGoldsHeader.displayName = 'PendingGoldsHeader'
