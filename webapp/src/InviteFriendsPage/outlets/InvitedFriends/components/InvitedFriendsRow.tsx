import { FlagCodes } from '@opensky/shared/constants'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'

import { FlexBox, Text } from '~/shared/components/Base'
import { BattleTag } from '~/shared/components/BattleTag/BattleTag'
import { GameType } from '~/shared/constants/ranks'
import { makeAccountRoute } from '~/shared/helpers/routes/general'
import { useAccountTagArtUrl } from '~/shared/hooks/useAccountTagArtUrl'
import { useAccount } from '~/shared/queries/useAccount'
import { useDispatch } from '~/shared/redux/index'

import { INVITED_FRIENDS_TABLE_WIDTHS } from '../shared/constants'
import { BaseCell } from '../shared/style'

const formatToReadableDate = (dateString: string) => {
  const date = new Date(dateString)
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
}

interface InvitedFriendsRowProps {
  address: string
  points: number
}

export const InvitedFriendsRow = memo(
  ({ address, points }: InvitedFriendsRowProps) => {
    const { data: account } = useAccount(address)
    const { t } = useTranslation()
    const dispatch = useDispatch()
    const tagArtUrl = useAccountTagArtUrl(account?.tagArtID)

    const rank = useMemo(() => {
      const rankToUse = account?.stats?.rankedConstructed

      if (!rankToUse) return undefined

      return {
        playerRank: rankToUse.playerRank,
        playerRankStage: rankToUse.playerRankStage,
        rank: rankToUse.rank,
        text: t(`ranks.${rankToUse.playerRank}`),
        mode: GameType.CONSTRUCTED
      }
    }, [account?.stats?.rankedConstructed, t])

    const navigateToAccount = useCallback(() => {
      if (!!account) {
        dispatch(push(makeAccountRoute(account.address)))
      }
    }, [account, dispatch])

    return (
      <FlexBox
        width="100%"
        height={64}
        alignItems="flex-start"
        justifyContent="flex-start"
        bg="purple2"
        border="1px solid"
        borderColor="purple5"
        flexWrap="nowrap"
      >
        <BaseCell
          style={{
            width: `${INVITED_FRIENDS_TABLE_WIDTHS.USER}px`,
            flexGrow: INVITED_FRIENDS_TABLE_WIDTHS.USER
          }}
        >
          <FlexBox
            height="100%"
            width="100%"
            borderRight="1px solid"
            borderColor="purple5"
            alignItems="center"
            pl="4px"
            py="4px"
            justifyContent="flex-start"
          >
            {!!account && (
              <BattleTag
                name={account.name}
                region={account.region as FlagCodes | undefined}
                skyTagTitle={account.titleID}
                crystalID={account.crystalID}
                rank={rank}
                artUrl={tagArtUrl?.raw}
                onClick={navigateToAccount}
              />
            )}
          </FlexBox>
        </BaseCell>
        <BaseCell
          style={{
            width: `${INVITED_FRIENDS_TABLE_WIDTHS.JOINED}px`,
            flexGrow: INVITED_FRIENDS_TABLE_WIDTHS.JOINED
          }}
        >
          <FlexBox
            height="100%"
            width="100%"
            borderRight="1px solid"
            borderColor="purple5"
            alignItems="center"
            justifyContent="center"
            px={16}
          >
            {!!account && (
              <Text
                color="purple9"
                fontSize={14}
                textWrap
                fontWeight="medium"
                lineHeight="18px"
                textAlign="center"
              >
                {formatToReadableDate(account.createdAt)}
              </Text>
            )}
          </FlexBox>
        </BaseCell>
        <BaseCell
          style={{
            width: `${INVITED_FRIENDS_TABLE_WIDTHS.POINTS}px`,
            flexGrow: INVITED_FRIENDS_TABLE_WIDTHS.POINTS
          }}
        >
          <FlexBox
            height="100%"
            width="100%"
            alignItems="center"
            justifyContent="center"
            px={16}
          >
            <Text
              fontSize={16}
              fontWeight="medium"
              lineHeight="20px"
              color={!points ? 'warm6' : 'cold7'}
            >
              {points}
            </Text>
          </FlexBox>
        </BaseCell>
      </FlexBox>
    )
  }
)

InvitedFriendsRow.displayName = 'InvitedFriendsRow'
