import styled from '@emotion/styled'
import { memo } from 'react'
import { Link } from 'react-router-dom'

import {
  formatTime,
  toTitleCase,
  trimAddress
} from '~/AdminPage/outlets/shared/helpers'
import { IPAddressHistory } from '~/lib/proto'
import { FlexBox } from '~/shared/components/Base'
import { Icon } from '~/shared/components/Icon/Icon'
import Pagination from '~/shared/components/Pagination'
import { CursorPage } from '~/shared/constants/misc'
import { makeAdminUserRoute } from '~/shared/helpers/routes/general'
import { captureError } from '~/shared/helpers/sentry'

import {
  AdminDetails,
  AdminDetailsContent,
  AdminDetailsList,
  AdminDetailsListItem
} from '../shared/components/AdminDetails'
import {
  AdminCell,
  AdminHeaderRow,
  AdminRow,
  AdminSortButton,
  AdminTable
} from '../shared/components/AdminTable'
import AdminUserSearch from '../shared/components/AdminUserSearch'
import useUsers from './hooks/useUsers'

const AdminUsers = memo(() => {
  const { users, stats, loading, error, pagination, fetchUsers } = useUsers()

  const SortIcon = () => (
    <Icon
      type={pagination.sortOrder === 'ASC' ? 'caret-up' : 'caret-down'}
      color="purple7"
      height="16px"
    />
  )

  if (error) captureError(error, 'Error fetching admin users', true, false)

  const handlePageChange = (navTo: CursorPage) => {
    fetchUsers(navTo)
  }

  const hasAfter =
    pagination.page && pagination.page.hasAfter ? pagination.page.hasAfter : false

  const hasBefore =
    pagination.page && pagination.page.hasBefore ? pagination.page.hasBefore : false

  return (
    <FlexBox type="start-column" style={{ gap: 32 }}>
      <AdminDetails>
        <AdminDetailsContent>
          <FlexBox justifyContent="space-between">
            <AdminUserSearch />
            {loading && <Icon type="spinner" height="32px" color="purple7" />}
          </FlexBox>
        </AdminDetailsContent>
        <AdminDetailsList>
          <AdminDetailsListItem title="Total Active Users">
            {stats?.total_active_users}
          </AdminDetailsListItem>
          <AdminDetailsListItem title="Total Banned Users">
            {stats?.total_banned_users}
          </AdminDetailsListItem>
          <AdminDetailsListItem title="Total Flagged Users">
            {stats?.total_flagged_users}
          </AdminDetailsListItem>
          <AdminDetailsListItem title="Total Suspended Users">
            {stats?.total_suspended_users}
          </AdminDetailsListItem>
          <AdminDetailsListItem title="Total VIP Users">
            {stats?.total_vip_users}
          </AdminDetailsListItem>
          <AdminDetailsListItem title="Total ToDelete Users">
            {stats?.total_to_delete_users}
          </AdminDetailsListItem>
          {/* <AdminDetailsListItem title="Total Results">
            {pagination.page?.totalRecords || 0}
          </AdminDetailsListItem> */}
        </AdminDetailsList>
      </AdminDetails>

      <AdminUsersTable>
        <AdminUsersHeaderRow>
          <AdminUsersCell>Player</AdminUsersCell>
          <AdminUsersCell>Discovery Rank</AdminUsersCell>
          <AdminUsersCell>Constructed Rank</AdminUsersCell>
          <AdminUsersCell>Conquest Unlocked</AdminUsersCell>
          <AdminUsersCell>Flagged</AdminUsersCell>
          <AdminUsersCell>IP on Registration</AdminUsersCell>
          <AdminUsersCell>Last IP</AdminUsersCell>
          <AdminUsersCell>
            <AdminSortButton onClick={pagination.toggleSortCreated}>
              Created
              {pagination.isSortCreated && <SortIcon />}
            </AdminSortButton>
          </AdminUsersCell>
        </AdminUsersHeaderRow>

        {users.map((user) => {
          const ips = formatIP(user.ipHistory)

          return (
            <AdminUsersRow key={user.account.name}>
              <AdminUsersCell>
                <Link to={makeAdminUserRoute(user.account.address)}>
                  <p>{user.account.name}</p>
                  <small>{trimAddress(user.account.address)}</small>
                </Link>
              </AdminUsersCell>
              <AdminUsersCell>
                {formatRank(user.account.stats?.rankedDiscovery?.playerRank)}
              </AdminUsersCell>
              <AdminUsersCell>
                {formatRank(user.account.stats?.rankedConstructed?.playerRank)}
              </AdminUsersCell>
              <AdminUsersCell>
                {user.conquestsUnlocked && (
                  <Icon type="check" height="16px" color="white" />
                )}
              </AdminUsersCell>
              <AdminUsersCell>{user.accountActions?.length}</AdminUsersCell>
              <AdminUsersCell>
                <span title={ips.oldest.full}>{ips.oldest.trimmed}</span>
              </AdminUsersCell>
              <AdminUsersCell>
                <span title={ips.latest.full}>{ips.latest.trimmed}</span>
              </AdminUsersCell>
              <AdminUsersCell>
                <small>{formatTime(user.account.createdAt)}</small>
              </AdminUsersCell>
            </AdminUsersRow>
          )
        })}
      </AdminUsersTable>
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
          hasBefore={hasBefore}
          hasAfter={hasAfter}
        />
      </FlexBox>
    </FlexBox>
  )
})

type IPAddress = {
  IPNet: {
    IP: string
  }
}

const formatIP = (ips?: IPAddressHistory[]) => {
  if (!ips || !ips.length)
    return { oldest: { full: '', trimmed: '' }, latest: { full: '', trimmed: '' } }

  const latest = ips.sort(function (a, b) {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return dateB - dateA
  })[0]

  const latestIP = latest.ipAddress as unknown as IPAddress
  const latestIPString = latestIP.IPNet.IP

  const oldest = ips.sort(function (a, b) {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return dateA - dateB
  })[0]

  const oldestIP = oldest.ipAddress as unknown as IPAddress
  const oldestIPString = oldestIP.IPNet.IP

  return {
    oldest: {
      full: oldestIPString,
      trimmed:
        oldestIPString.length > 16
          ? oldestIPString.substr(0, 16) + '...'
          : oldestIPString
    },
    latest: {
      full: latestIPString,
      trimmed:
        latestIPString.length > 16
          ? latestIPString.substr(0, 16) + '...'
          : latestIPString
    }
  }
}

const formatRank = (rank?: string) => {
  return toTitleCase(rank?.toLowerCase() || 'Unranked')
}

const columns = '1fr 0.66fr 0.66fr 0.66fr 1fr 1fr 1fr 1fr'
const AdminUsersTable = styled(AdminTable)``
const AdminUsersCell = styled(AdminCell)``
const AdminUsersHeaderRow = styled(AdminHeaderRow)`
  grid-template-columns: ${columns};
`
const AdminUsersRow = styled(AdminRow)`
  grid-template-columns: ${columns};
`

export default AdminUsers

AdminUsers.displayName = 'AdminUsers'
