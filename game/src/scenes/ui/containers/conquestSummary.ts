import { i18n } from '@opensky/language-manager'
import device from '@opensky/shared/device'
import { delayPromise } from '@opensky/shared/utils/async'
import { Prism } from '@skyweaver/state-metadata'
import { Color, Vector2 } from 'three'

import { getAssetsManager } from '~/assets/index'
import {
  COLOR_DUSTY_PURPLE,
  COLOR_PRIZE_UPGRADE_CYAN
} from '~/colors/colorLibrary'
import { getPrematchConquestProgress } from '~/helpers/conquestProgressHelpers'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { MatchEndType } from '~/helpers/typeHelpers'
import Object2D from '~/meshes/Object2D'
import queryParams from '~/queryParams'
import { storeHelper } from '~/state/index'
import { simpleTweener } from '~/systems/animation/tweeners'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { getRewardIconPrefab } from '~/tests/helpers/rewardIconFactory'
import { simple01Animation } from '~/utils/animationUtils'
import { animationDelay } from '~/utils/asyncUtils'
import { SkipButton } from '~/utils/ui'

import { createHeroConclusionCallout } from '../components/HeroConclusionCallout'
import { heroWingsSize } from '../components/matchEndCommonData'
import MatchEndHeaderInfo from '../components/MatchEndHeaderInfo'
import ProgressionLine from '../components/ProgressionLine'
import {
  getPrematchConquestProgressTicks,
  TickIndicator
} from '../components/ProgressionTick'
import RewardsPanel from '../components/rewardsPanel'
import UIContainer from '../components/UIContainer'
import { UI } from '../index'
import { ROW_HEIGHT } from './rewardConquestPoints'
import { RewardScreenContainer } from './rewardScreen'

export default class ConquestSummaryContainer extends RewardScreenContainer {
  constructor(ui: UI, priority: number) {
    super(ui, 'conquest-summary', priority)
  }

  protected async init() {
    const account = await storeHelper.getPlayerAccount()
    const player = await storeHelper.getPlayerState()
    const endType = await storeHelper.getMatchEndType()

    await createConquestStage(this, endType, account.name, player.prisms)
  }
  async present(onSkipButton: SkipButton) {
    await Promise.race([
      delayPromise(queryParams.holdUIDuration || 5000),
      onSkipButton.onSkip
    ])
  }
}

const INIT_HEIGHT = 320 + 54

