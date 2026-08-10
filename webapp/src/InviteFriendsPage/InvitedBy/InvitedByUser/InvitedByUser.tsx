import styled from '@emotion/styled'
import { FlagCodes } from '@opensky/shared/constants'
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'

import { FlexBox, Text } from '~/shared/components/Base'
import { BattleTag } from '~/shared/components/BattleTag/BattleTag'
import { Icon } from '~/shared/components/Icon/Icon'
import { GameType } from '~/shared/constants/ranks'
import { makeAccountRoute } from '~/shared/helpers/routes/general'
import { useAccountTagArtUrl } from '~/shared/hooks/useAccountTagArtUrl'
import { useAccount } from '~/shared/queries/useAccount'
import { useDispatch } from '~/shared/redux/index'

import { usePointsGifted } from './usePointsGifted'

interface InvitedByUserProps {
  invitedBy: string
}

export const InvitedByUser = memo(({ invitedBy }: InvitedByUserProps) => {
  const { data: invitedByAccount, isLoading } = useAccount(invitedBy)
  const { data: giftedPoints } = usePointsGifted()
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const tagArtUrl = useAccountTagArtUrl(invitedByAccount?.tagArtID)

  const navigateToAccount = useCallback(() => {
    if (!!invitedByAccount) {
      dispatch(push(makeAccountRoute(invitedByAccount.address)))
    }
  }, [invitedByAccount, dispatch])

  const rank = useMemo(() => {
    const rankToUse = invitedByAccount?.stats?.rankedConstructed

    if (!rankToUse) return undefined

    return {
      playerRank: rankToUse.playerRank,
      playerRankStage: rankToUse.playerRankStage,
      rank: rankToUse.rank,
      text: t(`ranks.${rankToUse.playerRank}`),
      mode: GameType.CONSTRUCTED
    }
  }, [invitedByAccount?.stats?.rankedConstructed, t])

  return (
    <FlexBox
      width="100%"
      height="100%"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      {isLoading ? (
        <Icon type="spinner" height="32px" color="purple8" />
      ) : !!invitedByAccount ? (
        <>
          <Text
            fontFamily="condensed"
            fontWeight="bold"
            color="purple9"
            fontSize={18}
            lineHeight="21.6px"
            mb={10}
          >
            {t('inviteFriends.invitedYouHeader')}
          </Text>
          <FlexBox type="centered-row" width="100%" position="relative">
            <BattleTag
              name={invitedByAccount.name}
              region={invitedByAccount.region as FlagCodes | undefined}
              skyTagTitle={invitedByAccount.titleID}
              crystalID={invitedByAccount.crystalID}
              rank={rank}
              artUrl={tagArtUrl?.raw}
              onClick={navigateToAccount}
            />
          </FlexBox>
          {!!giftedPoints && (
            <GiftedText
              dangerouslySetInnerHTML={{
                __html: t('inviteFriends.giftedAmt', {
                  total: giftedPoints.total
                })
              }}
              fontSize={12}
              mt={[8, 8, 8, 12]}
              lineHeight="16px"
              color="white"
              className={clsx({
                hasNoPoints: giftedPoints.total === 0
              })}
              fontWeight="medium"
            />
          )}
        </>
      ) : null}
    </FlexBox>
  )
})

const GiftedText = styled(Text)`
  strong {
    font-size: 14;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.cold8};
  }
  &.hasNoPoints {
    strong {
      color: ${({ theme }) => theme.colors.warm6};
    }
  }
`

InvitedByUser.displayName = 'InvitedByUser'
