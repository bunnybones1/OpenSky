import styled from '@emotion/styled'
import { Notification, NotificationType } from '@opensky/proto'
import { memo, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUnmount } from 'react-use'

import { GlobalQueryClient } from '~/shared/clients'
import { Box, FlexBox } from '~/shared/components/Base'
import { FancyCloseButton } from '~/shared/components/FancyCloseButton/FancyCloseButton'
import { getNotificationsKey } from '~/shared/constants/react-query-keys'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useNotifications } from '~/shared/queries/useNotifications'
import { authenticationState } from '~/shared/state/authentication-state'

import { NOTIFICATIONS_DIALOG_ID } from '../shared/constants'
import ConquestCardRewardNotification from './components/ConquestCardRewardNotification'
import ConquestNotification from './components/ConquestNotification'
import LeaderboardRewardNotification from './components/LeaderboardRewardNotification'
import OneTimeNotification from './components/OneTimeNotification'
import { mockNotifications } from './mock/data'
import { NotificationsDialogStyle } from './NotificationsDialog.css'

const { closeDialog } = controlDialog(NOTIFICATIONS_DIALOG_ID)

const NotificationsDialog = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const { data } = useNotifications()
  const [index, setIndex] = useState(0)
  const isTabletWide = useResponsiveQuery('tabletWide')

  const notifications = useMemo(() => {
    let notificationArray: Notification[] = []
    if (data) {
      if (data.notifications && data.notifications.length > 0) {
        notificationArray = data.notifications
      }
      const useMockNotifications = false
      if (useMockNotifications) {
        //TODO: Comment this out for prod, this is for testing mock notifications
        notificationArray = mockNotifications
        // comment above here for prod
      }

      // Split conquest notifications if there are cards
      notificationArray.slice(0).forEach((notification, i) => {
        const hasSilverCards =
          notification &&
          notification.conquestV2Reward &&
          notification.conquestV2Reward.silverCardAmounts &&
          Object.keys(notification.conquestV2Reward.silverCardAmounts).length > 0

        if (notification.type === NotificationType.CONQUEST_V2_REWARD) {
          //No USDC to show, so remove USDC notification
          if (!notification.conquestV2Reward?.amountUSDC) {
            notificationArray.splice(i, 1)
          }
          // Has silver cards, create Card reward notification
          if (hasSilverCards) {
            const ConquestCardNotification = {
              id: notification.id,
              accountAddress: '',
              type: NotificationType.ONE_TIME,
              oneTime: {
                id: 0,
                name: 'ConquestV2Cards',
                data: {
                  conquestV2Reward: notification.conquestV2Reward
                }
              }
            }

            let position = i + 1

            if (position > notificationArray.length) {
              position = notificationArray.length + 1
            }
            notificationArray.splice(position, 0, ConquestCardNotification)
          }
        }
      })

      if (notificationArray) {
        return notificationArray
      }
    }

    return null
  }, [data])

  const nextIndex = () => {
    let nextIndex = index + 1
    if (
      notifications &&
      notifications.length > 0 &&
      nextIndex > notifications.length - 1
    ) {
      nextIndex = 0
    }
    setIndex(nextIndex)
  }

  const prevIndex = () => {
    let nextIndex = index - 1
    if (notifications && notifications.length > 0 && nextIndex < 0) {
      nextIndex = notifications.length - 1
    }
    setIndex(nextIndex)
  }

  const notification = useMemo(() => {
    if (notifications && notifications.length > 0) {
      return notifications[index]
    }
    return null
  }, [index, notifications])

  const circuitSize = useMemo(() => {
    if (!isTabletWide) {
      return 'small'
    } else {
      return 'large'
    }
  }, [isTabletWide])

  useEffect(() => {
    if (notifications && notifications.length === 0) {
      closeDialog()
    }
  }, [notifications])

  useUnmount(() => {
    if (!!authenticationState.userAddress) {
      GlobalQueryClient.invalidateQueries(
        getNotificationsKey(authenticationState.userAddress)
      )
    }
  })

  const { t } = useTranslation()

  const showConquestV2CardRewards =
    notification &&
    notification.type === NotificationType.ONE_TIME &&
    notification.oneTime &&
    notification.oneTime.data &&
    notification.oneTime.name === 'ConquestV2Cards' &&
    notification.oneTime.data.conquestV2Reward

  if (notifications && notifications.length > 0) {
    return (
      <FlexBox
        overflow="auto"
        type="centered-start-column"
        flexWrap="nowrap"
        className={NotificationsDialogStyle}
      >
        <FlexBox
          position="absolute"
          right={0}
          top={0}
          width={['75px', '75px', '75px', '102px']}
          zIndex={99}
        >
          <FancyCloseButton onClick={closeDialog} />
        </FlexBox>

        {notifications && notifications.length > 1 && (
          <>
            <FlexBox
              style={{
                position: 'absolute',
                left: '0px',
                zIndex: 2,
                justifyContent: 'center',
                height: '100%',
                flexDirection: 'column'
              }}
            >
              <CircuitArrowContainer
                onClick={() => {
                  prevIndex()
                }}
              >
                {!!getAssetUrl && (
                  <>
                    <Circuit
                      src={getAssetUrl(`webapp/misc/circuit-${circuitSize}.webp`)}
                    />
                    <CircuitHover
                      src={getAssetUrl(
                        `webapp/misc/circuit-${circuitSize}-hover.webp`
                      )}
                      className="hover"
                    />
                  </>
                )}
              </CircuitArrowContainer>
            </FlexBox>
            <FlexBox
              style={{
                position: 'absolute',
                right: '0px',
                zIndex: 2,
                justifyContent: 'center',
                height: '100%',
                flexDirection: 'column'
              }}
            >
              <CircuitArrowContainer
                style={{ transform: 'rotate(180deg)' }}
                onClick={() => {
                  nextIndex()
                }}
              >
                {!!getAssetUrl && (
                  <>
                    <Circuit
                      src={getAssetUrl(`webapp/misc/circuit-${circuitSize}.webp`)}
                    />
                    <CircuitHover
                      src={getAssetUrl(
                        `webapp/misc/circuit-${circuitSize}-hover.webp`
                      )}
                      className="hover"
                    />
                  </>
                )}
              </CircuitArrowContainer>
            </FlexBox>
          </>
        )}

        <Box
          position="absolute"
          left={0}
          top={0}
          zIndex={0}
          height="100%"
          width="100%"
          style={{
            backgroundImage: !!getAssetUrl
              ? `url(${getAssetUrl(
                  'webapp/backgrounds/notifications-background.webp'
                )})`
              : undefined,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundPosition: 'center center'
          }}
        />
        {notification &&
          notification.type === NotificationType.CONQUEST_V2_REWARD &&
          notification.conquestV2Reward && (
            <ConquestNotification
              conquestReward={notification.conquestV2Reward}
              key={`notification-${notification.id}-${index}`}
              id={notification.id}
            />
          )}
        {notification &&
          notification.type === NotificationType.LEADERBOARD_REWARD &&
          notification.leaderboardReward && (
            <LeaderboardRewardNotification
              id={notification.id}
              leaderboardReward={notification.leaderboardReward}
              key={`notification-${notification.id}-${index}`}
            />
          )}
        {showConquestV2CardRewards && (
          <ConquestCardRewardNotification
            id={notification.id}
            key={`notification-${notification.id}-${index}`}
            conquestV2Rewards={notification!.oneTime!.data.conquestV2Reward}
          />
        )}
        {notification &&
          notification.type === NotificationType.ONE_TIME &&
          notification.oneTime &&
          notification.oneTime.data &&
          notification.oneTime.data.background && (
            <OneTimeNotification
              id={notification.id}
              key={`notification-${notification.id}-${index}`}
              background={notification.oneTime.data.background}
              title={notification.oneTime.data.title}
              subtitle={notification.oneTime.data.subtitle}
              buttonText={notification.oneTime.data.buttonText}
              buttonPath={notification.oneTime.data.buttonPath}
            />
          )}
        {notifications && notifications.length > 1 && (
          <BottomBar>
            <NotificationCounter alignItems="center">
              {t('general.notification')}: {index + 1 ? index + 1 : 0} /{' '}
              {notifications && notifications.length ? notifications.length : 0}{' '}
              {notifications.map((notification, i) => (
                <NotificationCounterDot
                  key={`notificationcircle-${i}`}
                  style={{ background: i === index ? '#00D7FD' : '#4D3C7B' }}
                />
              ))}
            </NotificationCounter>
          </BottomBar>
        )}
      </FlexBox>
    )
  } else {
    return null
  }
})

const Circuit = styled('img')`
  user-select: none;
  position: relative;
`

const CircuitHover = styled('img')`
  opacity: 0;
  transition: all 0.3s ease-out;
  user-select: none;
  position: absolute;
`

const BottomBar = styled(FlexBox)`
  position: absolute;
  bottom: 0px;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  padding: 12px 12px;
  z-index: 20;
`

const NotificationCounter = styled(FlexBox)`
  left: 0px;
  color: #c5b4f5;
  font-size: 16px;
  font-weight: 500;
  font-family: 'Barlow';
`

const CircuitArrowContainer = styled(FlexBox)`
  &:hover {
    .hover {
      opacity: 1;
    }
  }
`

const NotificationCounterDot = styled(Box)`
  width: 10px;
  height: 10px;
  background: #4d3c7b;
  border-radius: 50px;
  border: 1px solid #0c0613;
  margin-left: 4px;
`

NotificationsDialog.displayName = 'NotificationsDialog'

export default NotificationsDialog
