import styled from '@emotion/styled'
import {
  NotificationEarnedRank,
  NotificationLeaderboardReward
} from '@opensky/proto'
import { getSilverID } from '@opensky/shared/assetsIDs'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMount } from 'react-use'

import { FadeIn, FadeOut } from '~/__deprecated__/style/animations'
import { NOTIFICATIONS_DIALOG_ID } from '~/HomePage/shared/constants'
import { APIClient } from '~/shared/clients'
import { Box, FlexBox } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import { ExplosionCard } from '~/shared/components/ExplosionCard'
import Glow from '~/shared/components/Glow'
import { RankBadge } from '~/shared/components/RankBadge'
import { GameType } from '~/shared/constants/ranks'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  BottomAnchor,
  ButtonContainer,
  NotificationSubtitle,
  NotificationSubtitleContainer,
  NotificationTitle,
  Reward,
  TopAnchor,
  YouWon,
  YouWonContainer
} from './styles.css'

const { closeDialog } = controlDialog(NOTIFICATIONS_DIALOG_ID)

interface Props {
  leaderboardReward: NotificationLeaderboardReward
  id: number
}

const LeaderboardRewardNotification = memo(({ leaderboardReward, id }: Props) => {
  const { t } = useTranslation()
  const isTabletWide = useResponsiveQuery('tabletWide')
  const {
    earnedConstructedPlayerRanks,
    earnedDiscoveryPlayerRanks,
    season,
    week,
    silverCardAmounts,
    ticketAmount,
    rankedConstructedRank,
    rankedDiscoveryRank
  } = leaderboardReward

  const navigate = useNavigate()
  const { getAssetUrl } = useGetAssetContext()

  useMount(() => {
    APIClient.opensky.setNotificationsAsSeen({
      notificationIDs: [id]
    })
  })

  const { silverCardsToDisplay, silverCardCount } = useMemo(() => {
    let silverCardsArray: number[] = []
    let silverCardCount = 0

    if (silverCardAmounts) {
      Object.keys(silverCardAmounts).forEach((silverCardId, i) => {
        const amount = Object.values(silverCardAmounts)[i]
        silverCardCount = silverCardCount + amount

        for (let i = 0; i < amount; i++) {
          silverCardsArray.push(getSilverID(silverCardId))
        }
      })
    }

    // Only show 5
    if (silverCardsArray.length > 5) {
      silverCardsArray = silverCardsArray.slice(0, 5)
    }

    return { silverCardsToDisplay: silverCardsArray, silverCardCount }
  }, [silverCardAmounts])

  const renderRank = (earnedRank: NotificationEarnedRank[], mode: GameType) => {
    return earnedRank?.map((rank) => {
      const { playerRank, playerRankStage } = rank
      return (
        <Box
          width={[48, 48, 54, 54, 66]}
          height={[48, 48, 54, 54, 66]}
          key={`${rank.playerRank}-${rank.playerRankStage}`}
        >
          <RankBadge
            playerRank={playerRank}
            playerRankStage={playerRankStage}
            mode={mode}
            rank={
              mode === GameType.CONSTRUCTED
                ? rankedConstructedRank
                : rankedDiscoveryRank
            }
            useHeight={true}
          />
        </Box>
      )
    })
  }

  return (
    <NotificationContainer
      style={{
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 1
      }}
    >
      <FlexBox
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          background: 'radial-gradient(transparent, #0C061E)',
          top: '0px',
          left: '0px'
        }}
      />
      <div className={TopAnchor}>
        <FlexBox type="centered-column" className={NotificationSubtitleContainer}>
          <FlexBox type="centered-row" flexWrap="nowrap" pb={['4px', '4px', 8, 8]}>
            {earnedDiscoveryPlayerRanks &&
              renderRank(earnedDiscoveryPlayerRanks, GameType.DISCOVERY)}
            {earnedConstructedPlayerRanks &&
              renderRank(earnedConstructedPlayerRanks, GameType.CONSTRUCTED)}
          </FlexBox>
          <div className={NotificationSubtitle}>
            {t('notifications.leaderboardRewards.subtitle', { season, week })}
          </div>
        </FlexBox>
        <div className={NotificationTitle}>
          {t('notifications.leaderboardRewards.title')}
        </div>
      </div>
      <RewardImgContainer
        height={['148px', '195px', '225px', '225px', '325px']}
        width="100%"
        position="relative"
        justifyContent={'center'}
      >
        {silverCardsToDisplay &&
          silverCardsToDisplay.map((id, i) => (
            <>
              <RewardImgReveal
                style={{ position: 'relative' }}
                key={`${i}-${id}`}
                className={`card card-${i}`}
                width={!isTabletWide ? '13%' : '15%'}
                height="fit-content"
              >
                <FlexBox width="100%" position="absolute">
                  {!!getAssetUrl && (
                    <img
                      style={{
                        width: '100%',
                        position: 'absolute',
                        left: '0px',
                        zIndex: 999
                      }}
                      className={`card-reveal-back-${i}`}
                      src={getAssetUrl(
                        `webapp/cards/full-card-backs/2x/cardback-standard-base.webp`
                      )}
                    />
                  )}
                </FlexBox>
                <FlexBox className={`card-reveal-${i}`}>
                  <ExplosionCard id={id} explosionEffect={true} />
                </FlexBox>
              </RewardImgReveal>
            </>
          ))}
        {silverCardsToDisplay &&
          silverCardsToDisplay.length === 0 &&
          ticketAmount > 0 && (
            <Box
              width={['100px', '100px', '100px', '160px']}
              className={`ticket`}
              left={[
                'calc(50% - 50px)',
                'calc(50% - 50px)',
                'calc(50% - 50px)',
                'calc(50% - 80px)'
              ]}
            >
              {!!getAssetUrl && (
                <img
                  src={getAssetUrl('webapp/icons/conquest-ticket-big.webp')}
                  style={{ width: '100%' }}
                />
              )}
            </Box>
          )}
      </RewardImgContainer>
      <Box className={BottomAnchor} pb={[2, 2, 4, 4, 16]}>
        <FlexBox zIndex={11} className={YouWonContainer}>
          <div className={YouWon}>{t('play.youWon')}&nbsp;</div>
          {silverCardCount && silverCardCount > 0 && (
            <>
              {!!getAssetUrl && (
                <img
                  src={getAssetUrl('webapp/icons/silver-card-with-letter.webp')}
                  style={{
                    height: !isTabletWide ? '26px' : '32px',
                    width: !isTabletWide ? '26px' : '32px'
                  }}
                />
              )}
              &nbsp;
              <div className={Reward}>
                x{silverCardCount} {t('profile.silverCards')}
              </div>{' '}
              &nbsp;
            </>
          )}

          {ticketAmount > 0 && (
            <>
              {!!getAssetUrl && (
                <img
                  src={getAssetUrl('webapp/icons/conquest-ticket.webp')}
                  style={{
                    height: !isTabletWide ? '26px' : '32px',
                    width: !isTabletWide ? '26px' : '32px'
                  }}
                />
              )}
              &nbsp;
              <div className={Reward}>
                x{ticketAmount} {t('profile.tickets')}
              </div>{' '}
              &nbsp;
            </>
          )}
        </FlexBox>
        <FlexBox
          width="100%"
          height="100%"
          position="relative"
          justifyContent="center"
        >
          <FlexBox className={ButtonContainer}>
            <FlexBox zIndex={11} width="100%">
              <Button
                className={Sprinkles({
                  width: 'full',
                  display: 'flex'
                })}
                frameType={'default'}
                colorType={'blue'}
                height={!isTabletWide ? '32px' : '52px'}
                text={t('notificationModal.checkItems')}
                onClick={() => {
                  closeDialog()
                  navigate('/items/cards')
                }}
              />
            </FlexBox>
            <Glow
              duration={0.8}
              blur="8px"
              spread="6px"
              borderRadius="0px 20px 0px 20px"
              color="cold3"
            />
          </FlexBox>
        </FlexBox>
      </Box>
    </NotificationContainer>
  )
})

