import { memo } from 'react'
import { Outlet } from 'react-router-dom'

import { SubNav } from '~/__deprecated__/SubNav'
import { Box } from '~/shared/components/Base'
import { ROUTES_CONFIG } from '~/shared/constants/routes'

const AdminCommunity = memo(() => {
  return (
    <>
      <SubNav
        subRoutes={[
          {
            to: ROUTES_CONFIG.routes.ADMIN.routes.COMMUNITY.routes.BANNERS.directPath,
            label: 'Banners',
            id: ''
          },
          {
            to: ROUTES_CONFIG.routes.ADMIN.routes.COMMUNITY.routes.STREAMERS
              .directPath,
            label: 'Streamers',
            id: ''
          },
          {
            to: ROUTES_CONFIG.routes.ADMIN.routes.COMMUNITY.routes.QUEUES.directPath,
            label: 'Queues',
            id: ''
          },
          {
            to: ROUTES_CONFIG.routes.ADMIN.routes.COMMUNITY.routes.NOTIFICATIONS
              .directPath,
            label: 'Notifications',
            id: ''
          }
        ]}
      />
      <Box mx="auto" p={32} pb={96} width="100%" maxWidth="1500px">
        <Outlet />
      </Box>
    </>
  )
})

AdminCommunity.displayName = 'AdminCommunity'

export default AdminCommunity
