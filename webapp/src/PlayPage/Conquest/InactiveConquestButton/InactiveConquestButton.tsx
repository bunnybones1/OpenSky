import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { IOSAppUpdateDialog } from '~/PlayPage/shared/components/IOSAppUpdateDialog'
import { IOS_APP_UPDATE_DIALOG_ID } from '~/PlayPage/shared/constants'
import { SharedPlayButtonStyle } from '~/PlayPage/shared/style/SharedPlayPageStyle.css'
import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { ALLOW_TICKET_SALES } from '~/shared/constants/flags'
import { isIOSUpdateNeeded } from '~/shared/constants/play'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useDispatch } from '~/shared/redux/index'
import { conquestTicketSelectorState } from '~/shared/state/conquest-tickets-state'
import { playState } from '~/shared/state/play-state'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { useEnterConquest } from './hooks/useEnterConquest'
import { InactiveConquestButtonUnlock } from './InactiveConquestButton.css'

interface PurchaseTicketsButtonProps {
  isInQueue: boolean
  isPendingRewards: boolean
  isConquestLocked: boolean
  tradeableTickets: number | undefined
  untradeableTickets: number | undefined
}

export const InactiveConquestButton = memo(
  ({
    tradeableTickets,
    untradeableTickets,
    isInQueue,
    isConquestLocked,
    isPendingRewards
  }: PurchaseTicketsButtonProps) => {
    const isTabletWide = useResponsiveQuery('tabletWide')
    const { hasConvertedConquestTicket } = useSnapshot(conquestTicketSelectorState)
    const { selectedConquestDeck } = useSnapshot(playState)

    const { Dialog: IOSUpdateDialog, openDialog: openIOSUpdateDialog } = useDialog({
      Element: IOSAppUpdateDialog,
      id: IOS_APP_UPDATE_DIALOG_ID,
      isClickoffDisabled: true,
      isCloseButtonDisabled: true
    })

    const isTicketHolder = !!tradeableTickets || !!untradeableTickets

    const isDisabled =
      isConquestLocked ||
      (!selectedConquestDeck && isTicketHolder) ||
      hasConvertedConquestTicket ||
      isInQueue

    const { enterConquest } = useEnterConquest()

    const dispatch = useDispatch()

    const onClick = useCallback(async () => {
      if (!!isIOSUpdateNeeded) {
        openIOSUpdateDialog()
        return
      }
      if (!isTicketHolder) {
        dispatch(push(ROUTES_CONFIG.routes.PURCHASE_CONQUEST.directPath))
      } else {
        enterConquest()
      }
    }, [dispatch, enterConquest, isTicketHolder, openIOSUpdateDialog])

    const { t } = useTranslation()

    const onToUnlockClick = useCallback(() => {
      dispatch(push(ROUTES_CONFIG.routes.PLAY.routes.RANKED.directPath))
    }, [dispatch])

    return (
      <>
        {IOSUpdateDialog}
        {!!isConquestLocked && (
          <>
            <div
              className={Sprinkles({
                top: 0,
                left: 0,
                width: 'full',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'absolute',
                zIndex: 2,
                pointerEvents: 'none',
                marginTop: '-16px'
              })}
            >
              <Icon type="lock-diamond" color="purple9" height="32px" />
            </div>
            <div
              className={clsx(
                Sprinkles({
                  position: 'absolute',
                  zIndex: 2,
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }),
                InactiveConquestButtonUnlock
              )}
              onClick={onToUnlockClick}
            >
              {t('play.gameModes.CONQUEST.toUnlock')}
            </div>
          </>
        )}
        <Button
          disabled={isDisabled}
          colorType={!isTicketHolder ? 'blue' : 'orange'}
          frameType="default"
          height={isTabletWide ? '76px' : '52px'}
          className={clsx(SharedPlayButtonStyle, FullWidthButtonStyle)}
          buttonClassName={clsx(SharedPlayButtonStyle, FullWidthButtonStyle)}
          onClick={onClick}
          buttonId="playButton"
          text={
            isConquestLocked
              ? t('generic.LOCKED')
              : !isTicketHolder
              ? ALLOW_TICKET_SALES
                ? t('play.getTickets')
                : t('generic.LOCKED')
              : isPendingRewards
              ? t('play.exitConquest')
              : t('play.startConquest')
          }
        />
      </>
    )
  }
)

InactiveConquestButton.displayName = 'InactiveConquestButton'
