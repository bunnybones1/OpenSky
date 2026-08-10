import { Account, Reward } from '@opensky/proto'

import { animationDelay } from '~/utils/asyncUtils'
import { SkipButton } from '~/utils/ui'

import UIContainer from '../components/UIContainer'
import { UI } from '../index'

export abstract class RewardScreenContainer extends UIContainer {
  constructor(
    ui: UI,
    private _rewardTypeName: string,
    priority: number
  ) {
    super(ui, _rewardTypeName, {
      priority
    })
  }
  async prepare(_rewards: Reward[], _account: Account): Promise<void> {
    await animationDelay(0)
    return
  }

  abstract present(onSkipButton: SkipButton): Promise<void>
}
