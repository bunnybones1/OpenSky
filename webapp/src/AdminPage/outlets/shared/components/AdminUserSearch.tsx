import { memo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Input } from '~/__deprecated__/Input/Input'
import { Box } from '~/shared/components/Base'
import { makeAdminUserRoute } from '~/shared/helpers/routes/general'

const AdminUserSearch = memo(() => {
  const [userSearch, setUserSearch] = useState('')
  const navigate = useNavigate()

  return (
    <Box width={384} backgroundColor="purple4">
      <Input
        onClear={() => setUserSearch('')}
        value={userSearch}
        label="View Account"
        placeholder="Username or Address"
        onChange={(e) => setUserSearch(e.target.value)}
        onSubmit={() => navigate(makeAdminUserRoute(userSearch))}
      />
    </Box>
  )
})

AdminUserSearch.displayName = 'AdminUserSearch'

export default AdminUserSearch
