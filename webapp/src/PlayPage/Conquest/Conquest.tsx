import { ConquestStatus } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { ALLOW_TICKET_SALES } from '~/shared/constants/flags'
import { GameType } from '~/shared/constants/ranks'
import { useIsInQueue } from '~/shared/hooks/useIsInQueue'
import { useConquestStatus } from '~/shared/queries/play/useConquestStatus'
import { useGameModesStatus } from '~/shared/queries/play/useGameModesStatus'
import { useConquestAndUSDCBalances } from '~/shared/queries/useConquestAndUSDCBalances'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckSelector } from '../shared/components/DeckSelector/DeckSelector'
import { GameModeDescription } from '../shared/components/GameModeDescription'
import { GameModeHeader } from '../shared/components/GameModeHeader/GameModeHeader'
import { PlayPageBackground } from '../shared/components/PlayPageBackground'
import { PlayPageInner } from '../shared/components/PlayPageInner'
import {
  SharedPlayPageBottomStyle,
  SharedPlayPageStyle
} from '../shared/style/SharedPlayPageStyle.css'
import { ActiveConquestButton } from './components/ActiveConquestButton'
import { ActiveConquestProgressChecks } from './components/ActiveConquestProgressChecks'
import { ConquestPointsExplanation } from './components/ConquestPointsExplanation'
import { PurchaseConquestTicketsButton } from './components/PurchaseConquestTicketsButton'
import {
  ConquestBgOffset,
  ConquestButtonInactiveSection,
  ConquestGradient,
  ConquestProgressBarSection
} from './Conquest.css'
import ConquestInfo from './ConquestInfo/ConquestInfo'
import { ConquestProgressBar } from './ConquestProgressBar/ConquestProgressBar'
import { useNotifyConquestTicketStatus } from './hooks/useNotifyConquestTicketStatus'
import { InactiveConquestButton } from './InactiveConquestButton/InactiveConquestButton'
import { useIsConquestLocked } from './shared/hooks/useIsConquestLocked'

export const Conquest = memo(() => {
  const { data: tokenBalances } = useConquestAndUSDCBalances(true)

  const totalConquestTicketBalance = tokenBalances?.conquestTicketBalance.total

  const { t } = useTranslation()

  const { data: conquestStatus, isLoading: isConquestLoading } = useConquestStatus()
  const { data: gameModesStatus } = useGameModesStatus()
  const isConquestAvailable = gameModesStatus?.conquestConstructed === true

  const isActiveConquest =
    !!conquestStatus && conquestStatus.status === ConquestStatus.IN_PROGRESS

  const isPendingRewards =
    !!conquestStatus && conquestStatus.status === ConquestStatus.REWARDS_PENDING

  const hasConquestTickets = useMemo(() => {
    if (!!totalConquestTicketBalance && totalConquestTicketBalance > 0) {
      return true
    }
    return false
  }, [totalConquestTicketBalance])

  const isConquestLocked = useIsConquestLocked()

  const { isInQueue } = useIsInQueue()

  const backgroundImage = useMemo(() => {
    if (isConquestLocked) return 'conquest.webp'
    if (!conquestStatus) {
      return hasConquestTickets ? 'conquestwithticket.webp' : 'conquest.webp'
    } else {
      return `conquestactive${conquestStatus.wins + 1}.webp`
    }
  }, [conquestStatus, hasConquestTickets, isConquestLocked])

  useNotifyConquestTicketStatus(isActiveConquest)

  return (
    <>
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            height: 'auto',
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center'
          }),
          SharedPlayPageStyle
        )}
      >
        <PlayPageBackground
          isLoading={conquestStatus === undefined}
          bgUrl={`webapp/backgrounds/${backgroundImage}`}
        />
        <PlayPageInner
          className={ConquestBgOffset}
          bgUrl={`webapp/backgrounds/${backgroundImage}`}
          isLoading={conquestStatus === undefined}
        >
          {ALLOW_TICKET_SALES && isConquestAvailable && (
            <PurchaseConquestTicketsButton />
          )}
          {!!isActiveConquest && <ActiveConquestProgressChecks />}
          <div
            className={clsx(
              Sprinkles({
                width: 'full',
                height: 'full',
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none'
              }),
              { isConquestLocked },
              ConquestGradient
            )}
          />
          <>
            <GameModeHeader
              title={t('play.gameModes.header.CONQUEST')}
              page="CONQUEST"
            />
            <GameModeDescription description={t('playPage.CONQUEST.description')} />
            <div
              className={Sprinkles({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-start'
              })}
            >
              {!isConquestLoading && (
                <>
                  <DeckSelector
                    isLocked={isInQueue}
                    selectedGameType={GameType.CONSTRUCTED}
                    isConquest
                  />
                  {isActiveConquest && <ConquestPointsExplanation />}
                </>
              )}
            </div>
            {!isConquestLoading && !isActiveConquest && (
              <div
                className={clsx(
                  Sprinkles({
                    width: 'full',
                    position: 'absolute',
                    display: 'flex',
                    justifyContent: 'center'
                  }),
                  ConquestButtonInactiveSection
                )}
              >
                <InactiveConquestButton
                  isInQueue={isInQueue}
                  isPendingRewards={isPendingRewards}
                  isConquestLocked={isConquestLocked}
                  isConquestAvailable={isConquestAvailable}
                  tradeableTickets={tokenBalances?.conquestTicketBalance.tradable}
                  untradeableTickets={
                    tokenBalances?.conquestTicketBalance.nonTradable
                  }
                />
              </div>
            )}
            {!isConquestLoading && (
              <div
                className={clsx(
                  Sprinkles({
                    display: 'grid',
                    width: 'full',
                    position: 'absolute',
                    left: 0,
                    paddingX: { base: '12px', tablet: '20px' }
                  }),
                  SharedPlayPageBottomStyle
                )}
              >
                <div
                  className={clsx({ isActiveConquest }, ConquestProgressBarSection)}
                >
                  <ConquestProgressBar />
                </div>
                {isActiveConquest ? (
                  <ActiveConquestButton isInQueue={isInQueue} />
                ) : null}
              </div>
            )}
          </>
        </PlayPageInner>
      </div>
      <ConquestInfo />
    </>
  )
})

Conquest.displayName = 'Conquest'
