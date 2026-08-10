import { memo } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useSnapshot } from 'valtio'

import { SubNav } from '~/__deprecated__/SubNav'
import { FlexBox } from '~/shared/components/Base'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import useAdminAuth from '~/shared/hooks/useAdminAuth'
import { authenticationState } from '~/shared/state/authentication-state'

const Admin = memo(() => {
  const { userAddress } = useSnapshot(authenticationState)
  const { isAdmin } = useAdminAuth(userAddress)

  if (isAdmin === false) return <Navigate to={ROUTES_CONFIG.directPath} />

  return (
    <FlexBox
      mx="auto"
      width="100%"
      height="auto"
      type="start-column"
      style={{ color: 'white' }}
    >
      <SubNav
        subRoutes={[
          {
            id: '',
            to: ROUTES_CONFIG.routes.ADMIN.routes.USERS.directPath,
            label: 'Users'
          },
          {
            to: ROUTES_CONFIG.routes.ADMIN.routes.MATCHES.directPath,
            label: 'Matches',
            id: ''
          },
          {
            to: ROUTES_CONFIG.routes.ADMIN.routes.SIGNALS.directPath,
            label: 'Signals',
            id: ''
          },
          {
            to: ROUTES_CONFIG.routes.ADMIN.routes.PENDING_GOLDS.directPath,
            label: 'Golds',
            id: ''
          },
          {
            to: ROUTES_CONFIG.routes.ADMIN.routes.COMMUNITY.routes.BANNERS.directPath,
            label: 'Community',
            id: ''
          }
        ]}
      />
      <Outlet />
    </FlexBox>
  )
})

export default Admin

Admin.displayName = 'Admin'
