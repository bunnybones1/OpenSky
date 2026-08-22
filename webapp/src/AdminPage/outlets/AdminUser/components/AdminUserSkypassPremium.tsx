import styled from '@emotion/styled'
import { Account } from '@opensky/proto'
import { memo, useEffect, useState } from 'react'

import { Button } from '~/__deprecated__/Button'
import Checkbox from '~/__deprecated__/Checkbox'
import { APIClient } from '~/shared/clients'
import { FlexBox } from '~/shared/components/Base'

const AdminUserSkypassPremium = memo(
  ({ account, onSetPremium }: { account: Account; onSetPremium?: () => void }) => {
    const [isPremium, setIsPremium] = useState(false)
    const [desiredIsPremium, setDesiredIsPremium] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
      async function fetchIsPremium() {
        const isPremiumResponse = await APIClient.opensky.gMHasSkypassPremium({
          address: account.address
        })
        setIsPremium(isPremiumResponse.has)
        setDesiredIsPremium(isPremiumResponse.has)
      }
      fetchIsPremium()
    }, [account.address])

    const isValidPremium = isPremium !== desiredIsPremium

    useEffect(() => {
      setSaved(false)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPremium, desiredIsPremium])

    return (
      <FlexBox style={{ gap: 16 }} width="100%">
        <FlexBox
          p={16}
          bg="purple1"
          backgroundColor="purple2"
          border="1px solid"
          borderColor="purple6"
          type="start-column"
          style={{ gap: 16, flexGrow: 1 }}
        >
          <Title>Skypass Premium (Current: {String(isPremium)})</Title>
          <FlexBox width="100%" style={{ gap: 16 }}>
            <Checkbox
              checked={desiredIsPremium}
              onClick={() => {
                setDesiredIsPremium(!desiredIsPremium)
              }}
            ></Checkbox>
            <Button
              disabled={!isValidPremium}
              width={80}
              height={36}
              onClick={async () => {
                const address = account.address
                try {
                  await APIClient.opensky.gMToggleSkypassPremium(
                    { address },
                    { 'x-cloud-weasel-operation-key': crypto.randomUUID() }
                  )
                  setSaved(true)
                  onSetPremium?.()
                } catch (err) {
                  alert('error toggling skypass premium:' + err)
                }
              }}
            >
              Save
            </Button>
          </FlexBox>
          {saved && (
            <SuccessText>
              Successfully set Skypass Premium to {String(isPremium)}
            </SuccessText>
          )}
        </FlexBox>
      </FlexBox>
    )
  }
)

export default AdminUserSkypassPremium

const SuccessText = styled.div`
  color: lightgreen;
  margin-top: 8px;
`

const Title = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.purple9};
`

AdminUserSkypassPremium.displayName = 'AdminUserSkypassPremium'
