import { i18n } from '@opensky/language-manager'
import { Reward, RewardType } from '@opensky/proto'
import device from '@opensky/shared/device'
import { Prism } from '@skyweaver/state-metadata'
import { Color, Vector2 } from 'three'

import { getAssetsManager } from '~/assets/index'
import {
  COLOR_DUSTY_PURPLE,
  COLOR_FIRE_RED,
  COLOR_WHITE
} from '~/colors/colorLibrary'
import { PALETTE_ROW } from '~/constants'
import { isConquestGame } from '~/helpers/envGameModeHelpers'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { MatchEndType } from '~/helpers/typeHelpers'
import Object2D from '~/meshes/Object2D'
import queryParams from '~/queryParams'
import { storeHelper } from '~/state/index'
import { simpleTweener } from '~/systems/animation/tweeners'
import { rankResultText } from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { animationDelay } from '~/utils/asyncUtils'
import { SkipButton } from '~/utils/ui'

import ConquestPointsBar from '../components/ConquestPointsBar'
import { createHeroConclusionCallout } from '../components/HeroConclusionCallout'
import { heroWingsSize } from '../components/matchEndCommonData'
import MatchEndHeaderInfo from '../components/MatchEndHeaderInfo'
import { UI } from '../index'
import { RewardScreenContainer } from './rewardScreen'

export default class RewardConquestPointsContainer extends RewardScreenContainer {
  rowCount = 0
  conquestPointsStage: ConquestPointsBar

  constructor(ui: UI, priority: number) {
    super(ui, 'reward-conquest-points', priority)
  }

  update(dt: number) {
    super.update(dt)
  }

  async prepare(rewards: Reward[]) {
    const conquestPointsRewards = rewards
      .filter(reward => reward.type === RewardType.CONQUEST_POINTS)
      .map(reward => reward.conquestV2TreasureProgress!)
    if (conquestPointsRewards.length > 0) {
      this.conquestPointsStage.prepare(conquestPointsRewards[0])
    }
    await animationDelay(0)
  }
  async present(onSkipButton: SkipButton) {
    await Promise.race([
      (this.conquestPointsStage
        ? this.conquestPointsStage.perform()
        : Promise.resolve()
      ).then(() => animationDelay(queryParams.holdUIDuration || 5000)),
      onSkipButton.onSkip
    ])
  }

  protected async init() {
    const account = await storeHelper.getPlayerAccount()
    const player = await storeHelper.getPlayerState()
    const endType = await storeHelper.getMatchEndType()

    if (isConquestGame || queryParams.fakeRewards || storeHelper.fakeGameOver) {
      this.conquestPointsStage = await createRankStage(
        this,
        endType,
        account.name,
        player.prisms
      )
    }
  }
}

export const ROW_HEIGHT = 54 //TODO: make this const somwehere else
const INIT_HEIGHT = 320 + ROW_HEIGHT
async function createRankStage(
  parent: Object2D,
  endType: MatchEndType,
  name: string,
  prisms: Prism[]
) {
  const mainContainer = new Object2D()
  mainContainer.matrix.setConstraints(
    new Pin(1, 1, 0, -250),
    undefined,
    ReadonlyPin.Center.cloneOffset(0, 45)
  )
  parent.add(mainContainer)
  const heroConclusionCallout = await createHeroConclusionCallout(
    endType,
    prisms
  )
  const heading = new MatchEndHeaderInfo(name)
  heading.matrix.setConstraints(
    Pin.fromPixels(640, 60),
    ReadonlyPin.Top,
    ReadonlyPin.Top.cloneOffset(0, 42)
  )
  parent.add(heading)
  heading.announce(i18n.t(`ui.endTypeMessages.${endType}`), endType)

  const subContainer = new Object2D()
  mainContainer.add(subContainer)
  subContainer.matrix.setConstraints(
    new Pin(0.8, 1, 0, 0),
    ReadonlyPin.Center.clone(),
    ReadonlyPin.Center.cloneOffset(0, device.isMobile ? 0 : 100)
  )
  const outer = mainContainer.matrixWorld.clipSpaceSizeY
  const dH = device.height / INIT_HEIGHT
  const s2 = dH / outer - (device.isMobile ? 0 : 0.7)
  subContainer.matrix.prescale = new Vector2(s2, s2)

  const bar = new ConquestPointsBar()
  subContainer.add(heroConclusionCallout)
  subContainer.add(bar)

  const makeAddRowCallback = () => async (amount: number) => {
    const row = new Object2D()
    row.matrix.opacity = 0
    row.name = 'conquestPointsRow'

    row.matrix.setConstraints(
      Pin.fromPixels(heroWingsSize.width - 35, ROW_HEIGHT),
      ReadonlyPin.Top,
      ReadonlyPin.Top.cloneOffset(0, 290)
    )
    subContainer.add(row)

    const matchResultText = new UITextMesh('CONQUEST POINTS', {
      ...rankResultText,
      color: new Color(0xc5b4f5),
      size: 25,
      align: 'left'
    })
    matchResultText.matrix.setConstraintsPosition(
      ReadonlyPin.Left.cloneOffset(2, -3)
    )
    row.add(matchResultText)

    const conquestPointText = new UITextMesh(`+${amount}`, {
      ...rankResultText,
      color: COLOR_WHITE,
      size: 26,
      align: 'right'
    })
    conquestPointText.matrix.setConstraintsPosition(
      ReadonlyPin.Right.cloneOffset(-20, 0)
    )
    row.add(conquestPointText)

    const divisor = getAssetsManager().fetchMeshDeepClone('uiSmall', 'line')
    divisor.matrix.setColor(COLOR_DUSTY_PURPLE)
    divisor.matrix.setConstraints(
      new Pin(0.9, 0, 0, 1),
      ReadonlyPin.Bottom,
      ReadonlyPin.Bottom,
      new Vector2(15, 1)
    )
    row.add(divisor)

    const conquestPointIcon = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'icon-petal'
    )
    conquestPointIcon.material.paletteRow = PALETTE_ROW.CONQUEST_POINTS
    conquestPointIcon.matrix.setColor(COLOR_FIRE_RED)
    conquestPointIcon.matrix.setConstraints(
      Pin.fromPixels(18, 18),
      ReadonlyPin.Right,
      ReadonlyPin.Right.cloneOffset(-65, 10),
      new Vector2(1, 1)
    )
    row.add(conquestPointIcon)

    // Fade in results row
    await simpleTweener.to({
      description: 'show matchResultText',
      target: row.matrix,
      propertyGoals: {
        opacity: 1
      },
      duration: 500
    }).finished
  }

  bar.onBeforeConquestPointsChange(makeAddRowCallback())
  return bar
}
