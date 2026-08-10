import styled from '@emotion/styled'
import { memo } from 'react'
import { Link } from 'react-router-dom'

import Checkbox from '~/__deprecated__/Checkbox'
import Select from '~/__deprecated__/Select/Select'
import AdminPlayerScore from '~/AdminPage/outlets/shared/components/AdminPlayerScore'
import {
  AdminCell,
  AdminHeaderRow,
  AdminRow,
  AdminSortButton,
  AdminTable,
  AdminTableEmptyContainer,
  AdminTableEmptyMessage
} from '~/AdminPage/outlets/shared/components/AdminTable'
import AdminUserSearch from '~/AdminPage/outlets/shared/components/AdminUserSearch'
import {
  formatRegion,
  formatTime,
  trimAddress
} from '~/AdminPage/outlets/shared/helpers'
import { Box, FlexBox } from '~/shared/components/Base'
import { Icon } from '~/shared/components/Icon/Icon'
import Pagination from '~/shared/components/Pagination'
import { CursorPage } from '~/shared/constants/misc'
import { makeAdminUserRoute } from '~/shared/helpers/routes/general'

import {
  AdminDetails,
  AdminDetailsContainer,
  AdminDetailsContent
} from '../shared/components/AdminDetails'
import AdminAccountActions from './components/AdminAccountActions'
import useSignals, { SignalStatusFilter } from './hooks/useSignals'

const AdminSignals = memo(() => {
  const { signals, loading, error, pagination, fetchSignals } = useSignals()

  const SortIcon = () => (
    <Icon
      type={pagination.sortOrder === 'ASC' ? 'caret-up' : 'caret-down'}
      color="purple7"
      height="16px"
    />
  )

  const handlePageChange = (navTo: CursorPage) => {
    fetchSignals(navTo)
  }

  const hasAfter =
    pagination.page && pagination.page.hasAfter ? pagination.page.hasAfter : false

  const hasBefore =
    pagination.page && pagination.page.hasBefore ? pagination.page.hasBefore : false

  return (
    <FlexBox type="start-column" style={{ gap: 32 }}>
      <AdminDetails>
        <AdminDetailsContent>
          <FlexBox justifyContent="space-between" alignItems="center" pr={8}>
            <AdminUserSearch />
            <Box width={360}>
              <Select
                options={[
                  {
                    value: 'hour',
                    selected: pagination.filter.date.filterDate === 'hour',
                    label: 'Account Created: Last Hour'
                  },
                  {
                    value: 'day',
                    selected: pagination.filter.date.filterDate === 'day',
                    label: 'Account Created: Last Day'
                  },
                  {
                    value: 'week',
                    selected: pagination.filter.date.filterDate === 'week',
                    label: 'Account Created: Last Week'
                  },
                  {
                    value: 'month',
                    selected: pagination.filter.date.filterDate === 'month',
                    label: 'Account Created: Last Month'
                  },
                  {
                    value: 'year',
                    selected: pagination.filter.date.filterDate === 'year',
                    label: 'Account Created: Last Year'
                  },
                  {
                    value: 'all',
                    selected: pagination.filter.date.filterDate === 'all',
                    label: 'Account Created: All Time'
                  }
                ]}
                onChange={pagination.filter.date.setFilterDate}
                placeholder=""
                clearable={false}
                maxListHeight={220}
              />
            </Box>
            <AdminSignalsFilter status={pagination.filter.status} />
          </FlexBox>
        </AdminDetailsContent>
      </AdminDetails>

      <Container loading={loading}>
        <AdminSignalsTable>
          {error && !loading && (
            <AdminTableEmptyContainer>
              <AdminTableEmptyMessage>
                <FlexBox flexDirection="column" style={{ gap: 16 }}>
                  <Box>No results for the following filters:</Box>
                  <Box>Date Range: Last {pagination.filter.date.filterDate}</Box>
                  {pagination.filter.status.statusActive && <Box>Active</Box>}
                  {pagination.filter.status.statusSuspended && <Box>Suspended</Box>}
                  {pagination.filter.status.statusBanned && <Box>Banned</Box>}
                  {pagination.filter.status.statusFlagged && <Box>Flagged</Box>}
                  {pagination.filter.status.statusVIP && <Box>VIP</Box>}
                  <Box color="warm9">{error}</Box>
                </FlexBox>
              </AdminTableEmptyMessage>
            </AdminTableEmptyContainer>
          )}
          {!error && (
            <>
              <AdminSignalsHeaderRow>
                <AdminSignalsCell>Player</AdminSignalsCell>
                <AdminSignalsCell>
                  <AdminSortButton onClick={pagination.toggleSortScore}>
                    Score
                    {pagination.isSortScore && <SortIcon />}
                  </AdminSortButton>
                </AdminSignalsCell>
                <AdminSignalsCell>Banned</AdminSignalsCell>
                <AdminSignalsCell>Account Level</AdminSignalsCell>
                <AdminSignalsCell>Account Region</AdminSignalsCell>
                <AdminSignalsCell>
                  <AdminSortButton onClick={pagination.toggleSortCreated}>
                    Account Created
                    {pagination.isSortCreated && <SortIcon />}
                  </AdminSortButton>
                </AdminSignalsCell>
                <AdminSignalsCell>
                  <AdminSortButton onClick={pagination.toggleSortUpdated}>
                    Last Updated
                    {pagination.isSortUpdated && <SortIcon />}
                  </AdminSortButton>
                </AdminSignalsCell>
              </AdminSignalsHeaderRow>

              {signals.map((signal, i) => (
                <AdminSignalsRow key={i}>
                  <AdminSignalsCell>
                    <Link to={makeAdminUserRoute(signal.accountAddress)}>
                      <p>{signal.account?.name}</p>
                      <small>{trimAddress(signal.accountAddress)}</small>
                    </Link>
                  </AdminSignalsCell>
                  <AdminSignalsCell>
                    <AdminPlayerScore score={signal.score} />
                  </AdminSignalsCell>
                  <AdminSignalsCell>
                    <AdminAccountActions actions={signal.accountActions} />
                  </AdminSignalsCell>
                  <AdminSignalsCell>{signal.account?.level}</AdminSignalsCell>
                  <AdminSignalsCell>
                    {formatRegion(signal.account?.region)}
                  </AdminSignalsCell>
                  <AdminSignalsCell>
                    {formatTime(signal.account?.createdAt)}
                  </AdminSignalsCell>
                  <AdminSignalsCell>{formatTime(signal.updatedAt)}</AdminSignalsCell>
                </AdminSignalsRow>
              ))}
            </>
          )}
        </AdminSignalsTable>
      </Container>

      <FlexBox
        position="relative"
        width="100%"
        style={{
          placeContent: 'center',
          pointerEvents: loading ? 'none' : 'all',
          opacity: loading ? 0.5 : 1,
          transition: 'opacity 0.2s ease-in-out'
        }}
      >
        <Pagination
          onPageChange={handlePageChange}
          hasAfter={hasAfter}
          hasBefore={hasBefore}
        />
      </FlexBox>
    </FlexBox>
  )
})

