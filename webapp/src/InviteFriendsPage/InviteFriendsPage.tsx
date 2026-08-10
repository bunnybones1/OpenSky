import { memo } from 'react'
import { Outlet } from 'react-router-dom'
import { useMount } from 'react-use'

import { FlexBox } from '~/shared/components/Base'
import { page } from '~/shared/helpers/analytics-old'

import { InviteFriendsHeader } from './components/InviteFriendsHeader'
import { InviteFriendsSubNav } from './components/InviteFriendsSubNav'
import { InvitedBy } from './InvitedBy/InvitedBy'

const InviteFriends = memo(() => {
  useMount(() => {
    page('Invite Friends')
  })

  return (
    <FlexBox
      width="100%"
      pb={[0, 0, 0, 24]}
      flexDirection="column"
      alignItems="center"
      justifyContent="flex-start"
    >
      <FlexBox
        width="100%"
        height="auto"
        maxWidth={1440}
        flexDirection="column"
        alignItems="flex-start"
        justifyContent="flex-start"
        borderTopWidth={[0, 0, 0, 1]}
        borderRightWidth={[0, 0, 0, 0, 1]}
        borderLeftWidth={[0, 0, 0, 0, 1]}
        borderBottomWidth={0}
        borderStyle="solid"
        borderColor="purple7"
        mt={[0, 0, 0, 12]}
      >
        <InviteFriendsHeader />
        <InviteFriendsSubNav />
        <Outlet />
        <InvitedBy />
      </FlexBox>
    </FlexBox>
  )
})

InviteFriends.displayName = 'InviteFriends'

export default InviteFriends
