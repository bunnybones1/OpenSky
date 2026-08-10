import { getCardBackID } from '@opensky/shared/assetsIDs'
import { useQuery } from '@tanstack/react-query'
import orderBy from 'lodash-es/orderBy'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { ItemType, SkypassLevel, SkypassTier } from '~/lib/proto'
import { APIClient, GlobalQueryClient } from '~/shared/clients'
import { SKYPASS_INFO } from '~/shared/constants/react-query-keys'
import { authenticationState } from '~/shared/state/authentication-state'
import { skypassSelectorState } from '~/shared/state/skypass-state'

import { AllCardBacks } from '../constants/card-backs'
import { IS_PREMIUM_SKYPASS_AVAILABLE } from '../constants/skypass'
import { FIVE_SECONDS, ONE_DAY } from '../constants/time'
import { useCardTotals } from '../hooks/cards/useCardTotals'
import { useCardBalanceOverview } from './cards/useCardBalanceOverview'
import { useSeasonInfo } from './useSeasonInfo'

const CARDBACK_INDEX = 50

const seasonArtistNames: { [K: number]: string } = {
  16: 'pablo-01', // cardBackSkull
  17: 'pablo-03', // cardBackArcadeum
  18: 'pablo-06', // cardBackScrappy
  19: 'pablo-04', // cardBackClockwork
  20: 'pablo-05', // cardBackReefus
  21: 'pablo-02', // cardBackFairy
  22: 'pablo-12', // cardBackVacation
  23: 'giaco-01', // cardBackFunGuy
  24: 'pablo-08', // cardBackStinkyEye
  25: 'gname-01', // cardBackTreasureMap
  26: 'pablo-07', // cardBackPumpkin
  27: 'mara-03', // cardBackArmis
  28: 'mara-02', // cardBackCookie
  29: 'mara-06', // cardBackWaterfulBalls
  30: 'gname-02', // cardBackPicnicCake
  31: 'mara-07', // cardBackMuralLotus
  32: 'mara-09', // cardBackMuralAri
  //
  33: 'pablo-01', // cardBackSkull
  34: 'pablo-03', // cardBackArcadeum
  35: 'pablo-06', // cardBackScrappy
  36: 'pablo-04', // cardBackClockwork
  37: 'pablo-05', // cardBackReefus
  38: 'pablo-02', // cardBackFairy
  39: 'pablo-12', // cardBackVacation
  40: 'giaco-01', // cardBackFunGuy
  41: 'pablo-08', // cardBackStinkyEye
  42: 'gname-01', // cardBackTreasureMap
  43: 'pablo-07', // cardBackPumpkin
  44: 'mara-03', // cardBackArmis
  45: 'mara-02', // cardBackCookie
  46: 'mara-06', // cardBackWaterfulBalls
  47: 'gname-02', // cardBackPicnicCake
  48: 'mara-07', // cardBackMuralLotus
  49: 'mara-09', // cardBackMuralAri
  //
  50: 'pablo-01', // cardBackSkull
  51: 'pablo-03', // cardBackArcadeum
  52: 'pablo-06', // cardBackScrappy
  53: 'pablo-04', // cardBackClockwork
  54: 'pablo-05', // cardBackReefus
  55: 'pablo-02', // cardBackFairy
  56: 'pablo-12', // cardBackVacation
  57: 'giaco-01', // cardBackFunGuy
  58: 'pablo-08', // cardBackStinkyEye
  59: 'gname-01', // cardBackTreasureMap
  60: 'pablo-07', // cardBackPumpkin
  61: 'mara-03', // cardBackArmis
  62: 'mara-02', // cardBackCookie
  63: 'mara-06', // cardBackWaterfulBalls
  64: 'gname-02', // cardBackPicnicCake
  65: 'mara-07', // cardBackMuralLotus
  66: 'mara-09', // cardBackMuralAri
  //
  67: 'pablo-01', // cardBackSkull
  68: 'pablo-03', // cardBackArcadeum
  69: 'pablo-06', // cardBackScrappy
  70: 'pablo-04', // cardBackClockwork
  71: 'pablo-05', // cardBackReefus
  72: 'pablo-02', // cardBackFairy
  73: 'pablo-12', // cardBackVacation
  74: 'giaco-01', // cardBackFunGuy
  75: 'pablo-08', // cardBackStinkyEye
  76: 'gname-01', // cardBackTreasureMap
  77: 'pablo-07', // cardBackPumpkin
  78: 'mara-03', // cardBackArmis
  79: 'mara-02', // cardBackCookie
  80: 'mara-06', // cardBackWaterfulBalls
  81: 'gname-02', // cardBackPicnicCake
  82: 'mara-07', // cardBackMuralLotus
  83: 'mara-09' // cardBackMuralAri
}

