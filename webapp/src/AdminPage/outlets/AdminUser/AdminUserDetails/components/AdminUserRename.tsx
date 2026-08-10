import styled from '@emotion/styled'
import { Account } from '@opensky/proto'
import { memo, useState } from 'react'

import { Input } from '~/__deprecated__/Input/Input'
import { APIClient } from '~/shared/clients'
import { Box } from '~/shared/components/Base'

const AdminUserRename = memo((props: { account: Account; onRename?: () => void }) => {
  const [newUsername, setNewUsername] = useState('')
  const [success, setSuccess] = useState(false)
  const submitRename = async (accountAddress: string, newName: string) => {
    try {
      await APIClient.opensky.gMRenameAccount({
        newName,
        accountAddress
      })
      setSuccess(true)
    } catch (err) {
      setSuccess(false)
      alert('Error trying to rename account, ' + err)
    }
  }

  return (
    <Box width={477} backgroundColor="purple4">
      <Input
        onClear={() => setNewUsername('')}
        value={newUsername}
        label="Rename Account"
        placeholder="New Name"
        onChange={(e) => setNewUsername(e.target.value)}
        onSubmit={() =>
          submitRename(props.account.address, newUsername).then(props.onRename)
        }
      />
      {success && <SuccessText>Successfully changed name!</SuccessText>}
    </Box>
  )
})

export default AdminUserRename

const SuccessText = styled.div`
  color: lightgreen;
  margin-top: 8px;
`

AdminUserRename.displayName = 'AdminUserRename'
