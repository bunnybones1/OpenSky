import styled from '@emotion/styled'

import { AdminDetailsContainer } from '~/AdminPage/outlets/shared/components/AdminDetails'
import { Box, FlexBox, Grid } from '~/shared/components/Base'

export const AdminTable = styled(Box)`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.purple6};
  background-color: ${({ theme }) => theme.colors.purple1};
  border-bottom: 0;
`

export const AdminRow = styled(Grid)`
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
  width: 100%;
  min-height: 62px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.purple6};
  line-height: 1.2;
`

export const AdminHeaderRow = styled(AdminRow)`
  div {
    border-right: 1px solid ${({ theme }) => theme.colors.purple6};

    &:last-child {
      border-right: 0;
    }
  }
`

export const AdminCell = styled(FlexBox)`
  padding: 8px 16px;
  justify-content: center;
  align-items: start;
  flex-direction: column;
  flex: 0;
  color: ${({ theme }) => theme.colors.purple9};

  small {
    font-size: 66%;
    color: ${({ theme }) => theme.colors.purple9};
  }

  a,
  a:visited {
    color: white;
  }
`

export const AdminTableEmptyContainer = styled(AdminDetailsContainer)`
  border-left: 0;
  border-right: 0;
`

export const AdminTableEmptyMessage = styled(Box)`
  padding: 64px 32px;
  font-size: 20px;
  text-align: center;
  color: ${({ theme }) => theme.colors.purple7};
`

export const AdminSortButton = styled.button`
  margin: 0;
  padding: 0;
  border: 0;
  width: 100%;
  height: 100%;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  font-weight: 600;
  background: transparent;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
`