LeaderboardRewardNotification.displayName = 'LeaderboardRewardNotification'

const NotificationContainer = styled(FlexBox)`
  animation: ${FadeIn} 0.2s ease-in-out;
`
const RewardImgContainer = styled(FlexBox)`
  .ticket {
    position: absolute;
  }
  .card {
    position: relative;
  }
`

const RewardImgReveal = styled(Box)`
  opacity: 1;
  z-index: 99;
  .card-reveal-back-0 {
    animation: ${FadeOut} 0.75s ease-in forwards;
    animation-delay: 0.5s;
  }
  .card-reveal-back-1 {
    animation: ${FadeOut} 0.75s ease-in forwards;
    animation-delay: 1s;
  }
  .card-reveal-back-2 {
    animation: ${FadeOut} 0.75s ease-in forwards;
    animation-delay: 1.5s;
  }
  .card-reveal-back-3 {
    animation: ${FadeOut} 0.75s ease-in forwards;
    animation-delay: 2s;
  }
  .card-reveal-back-4 {
    animation: ${FadeOut} 0.75s ease-in forwards;
    animation-delay: 2.5s;
  }

  .card-reveal-0 {
    opacity: 0;
    animation: ${FadeIn} 0.75s ease-in forwards;
    animation-delay: 0.5s;
  }
  .card-reveal-1 {
    opacity: 0;
    animation: ${FadeIn} 0.75s ease-in forwards;
    animation-delay: 1s;
  }
  .card-reveal-2 {
    opacity: 0;
    animation: ${FadeIn} 0.75s ease-in forwards;
    animation-delay: 1.5s;
  }
  .card-reveal-3 {
    opacity: 0;
    animation: ${FadeIn} 0.75s ease-in forwards;
    animation-delay: 2s;
  }
  .card-reveal-4 {
    opacity: 0;
    animation: ${FadeIn} 0.75s ease-in forwards;
    animation-delay: 2.5s;
  }
`

export default LeaderboardRewardNotification
