import { NotificationConquestV2Reward } from '@opensky/proto'
import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useMount } from 'react-use'

import { NOTIFICATIONS_DIALOG_ID } from '~/HomePage/shared/constants'
import { APIClient } from '~/shared/clients'
import { Button } from '~/shared/components/Button'
import Glow from '~/shared/components/Glow'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  BottomAnchor,
  ButtonContainer,
  ContainerAnimation,
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
  conquestReward: NotificationConquestV2Reward
  id: number
}

const ConquestNotification = memo(({ conquestReward, id }: Props) => {
  const { getAssetUrl } = useGetAssetContext()
  const { t } = useTranslation()
  const isTabletWide = useResponsiveQuery('tabletWide')

  useMount(() => {
    APIClient.opensky.setNotificationsAsSeen({
      notificationIDs: [id]
    })
  })

  const navigate = useNavigate()
  return (
    <div
      className={clsx(
        ContainerAnimation,
        Sprinkles({
          display: 'flex',
          flexDirection: 'column',
          height: 'full',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 1,
          position: 'relative',
          width: 'full'
        })
      )}
    >
      <div
        className={Sprinkles({
          position: 'absolute',
          width: 'full',
          height: 'full',
          top: 0,
          left: 0
        })}
        style={{ background: 'radial-gradient(transparent, #0C061E)' }}
      />
      <div className={TopAnchor}>
        <div className={NotificationSubtitleContainer}>
          <div className={NotificationSubtitle}>
            {t('notifications.conquestTreasure.subtitle', {
              week: conquestReward.week,
              season: conquestReward.season
            })}
          </div>
        </div>
        <div className={NotificationTitle}>
          {t('notifications.conquestTreasure.title', {
            level: conquestReward.treasureLevel
          })}
        </div>
      </div>
      <div
        className={Sprinkles({
          position: 'absolute',
          width: 'full',
          height: 'full',
          marginTop: isTabletWide ? '32px' : '0px'
        })}
      />
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'center'
        })}
        style={{ height: '50%' }}
      >
        {!!getAssetUrl && (
          <img
            src={getAssetUrl('webapp/icons/usdc-coin-stack.webp')}
            className={Sprinkles({
              height: 'full',
              zIndex: 2,
              marginLeft: '12px'
            })}
          />
        )}
        {!!getAssetUrl && (
          <img
            src={getAssetUrl(
              `webapp/icons/conquest-treasure-${conquestReward.treasureLevel}-large.webp`
            )}
            className={Sprinkles({
              height: 'full',
              zIndex: 2,
              marginLeft: '-20px'
            })}
          />
        )}
      </div>
      <div className={BottomAnchor}>
        <div className={YouWonContainer}>
          <div className={YouWon}>{t('play.youWon')}&nbsp;&nbsp;</div>
          {!!getAssetUrl && (
            <img
              src={getAssetUrl('webapp/icons/usdc.webp')}
              style={{
                height: !isTabletWide ? '26px' : '32px',
                width: !isTabletWide ? '26px' : '32px'
              }}
            />
          )}
          &nbsp;&nbsp;
          <div className={Reward}>
            {conquestReward.amountUSDC} {t('play.usdc')}
          </div>
        </div>
        <div
          className={Sprinkles({
            display: 'flex',
            width: 'full',
            height: 'full',
            position: 'relative',
            justifyContent: 'center'
          })}
        >
          <div className={ButtonContainer}>
            <div
              className={Sprinkles({
                width: 'full',
                display: 'flex',
                zIndex: 5
              })}
            >
              <Button
                className={Sprinkles({
                  width: 'full',
                  display: 'flex'
                })}
                frameType={'default'}
                colorType={'blue'}
                height={!isTabletWide ? '32px' : '52px'}
                text={t('notificationModal.buyHeroSkins')}
                onClick={() => {
                  navigate('/hero/1')
                  closeDialog()
                }}
                paddingX={'96px'}
                paddingXMobile={'60px'}
              />
            </div>
            <Glow
              duration={0.8}
              blur="8px"
              spread="8px"
              borderRadius="0px 20px 0px 20px"
              color="cold3"
            />
          </div>
        </div>
      </div>
    </div>
  )
})

export default ConquestNotification

ConquestNotification.displayName = 'ConquestNotification'
