import styled from '@emotion/styled'
import { memo } from 'react'
import { Link } from 'react-router-dom'

import {
  AdminCell,
  AdminHeaderRow,
  AdminRow,
  AdminTable
} from '~/AdminPage/outlets/shared/components/AdminTable'
import { formatTime, trimAddress } from '~/AdminPage/outlets/shared/helpers'
import { FlexBox } from '~/shared/components/Base'
import Pagination from '~/shared/components/Pagination'
import { CursorPage } from '~/shared/constants/misc'
import { makeAdminUserRoute } from '~/shared/helpers/routes/general'
import { captureError } from '~/shared/helpers/sentry'

import usePending from './hooks/usePending'

const AdminGolds = memo(() => {
  const { pendingItems, loading, error, pagination, fetchPending } = usePending()

  if (error) captureError(error, 'Error fetching admin golds', true, false)

  const handlePageChange = (navTo: CursorPage) => {
    fetchPending(navTo)
  }

  const hasAfter =
    pagination.page && pagination.page.hasAfter ? pagination.page.hasAfter : false

  const hasBefore =
    pagination.page && pagination.page.hasBefore ? pagination.page.hasBefore : false

  return (
    <FlexBox type="start-column" style={{ gap: 32 }}>
      <AdminUsersTable>
        <AdminUsersHeaderRow>
          <AdminUsersCell>Player</AdminUsersCell>
          <AdminUsersCell>Account Level</AdminUsersCell>
          <AdminUsersCell>Golds Won Week</AdminUsersCell>
          <AdminUsersCell>Golds Won Day</AdminUsersCell>
          <AdminUsersCell>Next Gold Mint</AdminUsersCell>
          <AdminUsersCell>Created</AdminUsersCell>
        </AdminUsersHeaderRow>

        {pendingItems.map((pendingItem) => {
          return (
            <AdminUsersRow key={pendingItem.account.name}>
              <AdminUsersCell>
                <Link to={makeAdminUserRoute(pendingItem.account.address)}>
                  <p>{pendingItem.account.name}</p>
                  <small>{trimAddress(pendingItem.account.address)}</small>
                </Link>
              </AdminUsersCell>
              <AdminUsersCell>{pendingItem.account.level}</AdminUsersCell>
              <AdminUsersCell>{pendingItem.cardsWonLastWeek}</AdminUsersCell>
              <AdminUsersCell>{pendingItem.cardsWonLastDay}</AdminUsersCell>
              <AdminUsersCell>{formatTime(pendingItem.mintAt)}</AdminUsersCell>
              <AdminUsersCell>
                {formatTime(pendingItem.account.createdAt)}
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

const columns = '1fr 0.66fr 1fr 1fr 1fr 1fr 1fr'
const AdminUsersTable = styled(AdminTable)``
const AdminUsersCell = styled(AdminCell)``
const AdminUsersHeaderRow = styled(AdminHeaderRow)`
  grid-template-columns: ${columns};
`
const AdminUsersRow = styled(AdminRow)`
  grid-template-columns: ${columns};
`

export default AdminGolds

AdminGolds.displayName = 'AdminGolds'
