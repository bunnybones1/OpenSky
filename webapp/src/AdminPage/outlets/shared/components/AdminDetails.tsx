import styled from '@emotion/styled'
import * as React from 'react'

import { Box, FlexBox } from '~/shared/components/Base'

type AdminDetailMode = 'success' | 'warning' | 'danger'

type AdminDetailsProps = React.HTMLAttributes<HTMLDivElement>
interface AdminDetailProps extends AdminDetailsProps {
  title: string
  mode?: AdminDetailMode
}

export const AdminDetails = ({ children }: AdminDetailsProps) => {
  return (
    <FlexBox type="start-column" width="100%">
      {children}
    </FlexBox>
  )
}

export const AdminDetailsContent = ({ children }: AdminDetailsProps) => (
  <Box
    width="100%"
    p={16}
    backgroundColor="purple2"
    border="1px solid"
    borderColor="purple6"
  >
    {children}
  </Box>
)

export const AdminDetailsList = ({ children }: AdminDetailsProps) => (
  <FlexBox
    width="100%"
    p={16}
    backgroundColor="purple1"
    border="1px solid"
    borderTop={0}
    borderColor="purple6"
    style={{ gap: 64 }}
  >
    {children}
  </FlexBox>
)

export const AdminDetailsContainer = ({ children, className }: AdminDetailsProps) => (
  <Box
    width="100%"
    backgroundColor="purple1"
    border="1px solid"
    borderTop={0}
    borderColor="purple6"
    className={className}
  >
    {children}
  </Box>
)

export const AdminDetailsListItem = ({ title, mode, children }: AdminDetailProps) => {
  return (
    <FlexBox type="start-column" style={{ gap: 8 }}>
      <AdminDetailTitle mode={mode}>{title}</AdminDetailTitle>
      {children}
    </FlexBox>
  )
}

const AdminDetailTitle = styled.h2<{ mode?: AdminDetailMode }>`
  margin: 0;
  font-size: 100%;
  font-weight: bold;
  display: inline-block;
  color: ${({ theme, mode }) => theme.colors[colorByMode(mode)]};
`

function colorByMode(mode?: AdminDetailMode) {
  switch (mode) {
    case 'danger':
      return 'warm9'
    case 'success':
      return 'forest4'
    case 'warning':
      return 'warm6'
    default:
      return 'purple9'
  }
}
