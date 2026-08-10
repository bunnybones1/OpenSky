import styled from '@emotion/styled'
import { Account } from '@opensky/proto'
import { memo, useEffect, useState } from 'react'

import { Button } from '~/__deprecated__/Button'
import { Input } from '~/__deprecated__/Input/Input'
import { APIClient } from '~/shared/clients'
import { Box, FlexBox } from '~/shared/components/Base'

const AdminRankedWarmup = memo(
  ({
    account,
    onRankedWarmupGamesSet
  }: {
    account: Account
    onRankedWarmupGamesSet?: () => void
  }) => {
    const [warmUps, setWarmUps] = useState(account.warmUps)
    const [desiredWarmUps, setDesiredWarmUps] = useState(`${account.warmUps}`)

    const isWarmUpsValid =
      desiredWarmUps === `${Number.parseInt(desiredWarmUps)}` &&
      Number.parseInt(desiredWarmUps) >= 0 &&
      Number.parseInt(desiredWarmUps) <= 3

    const [saved, setSaved] = useState(false)

    useEffect(() => {
      if (isWarmUpsValid) {
        setWarmUps(Number.parseInt(desiredWarmUps))
        setSaved(false)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [desiredWarmUps, warmUps])

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
          <Title>Ranked Warmups</Title>
          <div>Currently {account.warmUps} / 3.</div>
          <Box style={{ flexGrow: 1 }}>
            <Input
              value={desiredWarmUps}
              label={'Warmups'}
              placeholder={`3`}
              isInvalid={!isWarmUpsValid}
              onChange={(e) => {
                setDesiredWarmUps(e.target.value)
                setSaved(false)
              }}
              height="100%"
              type="number"
              submitDisabled
              rounded
            />
          </Box>
          <Button
            disabled={!isWarmUpsValid}
            width={80}
            height={36}
            onClick={async () => {
              const accountAddress = account.address
              try {
                await APIClient.opensky.gMSetWarmupGamesCompleted({
                  accountAddress,
                  numGamesCompleted: warmUps
                })
                setSaved(true)
                onRankedWarmupGamesSet?.()
              } catch (err) {
                alert('error setting warmup games:' + err)
              }
            }}
          >
            Save
          </Button>
        </FlexBox>
        {saved && (
          <SuccessText>Successfully changed warmup games to {warmUps}/3</SuccessText>
        )}
      </FlexBox>
    )
  }
)

export default AdminRankedWarmup

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

AdminRankedWarmup.displayName = 'AdminRankedWarmup'
