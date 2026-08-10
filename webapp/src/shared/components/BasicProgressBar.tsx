import styled from '@emotion/styled'
import { memo } from 'react'

import { Text } from '~/shared/components/Base'

export const BasicProgressBar = memo(
  ({ value, maxWidth = '394px' }: { value: string; maxWidth?: string }) => (
    <ProgressBarContainer style={{ maxWidth }}>
      <span style={{ width: value }} />
      <Text color="purple9" fontSize={12}>
        {value}
      </Text>
    </ProgressBarContainer>
  )
)

BasicProgressBar.displayName = 'BasicProgressBar'

const ProgressBarContainer = styled.div`
  height: 6px;
  width: 100%;
  background-color: rgb(74, 63, 119);
  position: relative;
  margin-bottom: 20px;

  > span {
    display: block;
    background-color: rgb(95, 213, 249);
    height: 100%;
  }

  > div {
    position: absolute;
    right: -38px;
    top: -5px;
  }
`