type ContainerProps = {
  children: JSX.Element
  loading: boolean
}

const Container = ({ children, loading }: ContainerProps) => {
  return (
    <AdminDetails>
      <AdminDetailsContent>
        <FlexBox justifyContent="space-between" alignItems="center" pr={8}>
          <SubTitle>Signals</SubTitle>
          {loading && <Icon type="spinner" height="24px" color="purple7" />}
        </FlexBox>
      </AdminDetailsContent>

      <AdminDetailsContainer>{children}</AdminDetailsContainer>
    </AdminDetails>
  )
}

const AdminSignalsFilter = ({ status }: { status: SignalStatusFilter }) => {
  return (
    <FlexBox style={{ gap: 16 }}>
      <FlexBox alignItems="center" style={{ gap: 8 }}>
        <Checkbox checked={status.statusActive} onClick={status.toggleStatusActive} />
        Active
      </FlexBox>
      <FlexBox alignItems="center" style={{ gap: 8 }}>
        <Checkbox
          checked={status.statusSuspended}
          onClick={status.toggleStatusSuspended}
        />
        Suspended
      </FlexBox>
      <FlexBox alignItems="center" style={{ gap: 8 }}>
        <Checkbox checked={status.statusBanned} onClick={status.toggleStatusBanned} />
        Banned
      </FlexBox>
      <FlexBox alignItems="center" style={{ gap: 8 }}>
        <Checkbox
          checked={status.statusFlagged}
          onClick={status.toggleStatusFlagged}
        />
        Flagged
      </FlexBox>
      <FlexBox alignItems="center" style={{ gap: 8 }}>
        <Checkbox checked={status.statusVIP} onClick={status.toggleStatusVIP} />
        VIP
      </FlexBox>
    </FlexBox>
  )
}

const columns = '2fr 0.66fr 0.66fr 0.66fr 1fr 1.33fr 1.33fr'
const AdminSignalsTable = styled(AdminTable)`
  border: 0;
`
const AdminSignalsCell = styled(AdminCell)``
const AdminSignalsHeaderRow = styled(AdminHeaderRow)`
  grid-template-columns: ${columns};
`
const AdminSignalsRow = styled(AdminRow)`
  grid-template-columns: ${columns};

  &:last-child {
    border-bottom: 0;
  }
`

const SubTitle = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.purple9};
`

export default AdminSignals

AdminSignals.displayName = 'AdminSignals'
