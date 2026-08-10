import { i18n } from '@opensky/language-manager'
import { Account, GameMode, Reward, RewardType } from '@opensky/proto'
import { getLocalStorageInt } from '@opensky/shared/utils/localStorage'
import { Prism } from '@skyweaver/state-metadata'
import { Color, Vector2 } from 'three'

import { getAssetsManager } from '~/assets/index'
import { COLOR_PRIZE_UPGRADE_CYAN } from '~/colors/colorLibrary'
import { gameMode, LocalGameMode } from '~/helpers/envGameModeHelpers'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { MatchEndType } from '~/helpers/typeHelpers'
import Object2D from '~/meshes/Object2D'
import queryParams from '~/queryParams'
import { store, storeHelper } from '~/state/index'
import { simpleTweener } from '~/systems/animation/tweeners'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { getTutorial } from '~/tutorial/Tutorial'
import AnimatedNumber from '~/utils/AnimatedNumber'
import { animationDelay } from '~/utils/asyncUtils'
import { SkipButton } from '~/utils/ui'

import { createHeroConclusionCallout } from '../components/HeroConclusionCallout'
import { heroWingsSize } from '../components/matchEndCommonData'
import MatchEndHeaderInfo from '../components/MatchEndHeaderInfo'
import RankBar, {
  CONTAINER_HEIGHT,
  CONTAINER_WIDTH
} from '../components/RankBar'
import { RankedGameMode } from '../components/rankConstants'
import { UI } from '../index'
import { RewardScreenContainer } from './rewardScreen'

const defeatRankPointColor = new Color(0xc32519)
const darkPurple = new Color(0x2a2251)
export default class RewardRankContainer extends RewardScreenContainer {
  skipButton: SkipButton
  rowCount = 0
  rankStage: {
    bar: RankBar
    update: () => void
    addUnrankedMessage: () => void
  }

  constructor(ui: UI, priority: number) {
    super(ui, 'reward-rank', priority)
  }

  update(dt: number) {
    super.update(dt)
    if (this.rankStage) {
      this.rankStage.update()
    }
  }

  async prepare(rewards: Reward[], account: Account) {
    const rankRewards = rewards
      .filter(reward => reward.type === RewardType.RANK)
      .map(reward => reward.rank!)
    const player = await storeHelper.getPlayerState()
    const endType = await storeHelper.getMatchEndType()
    if (gameMode === GameMode.TUTORIAL && queryParams.lethalPuzzleURL) {
      await createLethalPuzzleStage(this, player.prisms)
    } else if (
      gameMode === GameMode.PRACTICE_BOT ||
      gameMode === GameMode.PRACTICE_PVP ||
      gameMode === LocalGameMode.LOCAL_BOT ||
      gameMode === GameMode.CHALLENGE_CONSTRUCTED ||
      gameMode === GameMode.CHALLENGE_DISCOVERY ||
      gameMode === GameMode.TUTORIAL
    ) {
      await createPracticeStage(this, endType, account.name, player.prisms)
    } else {
      this.rankStage = await createRankStage(
        this,
        gameMode as RankedGameMode,
        endType,
        account.name,
        player.prisms
      )
    }
    // we always show rank rewards if there are any, if above level 15
    if (this.rankStage && rankRewards.length > 0) {
      this.rankStage.bar.prepare(rankRewards[0])
    }
  }
  async present(onSkipButton: SkipButton) {
    await Promise.race([
      (this.rankStage ? this.rankStage.bar.perform() : Promise.resolve()).then(
        () => animationDelay(queryParams.holdUIDuration || 5000)
      ),
      onSkipButton.onSkip
    ])
    onSkipButton.button.mesh.visible = false
  }

  protected async init() {
    // no init
  }
}

