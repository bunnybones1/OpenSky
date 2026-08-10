import styled from '@emotion/styled'
import { Account, GameMode, PlayerRank } from '@opensky/proto'
import capitalize from 'lodash-es/capitalize'
import { memo, useEffect, useState } from 'react'

import { Button } from '~/__deprecated__/Button'
import { Input } from '~/__deprecated__/Input/Input'
import { APIClient } from '~/shared/clients'
import { Box, FlexBox } from '~/shared/components/Base'

interface AdminUserRankProps {
  account: Account
  onRankSet?: () => void
}

interface AdminUserRankInternalProps extends AdminUserRankProps {
  gameMode: 'constructed' | 'discovery'
}

const AdminUserRankInternal = memo(
  ({ account, gameMode, onRankSet }: AdminUserRankInternalProps) => {
    const stats =
      gameMode === 'constructed'
        ? account.stats?.rankedConstructed
        : account.stats?.rankedDiscovery
    const [rank] = useState(stats?.playerRank)

    const [rp, setRP] = useState(stats?.score || 0)
    const [desiredRP, setDesiredRP] = useState(`${stats?.score || 0}`)

    const isRPValid =
      desiredRP === `${Number.parseInt(desiredRP)}` && Number.parseInt(desiredRP) >= 0

    const [saved, setSaved] = useState(false)

    const isLegend =
      !!rank && (rank === PlayerRank.MASTER || rank === PlayerRank.GRANDWEAVER)

    useEffect(() => {
      if (isRPValid) {
        setRP(Number.parseInt(desiredRP))
      }
      setSaved(false)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [desiredRP, rank])

    useEffect(() => {
      if (isRPValid) {
        setRP(Number.parseInt(desiredRP))
        setSaved(false)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [desiredRP])

    return (
      <FlexBox
        key={gameMode}
        p={16}
        bg="purple1"
        backgroundColor="purple2"
        border="1px solid"
        borderColor="purple6"
        type="start-column"
        style={{ gap: 16, flexGrow: 1 }}
      >
        <Title>{capitalize(gameMode)} Rank</Title>
        <div>
          Currently {capitalize(stats?.playerRank)} with {rp} Rank Points.
        </div>
        <FlexBox width="100%" style={{ gap: 16 }}>
          <Box width={128}>{capitalize(rank)}</Box>
          <Box style={{ flexGrow: 1 }}>
            <Input
              value={desiredRP}
              label={'Rank Points'}
              placeholder={isLegend ? '0' : 'Number of Rank Points'}
              isInvalid={!isRPValid}
              onChange={(e) => {
                setDesiredRP(e.target.value)
                setSaved(false)
              }}
              height="100%"
              type="number"
              submitDisabled
              rounded
            />
          </Box>
          <Button
            disabled={!isRPValid}
            width={80}
            height={36}
            onClick={async () => {
              const mode =
                gameMode === 'constructed'
                  ? GameMode.RANKED_CONSTRUCTED
                  : GameMode.RANKED_DISCOVERY
              const accountAddress = account.address
              try {
                await APIClient.opensky.gMSetRP({
                  mode,
                  accountAddress,
                  rankPoints: rp
                })
                setSaved(true)
                onRankSet?.()
              } catch (err) {
                alert('error setting rank:' + err)
              }
            }}
          >
            Save
          </Button>
        </FlexBox>
        {saved && (
          <SuccessText>
            Successfully changed rank to {capitalize(rank)} with {rp} Rank Points
          </SuccessText>
        )}
      </FlexBox>
    )
  }
)

AdminUserRankInternal.displayName = 'AdminUserRankInternal'

const AdminUserRank = memo(({ account, onRankSet }: AdminUserRankProps) => {
  return (
    <FlexBox style={{ gap: 16 }} width="100%">
      <AdminUserRankInternal
        account={account}
        onRankSet={onRankSet}
        gameMode="constructed"
      />
      <AdminUserRankInternal
        account={account}
        onRankSet={onRankSet}
        gameMode="discovery"
      />
    </FlexBox>
  )
})

AdminUserRank.displayName = 'AdminUserRank'

export default AdminUserRank

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