export interface SkyPassInfo {
  hasPremium: boolean
  levels: SkypassLevel[]
  seasonName: string
  seasonNumber: number
  cardBackName?: string
  seasonArtistName?: string
}

export const useSkyPassInfo = () => {
  const { t } = useTranslation()
  const { userAddress } = useSnapshot(authenticationState)

  const { data: balanceOverview } = useCardBalanceOverview({ address: userAddress })
  const { data: seasonInfo } = useSeasonInfo()
  const cardTotals = useCardTotals()
  const { paymentHasCompleted } = useSnapshot(skypassSelectorState)

  return useQuery<SkyPassInfo>(
    SKYPASS_INFO,
    async () => {
      const { res } = await APIClient.opensky.listSkypassRewards({
        season: seasonInfo?.currentSeason
      })

      const { hasPremium, levels, seasonName, seasonNumber } = res

      const showPremiumItems = IS_PREMIUM_SKYPASS_AVAILABLE || hasPremium

      const orderedLevels = orderBy(levels, ['level'])

      const numOwnedCards =
        balanceOverview?.frameBalanceOverview[ItemType.SW_BASE_CARDS].owned

      const numBaseCardsLeftToUnlock = cardTotals.TOTAL - (numOwnedCards ?? 0)

      let freeBaseCardVouchers = numBaseCardsLeftToUnlock
      let premiumBaseCardVouchers = numBaseCardsLeftToUnlock

      // only show free base card rewards up to the max number of remaining locked base cards
      for (const level of orderedLevels) {
        level.rewards = level.rewards.filter((reward) => {
          if (reward.itemType !== ItemType.SW_BASE_CARDS || reward.claimed) {
            return true
          }
          if (reward.tier !== SkypassTier.PREMIUM) {
            if (freeBaseCardVouchers > 0) {
              freeBaseCardVouchers -= reward.amount || 1
              // once a free reward is earned, you can remove a premium one
              // because it wouldn't be possible to claim that many if the user went premium
              if (level.earned) {
                premiumBaseCardVouchers -= reward.amount || 1
              }
              return true
            } else {
              return false
            }
          }
          return true
        })
      }

      // only show premium base card rewards up to the max number of
      // remaining locked base cards minus all earned free ones
      for (const level of orderedLevels) {
        if (!showPremiumItems) {
          level.rewards = level.rewards.filter((r) => r.tier === SkypassTier.FREE)
        }
        level.rewards = level.rewards.filter((reward) => {
          if (reward.itemType !== ItemType.SW_BASE_CARDS || reward.claimed) {
            return true
          }
          if (reward.tier === SkypassTier.PREMIUM && showPremiumItems) {
            if (premiumBaseCardVouchers > 0) {
              premiumBaseCardVouchers -= reward.amount || 1
              return true
            } else {
              return false
            }
          } else {
            return true
          }
        })
      }

      const currentCardBackId = orderedLevels[CARDBACK_INDEX]?.rewards.find(
        (reward) => reward.itemType === ItemType.SW_CARD_BACKS
      )?.attributes.tokenIDs[0]

      const cardBack = !!currentCardBackId
        ? AllCardBacks.get(getCardBackID(currentCardBackId))
        : undefined

      return {
        hasPremium,
        levels: orderedLevels.filter((r) => r.rewards.length > 0),
        seasonName:
          seasonName === 'unknown' ? t('skypass.unknownSeasonName') : seasonName,
        seasonNumber,
        cardBackName: cardBack?.artID,
        seasonArtistName: seasonArtistNames[seasonNumber]
      }
    },
    {
      enabled: !!userAddress && !!seasonInfo && !!balanceOverview,
      staleTime: ONE_DAY,
      refetchInterval: paymentHasCompleted === false ? FIVE_SECONDS : undefined
    }
  )
}

export const getSkyPassInfo = () => {
  return GlobalQueryClient.getQueryData<SkyPassInfo | undefined>(SKYPASS_INFO)
}
