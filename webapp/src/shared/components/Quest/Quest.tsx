import { ItemType, QuestType } from '@opensky/proto'
import { ArtForQuests } from '@opensky/quests'
import clsx from 'clsx'
import { memo, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { QuestStyle } from '~/shared/style/Quest.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { QuestDifficulty } from '../../types/quests'
import { Button } from '../Button'
import { QuestArt } from './components/QuestArt'
import { QuestDifficultyMark } from './components/QuestDifficultyMark'
import { QuestEpicFrame } from './components/QuestEpicFrame'
import { QuestFrame } from './components/QuestFrame'
import { QuestHover } from './components/QuestHover'
import { QuestNewBadge } from './components/QuestNewBadge'
import { QuestOverlay } from './components/QuestOverlay'
import { QuestOverlayFlash } from './components/QuestOverlayFlash'
import { QuestProgress } from './components/QuestProgress'
import { QuestRerollButton } from './components/QuestRerollButton'
import { QuestReward } from './components/QuestReward'
import { QuestText } from './components/QuestText'
import { QUEST_WRAPPER_CLASSNAME } from './shared/constants'

interface QuestProps {
  difficulty: QuestDifficulty
  progress: number
  endProgress: number
  rewardItemType: ItemType
  rewardAmount: number
  isClaimed?: boolean
  isClaimable?: boolean
  isNew?: boolean
  isLocked?: boolean
  isRerollable?: boolean
  epicIndex?: number
  epicLength?: number
  type: QuestType
  id: number
  onSee?: () => void
  onClaim?: () => void
  onReroll?: () => void
  isClaiming?: boolean
  isRerolling?: boolean
}

export const Quest = memo(
  ({
    isClaimed,
    difficulty,
    isClaimable,
    isNew,
    isLocked,
    endProgress,
    progress,
    rewardItemType,
    rewardAmount,
    isRerollable,
    epicIndex,
    epicLength,
    type,
    onClaim,
    onSee,
    onReroll,
    isClaiming,
    isRerolling
  }: QuestProps) => {
    const { t } = useTranslation()
    const timeOutRef = useRef<number | null>(null)
    const isTabletWide = useResponsiveQuery('tabletWide')

    const _onClaim = useCallback(() => {
      if (!!isClaimable && !isClaimed && !!onClaim) {
        onClaim()
      }
    }, [isClaimable, isClaimed, onClaim])

    useEffect(() => {
      if (isNew && !timeOutRef.current && !!onSee) {
        timeOutRef.current = window.setTimeout(() => {
          onSee()
        }, 2500)
      }
      return () => {
        if (timeOutRef.current) window.clearTimeout(timeOutRef.current)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
      <div
        className={clsx(
          Sprinkles({
            pointerEvents: 'none',
            width: 'full'
          })
        )}
      >
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              pointerEvents: 'all'
            }),
            QuestStyle,
            QUEST_WRAPPER_CLASSNAME
          )}
        >
          <div
            className={Sprinkles({
              width: 'full',
              height: 'full',
              position: 'absolute',
              left: 0,
              top: 0,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start'
            })}
          >
            {!!isNew && <QuestNewBadge />}
            <QuestOverlayFlash isNew={isNew} isClaimed={isClaimed} />
            {!!isClaimable && (
              <div
                className={Sprinkles({
                  pointerEvents: 'none',
                  width: 'full',
                  top: 0,
                  left: 0,
                  height: 'full',
                  position: 'absolute',
                  zIndex: 5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                })}
              >
                <Button
                  text={t('skypass.claimReward').toUpperCase()}
                  frameType="default"
                  colorType="blue"
                  clickSound="CardReward"
                  onClick={_onClaim}
                  buttonId="claim-quest"
                  disabled={isClaiming}
                  height={isTabletWide ? '52px' : '36px'}
                />
              </div>
            )}
            <QuestOverlay
              isLocked={isLocked}
              isClaimable={isClaimable}
              isClaimed={isClaimed}
            />
            <QuestArt artId={ArtForQuests[type]} />
            {!!isRerollable && !!onReroll && !isClaimable && !isClaimed && (
              <QuestRerollButton isRerolling={!!isRerolling} onReroll={onReroll} />
            )}
            <QuestText
              description={t(`quests:${type}.text`)}
              title={t(`quests:${type}.name`)}
            />
            <QuestProgress endProgress={endProgress} progress={progress} />
            <QuestReward
              rewardAmount={rewardAmount}
              rewardItemType={rewardItemType}
              isClaimed={isClaimed}
            />
            <QuestDifficultyMark
              difficulty={difficulty}
              isClaimed={isClaimed}
              isClaimable={isClaimable}
            />
            {!!epicLength && !!epicIndex && (
              <QuestEpicFrame epicLength={epicLength} epicIndex={epicIndex} />
            )}
            <QuestFrame isClaimed={isClaimed} isClaimable={isClaimable} />
            {!isLocked && (
              <QuestHover
                isClaimable={isClaimable}
                isNew={isNew}
                isClaimed={isClaimed}
              />
            )}
          </div>
        </div>
      </div>
    )
  }
)

Quest.displayName = 'Quest'