async function createConquestStage(
  parent: UIContainer,
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
  const subContainer = new Object2D()
  mainContainer.add(subContainer)
  subContainer.matrix.setConstraints(
    new Pin(0.8, 1, 0, 0),
    ReadonlyPin.Center.clone(),
    ReadonlyPin.Center.cloneOffset(0, device.isMobile ? 0 : 100)
  )
  const heading = new MatchEndHeaderInfo(name)
  heading.matrix.setConstraints(
    Pin.fromPixels(640, 60),
    ReadonlyPin.Top,
    ReadonlyPin.Top.cloneOffset(0, 42)
  )
  parent.add(heading)
  heading.announce(i18n.t(`ui.endTypeMessages.${endType}`), endType)
  const outer = mainContainer.matrixWorld.clipSpaceSizeY
  const dH = device.height / INIT_HEIGHT
  const s2 = dH / outer - (device.isMobile ? 0 : 0.7)
  subContainer.matrix.prescale = new Vector2(s2, s2)

  subContainer.add(heroConclusionCallout)
  const panelContainer = new RewardsPanel()
  panelContainer.shouldRenderAsGroup = true
  const rowContainer = new Object2D()

  rowContainer.matrix.setConstraints(
    Pin.fromPixels(heroWingsSize.width - 35, ROW_HEIGHT),
    ReadonlyPin.Top,
    ReadonlyPin.Top.cloneOffset(0, 290)
  )
  subContainer.add(panelContainer)
  subContainer.add(rowContainer)

  const { initProgress, currentMatch, matchProgress } =
    await getPrematchConquestProgress()
  const ticks = getPrematchConquestProgressTicks(matchProgress)

  const matchesWon = { won: currentMatch }

  const progressBar = new ProgressionLine({
    ticks,
    initProgress,
    tickRadius: 10,
    tickThickness: 2
  })

  progressBar.mesh.matrix.setConstraints(
    new Pin(1, 0, -420, 2),
    ReadonlyPin.Center,
    ReadonlyPin.Center.cloneOffset(0, -22)
  )
  panelContainer.add(progressBar.mesh)

  for (let i = 1; i <= 3; i++) {
    const matchLabel = new UITextMesh('Match ' + i, {
      ...textOptions.splashDescription,
      size: 20
    })
    panelContainer.add(matchLabel)
    matchLabel.matrix.setConstraintsPosition(
      ReadonlyPin.Center.cloneOffset((i - 2) * 100, 7)
    )
  }

  if (currentMatch > 0 || endType === 'victory') {
    const rewardsText = new UITextMesh('CONQUEST END REWARD', {
      ...textOptions.rankResultText,
      color: new Color(0xc5b4f5),
      size: 26,
      align: 'left'
    })
    rowContainer.add(rewardsText)
    rewardsText.matrix.setConstraintsPosition(
      ReadonlyPin.Left.cloneOffset(2, -3)
    )
  }
  const divisor = getAssetsManager().fetchMeshDeepClone('uiSmall', 'line')
  divisor.matrix.setColor(COLOR_DUSTY_PURPLE)
  divisor.matrix.setConstraints(
    new Pin(0.9, 0, 0, 1),
    ReadonlyPin.Bottom,
    ReadonlyPin.Bottom,
    new Vector2(15, 1)
  )
  rowContainer.add(divisor)
  const { pivot: icon, anim } = getRewardIconPrefab(currentMatch / 3)
  rowContainer.add(icon)
  icon.matrix.setConstraintsPosition(ReadonlyPin.Right.cloneOffset(-20, 0))
  if (endType === 'victory') {
    const upgradeTextPin = ReadonlyPin.Right.cloneOffset(-35, 0)
    const arrowPin = upgradeTextPin.clone()
    const rewardsUpgradedText = new UITextMesh(
      'UPGRADED!',
      textOptions.rewardUpgraded,
      undefined,
      undefined,
      undefined,
      mesh => {
        arrowPin.x.offset = upgradeTextPin.x.offset - mesh.width - 15
      }
    )
    rowContainer.add(rewardsUpgradedText)
    rewardsUpgradedText.matrix.setConstraintsPosition(upgradeTextPin)
    const arrow = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'ui-icon-arrow-up'
    )
    arrow.matrix.setColor(COLOR_PRIZE_UPGRADE_CYAN)
    rowContainer.add(arrow)
    arrow.matrix.setConstraintsPosition(arrowPin)
    arrow.matrix.prescale = new Vector2(1.4, 1.4)
    function updateUpgradeOpacities(v: number) {
      rewardsUpgradedText.material.userData.originalOpacity = v
      arrow.material.userData.originalOpacity = v
      rewardsUpgradedText.opacity = v
      arrow.material.opacity = v
    }
    updateUpgradeOpacities(0)
    simple01Animation(updateUpgradeOpacities)
  }
  animationDelay(1000).then(() => {
    const winner = endType === 'victory'
    progressBar.setCurrentTickIndicator(__endTypeIndicators[endType])

    if (winner) {
      matchesWon.won++
      simpleTweener.to({
        description: 'conquest summary icon anim',
        target: anim,
        propertyGoals: { value: (currentMatch + 1) / 3 },
        duration: 1000
      })
    }
  })
}

const __endTypeIndicators: { [K in MatchEndType]: TickIndicator } = {
  victory: TickIndicator.CHECK_BLUE,
  defeat: TickIndicator.X,
  tie: TickIndicator.CURRENT_BIG
}
