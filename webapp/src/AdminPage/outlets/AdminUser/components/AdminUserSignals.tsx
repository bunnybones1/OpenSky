import styled from '@emotion/styled'
import { memo, useState } from 'react'
import { useMount } from 'react-use'

import {
  AdminDetails,
  AdminDetailsContainer,
  AdminDetailsContent,
  AdminDetailsListItem
} from '~/AdminPage/outlets/shared/components/AdminDetails'
import AdminPlayerScore from '~/AdminPage/outlets/shared/components/AdminPlayerScore'
import {
  AdminCell,
  AdminHeaderRow,
  AdminRow,
  AdminTable
} from '~/AdminPage/outlets/shared/components/AdminTable'
import { formatTime, toTitleCase } from '~/AdminPage/outlets/shared/helpers'
import { AccountSignal, SignalStatus } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { Box, FlexBox } from '~/shared/components/Base'
import { Icon } from '~/shared/components/Icon/Icon'

const AdminUserSignals = memo(({ account }: { account: string }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signals, setSignals] = useState<AccountSignal[]>([])

  useMount(() => {
    // TODO: Remove async effect
    APIClient.opensky
      .gMListAccountSignals({ account })
      .then((res) => setSignals(res.signal))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  })

  if (error)
    return (
      <Container>
        <ErrorMessage>{error}</ErrorMessage>
      </Container>
    )

  if (loading)
    return (
      <Container>
        <Box p={32}>
          <Icon type="spinner" height="32px" color="purple9" />
        </Box>
      </Container>
    )

  if (!signals.length)
    return (
      <Container>
        <EmptyMessage>No Signals</EmptyMessage>
      </Container>
    )

  return (
    <Container>
      <AdminUserSignalsTable>
        <AdminUserSignalsHeaderRow>
          <AdminUserSignalsCell>Type</AdminUserSignalsCell>
          <AdminUserSignalsCell>Status</AdminUserSignalsCell>
          <AdminUserSignalsCell>Score</AdminUserSignalsCell>
          <AdminUserSignalsCell>Data</AdminUserSignalsCell>
          <AdminUserSignalsCell>Created</AdminUserSignalsCell>
          <AdminUserSignalsCell>Updated</AdminUserSignalsCell>
        </AdminUserSignalsHeaderRow>

        {signals.map((signal) => (
          <AdminUserSignalsRow key={signal.id}>
            <AdminUserSignalsCell>
              {toTitleCase(signal.signalType)}
            </AdminUserSignalsCell>
            <AdminUserSignalsCell>
              <Box color={statusColor(signal.signalStatus)}>
                {toTitleCase(signal.signalStatus.toLowerCase())}
              </Box>
            </AdminUserSignalsCell>
            <AdminUserSignalsCell>
              <AdminPlayerScore score={signal.score} />
            </AdminUserSignalsCell>
            <AdminUserSignalsCell>
              {parseSignalData(signal.signalData)}
            </AdminUserSignalsCell>
            <AdminUserSignalsCell>
              {formatTime(signal.createdAt)}
            </AdminUserSignalsCell>
            <AdminUserSignalsCell>
              {formatTime(signal.updatedAt)}
            </AdminUserSignalsCell>
          </AdminUserSignalsRow>
        ))}
      </AdminUserSignalsTable>
    </Container>
  )
})

const Container = ({ children }: { children: JSX.Element }) => {
  return (
    <AdminDetails>
      <AdminDetailsContent>
        <FlexBox justifyContent="space-between" alignItems="center">
          <Title>Signals</Title>
          {/* <Button width={150} height={32}>
            Clear Signals
          </Button> */}
        </FlexBox>
      </AdminDetailsContent>
      <AdminDetailsContainer>{children}</AdminDetailsContainer>
    </AdminDetails>
  )
}

const parseSignalData = (data: { [key: string]: string }) =>
  Object.keys(data).map((key) => (
    <AdminDetailsListItem key={key} title={toTitleCase(key)}>
      {JSON.stringify(data[key])}
    </AdminDetailsListItem>
  ))

const statusColor = (status: SignalStatus) => {
  switch (status) {
    case SignalStatus.ACTED_UPON:
      return 'forest4'
    case SignalStatus.NOT_ACTIONABLE:
      return 'inherit'
    case SignalStatus.PENDING:
      return 'warm6'
  }
}

export default AdminUserSignals

const Title = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.purple9};
`

const EmptyMessage = styled(Box)`
  padding: 32px;
  font-size: 20px;
  text-align: center;
  color: ${({ theme }) => theme.colors.forest4};
`

const ErrorMessage = styled(EmptyMessage)`
  color: ${({ theme }) => theme.colors.warm9};
`

const columns = '1fr 0.375fr 0.375fr 2fr 0.5fr 0.5fr'
const AdminUserSignalsTable = styled(AdminTable)`
  border: 0;
`
const AdminUserSignalsCell = styled(AdminCell)``
const AdminUserSignalsHeaderRow = styled(AdminHeaderRow)`
  grid-template-columns: ${columns};
`
const AdminUserSignalsRow = styled(AdminRow)`
  grid-template-columns: ${columns};

  &:last-child {
    border-bottom: 0;
  }
`

AdminUserSignals.displayName = 'AdminUserSignals'
