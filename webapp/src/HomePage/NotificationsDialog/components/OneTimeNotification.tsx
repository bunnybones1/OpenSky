import clsx from 'clsx'
import { memo } from 'react'
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
  BackgroundImage,
  BottomAnchor,
  ContainerAnimation,
  Gradient,
  NotificationSubtitle,
  NotificationSubtitleContainer,
  NotificationTitle,
  TopAnchor
} from './styles.css'

const { closeDialog } = controlDialog(NOTIFICATIONS_DIALOG_ID)

interface Props {
  background: string
  title?: string
  subtitle?: string
  buttonText?: string
  buttonPath?: string
  id: number
}

const OneTimeNotification = memo(
  ({ background, title, subtitle, buttonText, buttonPath, id }: Props) => {
    const navigate = useNavigate()
    const isTabletWide = useResponsiveQuery('tabletWide')
    const { getAssetUrl } = useGetAssetContext()

    useMount(() => {
      APIClient.opensky.setNotificationsAsSeen({
        notificationIDs: [id]
      })
    })

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
          className={clsx(
            Gradient,
            Sprinkles({
              position: 'absolute',
              width: 'full',
              height: 'full',
              top: 0,
              left: 0
            })
          )}
        />
        <div
          className={clsx(
            BackgroundImage,
            Sprinkles({
              position: 'absolute',
              height: 'full',
              width: 'full',
              zIndex: 2,
              top: 0,
              left: 0
            })
          )}
          style={{
            backgroundImage: !!getAssetUrl
              ? `url(${getAssetUrl(background)})`
              : undefined
          }}
        />
        <div className={TopAnchor}>
          {subtitle && (
            <div className={NotificationSubtitleContainer}>
              <div className={NotificationSubtitle}>{subtitle}</div>
            </div>
          )}
          {title && <div className={NotificationTitle}>{title}</div>}
        </div>
        {buttonText && (
          <div className={BottomAnchor}>
            <div
              className={Sprinkles({
                display: 'flex',
                position: 'relative',
                justifyContent: 'center',
                width: 'full',
                height: 'full'
              })}
            >
              <Button
                frameType={'default'}
                colorType={'blue'}
                height={!isTabletWide ? '32px' : '76px'}
                width={'full'}
                className={Sprinkles({
                  zIndex: 5
                })}
                text={buttonText}
                onClick={() => {
                  if (buttonPath) navigate(buttonPath)

                  closeDialog()
                }}
                paddingX={'96px'}
                paddingXMobile={'60px'}
              />
              <Glow
                duration={0.8}
                blur="8px"
                spread="6px"
                borderRadius="0px 20px 0px 20px"
                color="cold3"
              />
            </div>
          </div>
        )}
      </div>
    )
  }
)

OneTimeNotification.displayName = 'OneTimeNotification'

export default OneTimeNotification
