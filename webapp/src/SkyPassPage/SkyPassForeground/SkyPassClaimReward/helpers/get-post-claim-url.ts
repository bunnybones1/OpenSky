import { ClaimSkypassRewardsReturn, RewardType } from '~/lib/proto'
import { ROUTES_CONFIG } from '~/shared/constants/routes'

import { CARD_WITH_UP_FLOWS } from '../shared/constants'

export const getPostClaimURL = (response: ClaimSkypassRewardsReturn) => {
  const heroReward = response.rewards.find(
    (reward) => reward.type === RewardType.HERO
  )
  const cardReward = response.rewards.find(
    (reward) => reward.type === RewardType.CARD
  )

  let idToUse: string | undefined

  if (heroReward) {
    idToUse = heroReward.hero?.hero
  } else if (
    cardReward &&
    !!cardReward.card?.card.id &&
    CARD_WITH_UP_FLOWS.includes(cardReward.card?.card.id)
  ) {
    idToUse = String(cardReward.card.card.id)
  }

  if (!!idToUse) {
    const currentParams = new URLSearchParams(window.location.search)

    currentParams.append('recentlyClaimed', idToUse)

    return `${ROUTES_CONFIG.routes.SKY_PASS.directPath}?${currentParams.toString()}`
  }

  return
}
