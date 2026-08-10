import styled from '@emotion/styled'
import { NotificationConquestV2Reward } from '@opensky/proto'
import { getSilverID } from '@opensky/shared/assetsIDs'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMount } from 'react-use'

import { FadeIn, FadeOut } from '~/__deprecated__/style/animations'
import { NOTIFICATIONS_DIALOG_ID } from '~/HomePage/shared/constants'
import { APIClient } from '~/shared/clients'
import { Asset } from '~/shared/components/Asset'
import { Box, FlexBox } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import { ExplosionCard } from '~/shared/components/ExplosionCard'
import Glow from '~/shared/components/Glow'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  BottomAnchor,
  ButtonContainer,
  NotificationTitle,
  Reward,
  TopAnchor,
  YouWon,
  YouWonContainer
} from './styles.css'

interface Props {
  conquestV2Rewards: NotificationConquestV2Reward
  id: number
}

const { closeDialog } = controlDialog(NOTIFICATIONS_DIALOG_ID)

const ConquestCardRewardNotification = memo(({ conquestV2Rewards, id }: Props) => {
  const { t } = useTranslation()
  const isTabletWide = useResponsiveQuery('tabletWide')
  const { getAssetUrl } = useGetAssetContext()
  const navigate = useNavigate()

  useMount(() => {
    APIClient.opensky.setNotificationsAsSeen({
      notificationIDs: [id]
    })
  })

  const { silverCardsToDisplay, silverCardCount } = useMemo(() => {
    let silverCardsArray: number[] = []
    let silverCardCount = 0

    if (conquestV2Rewards.silverCardAmounts) {
      Object.keys(conquestV2Rewards.silverCardAmounts).forEach((silverCardId, i) => {
        const amount = Object.values(conquestV2Rewards.silverCardAmounts)[i]
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
  }, [conquestV2Rewards])

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
      <Box
        position="absolute"
        left={0}
        top={0}
        zIndex={0}
        height="100%"
        width="100%"
        style={{
          backgroundImage: !!getAssetUrl
            ? `url(${getAssetUrl('webapp/backgrounds/exbg-hexinv-generic.webp')})`
            : undefined,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundPosition: 'center center'
        }}
      />

      <div className={TopAnchor}>
        <FlexBox
          type="centered-row"
          alignItems="center"
          style={{ position: 'relative' }}
        >
          <img
            style={{
              width: !isTabletWide ? '100px' : '136px',
              height: !isTabletWide ? '100px' : '136px',
              position: 'absolute',
              top: '-20px',
              zIndex: 2
            }}
            src={
              !!getAssetUrl ? getAssetUrl(`webapp/misc/logo-hexinv.webp`) : undefined
            }
          />
          <Asset
            url={`webapp/icons/conquest-treasure-${conquestV2Rewards.treasureLevel}.webp`}
            style={{
              height: !isTabletWide ? '72px' : '100px',
              zIndex: 1
            }}
          />
        </FlexBox>
        <div className={NotificationTitle}>{t('play.conquestSilverRewards')}</div>
      </div>
      <FlexBox
        mt={['0px', '0px', '0px', '30px']}
        style={{
          position: 'absolute',
          width: '100%',
          height: '99%',
          justifyContent: 'center'
        }}
      ></FlexBox>

      <RewardImgContainer
        height={['153px', '195px', '225px', '225px', '360px']}
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
      </RewardImgContainer>

      <div className={BottomAnchor}>
        <FlexBox className={YouWonContainer}>
          <div
            style={{
              top: '26px'
            }}
            className={YouWon}
          >
            {t('play.youWon')}&nbsp;
          </div>
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
                {silverCardCount} {t('profile.silverCards')}
              </div>{' '}
              &nbsp;
            </>
          )}
        </FlexBox>
        <FlexBox
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            justifyContent: 'center'
          }}
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
                paddingX={'96px'}
                paddingXMobile={'60px'}
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
      </div>
    </NotificationContainer>
  )
})

const NotificationContainer = styled(FlexBox)`
  animation: ${FadeIn} 0.2s ease-in-out;
`
const RewardImgContainer = styled(FlexBox)`
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

export default ConquestCardRewardNotification

ConquestCardRewardNotification.displayName = 'ConquestCardRewardNotification'