const ROW_HEIGHT = 54
const INIT_HEIGHT = 320
export async function createRankStage(
  parent: Object2D,
  gameMode: RankedGameMode,
  endType: MatchEndType,
  name: string,
  prisms: Prism[]
) {
  const mainContainer = new Object2D()
  mainContainer.matrix.setConstraints(
    new Pin(1, 1, 0, -250),
    undefined,
    ReadonlyPin.Center.cloneOffset(0, 25)
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
    new Pin(0.8, 0, 0, INIT_HEIGHT),
    ReadonlyPin.Center.clone(),
    ReadonlyPin.Center.cloneOffset(0, 0)
  )
  const bar = new RankBar(gameMode)

  subContainer.add(heroConclusionCallout)
  subContainer.add(bar)

  const rowCount = new AnimatedNumber(v => {
    subContainer.matrix.size.y.offset = INIT_HEIGHT + v * ROW_HEIGHT
  })
  const addUnrankedMessage = async () => {
    const row = new Object2D()
    row.matrix.opacity = 0
    row.name = 'rankRow'

    row.matrix.setConstraints(
      Pin.fromPixels(heroWingsSize.width - 95, ROW_HEIGHT),
      ReadonlyPin.Top,
      ReadonlyPin.Top.cloneOffset(
        0,
        (rowCount.value - 1) * ROW_HEIGHT + INIT_HEIGHT + 10
      )
    )
    rowCount.value++
    subContainer.add(row)
    const matchResultText = new UITextMesh('', {
      ...textOptions.rankResultText,
      color: new Color(0xc5b4f5),
      size: 20,
      align: 'center'
    })
    matchResultText.matrix.setConstraintsPosition(
      ReadonlyPin.Center.cloneOffset(0, -10)
    )
    matchResultText.material.depth = -0.999
    matchResultText.text = i18n.t('ui.rewardRank.reachWandererRankToUnlock')
    row.add(matchResultText)
    const divisor = getAssetsManager().fetchMeshDeepClone('uiSmall', 'line')
    divisor.matrix.setColor(darkPurple)
    divisor.matrix.setConstraints(
      new Pin(0.5, 0, 0, 1),
      ReadonlyPin.Bottom,
      ReadonlyPin.Bottom.cloneOffset(0, -10),
      new Vector2(10, 1)
    )
    row.add(divisor)
    await simpleTweener.to({
      description: 'show matchResultText',
      target: row.matrix,
      propertyGoals: {
        opacity: 1
      },
      duration: 500
    }).finished
  }
  const makeAddRowCallback =
    () => async (amount: number, rankChange?: 'up' | 'down' | false) => {
      const row = new Object2D()
      row.matrix.opacity = 0
      row.name = 'rankRow'

      row.matrix.setConstraints(
        Pin.fromPixels(heroWingsSize.width - 95, ROW_HEIGHT),
        ReadonlyPin.Top,
        ReadonlyPin.Top.cloneOffset(
          0,
          (rowCount.value - 1) * ROW_HEIGHT + INIT_HEIGHT + 10
        )
      )
      rowCount.value++
      subContainer.add(row)

      const matchResultText = new UITextMesh('', {
        ...textOptions.rankResultText,
        color: new Color(0xc5b4f5),
        size: 20,
        align: 'left'
      })
      matchResultText.matrix.setConstraintsPosition(ReadonlyPin.Left)
      row.add(matchResultText)

      const rankPointText = new UITextMesh('', {
        ...textOptions.rankResultText,
        color: COLOR_PRIZE_UPGRADE_CYAN,
        size: 20,
        align: 'right'
      })
      rankPointText.matrix.setConstraintsPosition(
        ReadonlyPin.Right.cloneOffset(-20, 0)
      )
      row.add(rankPointText)

      const divisor = getAssetsManager().fetchMeshDeepClone('uiSmall', 'line')
      divisor.matrix.setColor(darkPurple)
      divisor.matrix.setConstraints(
        new Pin(0.5, 0, 0, 1),
        ReadonlyPin.Bottom,
        ReadonlyPin.Bottom,
        new Vector2(10, 1)
      )
      row.add(divisor)

      const pointsChangeText = `${i18n.t('ui.rewardRank.rankPoints', {
        count: amount,
        sign: amount > 0 ? '+' : ''
      })}`

      if (rankChange) {
        rankPointText.text =
          (rankChange === 'up'
            ? i18n.t('ui.rewardRank.rankUp')
            : i18n.t('ui.rewardRank.rankDown')) + ` (${pointsChangeText})`
      } else {
        rankPointText.text = pointsChangeText
      }

      let color = COLOR_PRIZE_UPGRADE_CYAN
      if (amount > 0) {
        matchResultText.text = i18n.t('ui.rewardRank.matchWin')
      } else if (
        amount < 0 ||
        storeHelper.getPlayerConceded() ||
        endType === 'defeat'
      ) {
        matchResultText.text = i18n.t('ui.rewardRank.matchLoss')
        color = defeatRankPointColor
      } else {
        matchResultText.text = i18n.t('ui.rewardRank.matchTie')
      }
      rankPointText.color = color

      const rankPointIcon = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        amount >= 0 ? 'ui-icon-arrow-up' : 'ui-icon-arrow-down'
      )
      rankPointIcon.matrix.setColor(color)
      rankPointIcon.matrix.setConstraints(
        Pin.fromPixels(18, 18),
        ReadonlyPin.Right,
        ReadonlyPin.Right.cloneOffset(10, 10),
        new Vector2(1.6, 1.1)
      )
      row.add(rankPointIcon)

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

  bar.onRankUp(() => heading.announce(i18n.t('ui.rewardRank.rankUp'), 'rankup'))
  bar.onRankDown(() =>
    heading.announce(i18n.t('ui.rewardRank.rankDown'), 'rankup')
  )
  bar.onBeforeRankPointsChange(makeAddRowCallback())

  const update = () => {
    const outer = mainContainer.matrixWorld.clipSpaceSizeY
    const inner = subContainer.matrixWorld.clipSpaceSizeY
    const s = mainContainer.matrix.prescale.y
    const s2 = Math.min(1, (s * outer) / inner)
    mainContainer.matrix.prescale = new Vector2(s2, s2)
  }

  return { bar, update, addUnrankedMessage }
}

