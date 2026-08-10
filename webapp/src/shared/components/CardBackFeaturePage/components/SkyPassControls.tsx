import { ItemType } from '@opensky/proto'
import { getCardBackID } from '@opensky/shared/assetsIDs'
import { useCallback, useMemo } from 'react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { createSearchParams } from 'react-router-dom'
import { push } from 'redux-first-history'

import { Button } from '~/shared/components/Button'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useSkyPassInfo } from '~/shared/queries/useSkyPassInfo'
import { useDispatch } from '~/shared/redux/index'
import { updateSkypassSelectorState } from '~/shared/state/skypass-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

interface ShopControlsProps {
  id: number
}

export const SkyPassControls = memo(({ id }: ShopControlsProps) => {
  const { data: skyPassInfo } = useSkyPassInfo()
  const dispatch = useDispatch()
  const { t } = useTranslation()

  const isInCurrentSkypass = useMemo(() => {
    return !!skyPassInfo?.levels?.some((level) => {
      return level.rewards.some((reward) => {
        const isCardBack = reward.itemType === ItemType.SW_CARD_BACKS
        return (
          isCardBack && !!reward.attributes.tokenIDs.map(getCardBackID).includes(id)
        )
      })
    })
  }, [id, skyPassInfo])

  const onClick = useCallback(() => {
    let cardBackReward: undefined | number
    let cardBackLevel: undefined | number

    if (isInCurrentSkypass && skyPassInfo) {
      cardBackLevel = skyPassInfo.levels.find((level) => {
        const cardBack = level.rewards.findIndex((reward) => {
          return (
            reward.itemType === ItemType.SW_CARD_BACKS &&
            !!reward.attributes.tokenIDs.map(getCardBackID).includes(id)
          )
        })

        if (cardBack !== undefined) {
          cardBackReward = cardBack
          return true
        }
        return false
      })?.level
    }

    if (!!cardBackLevel) {
      updateSkypassSelectorState('selectedLevelAndReward', {
        level: cardBackLevel,
        reward: cardBackReward
      })
    }
    dispatch(
      push(
        `${ROUTES_CONFIG.routes.SKY_PASS.directPath}?${createSearchParams({
          level: cardBackLevel ? String(cardBackLevel) : '0',
          reward: cardBackReward ? String(cardBackReward) : '0'
        })}`
      )
    )
  }, [dispatch, id, isInCurrentSkypass, skyPassInfo])

  if (!isInCurrentSkypass) return null

  return (
    <div
      className={Sprinkles({
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 2,
        paddingRight: '48px',
        paddingTop: '48px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        flexDirection: 'column'
      })}
    >
      <Button
        colorType="orange"
        frameType="default"
        onClick={onClick}
        text={t('cardBack.viewOnSkypass')}
      />
    </div>
  )
})

SkyPassControls.displayName = 'SkyPassControls'
