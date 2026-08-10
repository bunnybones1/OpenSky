import { memo } from 'react'

import {
  AdminDetails,
  AdminDetailsContent,
  AdminDetailsList,
  AdminDetailsListItem
} from '~/AdminPage/outlets/shared/components/AdminDetails'
import AdminMatchesTable from '~/AdminPage/outlets/shared/components/AdminMatchesTable/AdminMatchesTable'
import AdminUserSearch from '~/AdminPage/outlets/shared/components/AdminUserSearch'
import { FlexBox } from '~/shared/components/Base'

const AdminMatches = memo(() => {
  return (
    <FlexBox type="start-column" style={{ gap: 32 }}>
      <AdminDetails>
        <AdminDetailsContent>
          <FlexBox justifyContent="space-between">
            <AdminUserSearch />
          </FlexBox>
        </AdminDetailsContent>
        <AdminDetailsList>
          <AdminDetailsListItem title="Total Matches">
            {/* {pagination.totalRecords || 'Unknown'} */}
          </AdminDetailsListItem>
        </AdminDetailsList>
      </AdminDetails>

      <AdminMatchesTable />
    </FlexBox>
  )
})

AdminMatches.displayName = 'AdminMatches'

export default AdminMatches