async function createPracticeStage(
  parent: Object2D,
  endType: MatchEndType,
  name: string,
  prisms: Prism[]
) {
  const matchEndMessages = {
    victory: i18n.t('ui.playRankedEndMessages.victory'),
    defeat: i18n.t('ui.playRankedEndMessages.defeat'),
    tie: i18n.t('ui.playRankedEndMessages.tie')
  }
  const hordeEndMessages = {
    victory: i18n.t('ui.hordeEndMessages.victory'),
    defeat: i18n.t('ui.hordeEndMessages.youDealtXDamageToHordeBoss', {
      damage: store.state?.state.players[1].gameStats.totalHordeDamage
    }),
    tie: i18n.t('ui.hordeEndMessages.tie')
  }

  const mainContainer = new Object2D()
  mainContainer.matrix.setConstraints(
    new Pin(1, 1, 0, -250),
    undefined,
    ReadonlyPin.Center.cloneOffset(0, 25)
  )
  const subContainer = new Object2D()
  mainContainer.add(subContainer)
  subContainer.matrix.setConstraints(
    new Pin(0.8, 0, 0, INIT_HEIGHT),
    ReadonlyPin.Center.clone(),
    ReadonlyPin.Center.cloneOffset(0, 0)
  )
  const heroConclusionCallout = await createHeroConclusionCallout(
    endType,
    prisms
  )
  heroConclusionCallout.matrix.offset.y.offset -= 25
  parent.add(mainContainer)
  subContainer.add(heroConclusionCallout)

  const headingContainer = new MatchEndHeaderInfo(name)
  headingContainer.matrix.setConstraints(
    Pin.fromPixels(640, 60),
    ReadonlyPin.Top,
    ReadonlyPin.Top.cloneOffset(0, 60)
  )
  parent.add(headingContainer)
  headingContainer.announce(i18n.t(`ui.endTypeMessages.${endType}`), endType)

  const panelDecor = getAssetsManager().fetchMeshDeepClone(
    'uiSmall',
    'panel-w-faded-sides'
  )
  panelDecor.matrix.prescale = new Vector2(10, 1)
  panelDecor.material.paletteRow = 8
  const panel = new Object2D()
  panel.matrix.setConstraints(
    Pin.fromPixels(CONTAINER_WIDTH, CONTAINER_HEIGHT),
    ReadonlyPin.Top,
    ReadonlyPin.Center.cloneOffset(0, 30)
  )
  panel.add(panelDecor)
  const isHordeMode = store.state?.state.gameParams.tavernMode === 'horde'
  const endMessages = isHordeMode ? hordeEndMessages : matchEndMessages

  const endText = new UITextMesh(endMessages[endType], {
    ...textOptions.buttonText,
    size: 24
  })
  subContainer.add(panel)
  panel.add(endText)
  panel.shouldRenderAsGroup = true
}

async function createLethalPuzzleStage(parent: Object2D, prisms: Prism[]) {
  const mainContainer = new Object2D()
  mainContainer.matrix.setConstraints(
    new Pin(1, 1, 0, -250),
    undefined,
    ReadonlyPin.Center.cloneOffset(0, 25)
  )
  const subContainer = new Object2D()
  mainContainer.add(subContainer)
  subContainer.matrix.setConstraints(
    new Pin(0.8, 0, 0, INIT_HEIGHT),
    ReadonlyPin.Center.clone(),
    ReadonlyPin.Center.cloneOffset(0, 0)
  )
  const heroConclusionCallout = await createHeroConclusionCallout(
    'victory',
    prisms
  )
  heroConclusionCallout.matrix.offset.y.offset -= 25
  parent.add(mainContainer)
  subContainer.add(heroConclusionCallout)

  const headingContainer = new MatchEndHeaderInfo('')
  headingContainer.matrix.setConstraints(
    Pin.fromPixels(640, 60),
    ReadonlyPin.Top,
    ReadonlyPin.Top.cloneOffset(0, 60)
  )
  parent.add(headingContainer)
  headingContainer.announce(i18n.t('ui.rewardRank.puzzleComplete'), 'victory')

  const panelDecor = getAssetsManager().fetchMeshDeepClone(
    'uiSmall',
    'panel-w-faded-sides'
  )
  panelDecor.matrix.prescale = new Vector2(10, 1)
  panelDecor.material.paletteRow = 8
  const panel = new Object2D()
  panel.matrix.setConstraints(
    Pin.fromPixels(CONTAINER_WIDTH, CONTAINER_HEIGHT),
    ReadonlyPin.Top,
    ReadonlyPin.Center.cloneOffset(0, 30)
  )
  panel.add(panelDecor)
  const key = 'puzzle-tries-' + queryParams.lethalPuzzleURL
  const tries = getLocalStorageInt(key, 1)
  const tutorialName = getTutorial().config.title ?? '<unknown name>'
  const endMessage = i18n.t(`ui.rewardRank.puzzleCongrats`, {
    count: tries,
    puzzle_name: tutorialName
  })
  const endText = new UITextMesh(endMessage, {
    ...textOptions.buttonText,
    size: 24
  })
  subContainer.add(panel)
  panel.add(endText)
  panel.shouldRenderAsGroup = true
}
