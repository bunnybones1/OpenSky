import styled from '@emotion/styled'
import { Account } from '@opensky/proto'
import { memo, useEffect, useState } from 'react'

import { Button } from '~/__deprecated__/Button'
import { Input } from '~/__deprecated__/Input/Input'
import { APIClient } from '~/shared/clients'
import { Box, FlexBox } from '~/shared/components/Base'

const AdminUserLevel = memo(
  ({ account, onLevelSet }: { account: Account; onLevelSet?: () => void }) => {
    const [level] = useState(account.level)
    const [seasonLevel] = useState(account.seasonLevel)
    const [desiredLevel, setDesiredLevel] = useState(`${account.level + 1}`)

    const isLevelValid =
      desiredLevel === `${Number.parseInt(desiredLevel)}` &&
      Number.parseInt(desiredLevel) >= 0 &&
      Number.parseInt(desiredLevel) > level // Can only increase level

    const [saved, setSaved] = useState(false)

    useEffect(() => {
      if (isLevelValid) {
        setSaved(false)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [desiredLevel, level])

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
          <Title>Increase Player Level</Title>
          <div>
            Currently level <b>{level}</b> ---- Season level: <b>{seasonLevel}</b>
          </div>
          <Box style={{ flexGrow: 1 }}>
            <Input
              value={desiredLevel}
              label={'New level:'}
              placeholder={`${level + 1}`}
              isInvalid={!isLevelValid}
              onChange={(e) => {
                setDesiredLevel(e.target.value)
                setSaved(false)
              }}
              height="100%"
              type="number"
              submitDisabled
              rounded
            />
          </Box>
          <Button
            disabled={!isLevelValid}
            width={80}
            height={36}
            onClick={async () => {
              try {
                await APIClient.opensky.gMGiveLevels({
                  accountAddress: account.address,
                  levels: Number.parseInt(desiredLevel) - level
                })
                setSaved(true)
                onLevelSet?.()
              } catch (err) {
                alert('error increase levels:' + err)
              }
            }}
          >
            Save
          </Button>
        </FlexBox>
        {saved && <SuccessText>Successfully increased level to {level}</SuccessText>}
      </FlexBox>
    )
  }
)

export default AdminUserLevel

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

AdminUserLevel.displayName = 'AdminUserLevels'
