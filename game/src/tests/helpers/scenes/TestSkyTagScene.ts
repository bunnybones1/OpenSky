import {
  Account,
  GameMode,
  PlayerRank,
  PlayerRankStage
} from '@opensky/proto'

import { getAssetsManager } from '~/assets'
import { TextureType } from '~/assets/TextureType'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { makeUnscalingContainer } from '~/helpers/makeUnscalingContainer'
import Object2D from '~/meshes/Object2D'
import { UI } from '~/scenes/ui'
import {
  createHUDSkyTag,
  createSkyTag,
  HEIGHT,
  SkyTagDirection,
  SkyTagVersion,
  WIDTH
} from '~/scenes/ui/components/SkyTag'
import { storeHelper } from '~/state/index'
import { makeQuickButtonColumn } from '~/utils/quickButton'
import { playerRankOrder } from '~/utils/ranks'
import { removeFromParent } from '~/utils/threeUtils'

import { BaseTestScene } from './BaseTestScene'

const accounts: [Account, Account] = [
  {
    id: 1,
    name: '_oz_',
    level: 2,
    seasonLevel: 1,
    levelUpXP: 100,
    experience: 125,
    address: '',
    warmUps: 0,
    locale: 'en',
    region: 'ca',
    tagArtID: 'spell-xavi-66',
    createdAt: '',
    updatedAt: '',
    titleID: 1,
    stats: {
      rankedConstructed: {
        winCount: 1,
        winStreak: 1,
        lossCount: 1,
        lossStreak: 1,
        tieCount: 0,
        forfeitCount: 0,
        abandonCount: 0,
        score: 0,
        createdAt: '',
        gameMode: GameMode.RANKED_CONSTRUCTED,
        playerRank: PlayerRank.UNRANKED,
        playerRankStage: PlayerRankStage.STAGE_II,
        playerRankState: '',
        winRatio: 0.5,
        gamesPlayed: 2
      },
      rankedDiscovery: {
        winCount: 1,
        winStreak: 1,
        lossCount: 1,
        lossStreak: 1,
        tieCount: 0,
        forfeitCount: 0,
        abandonCount: 0,
        score: 0,
        createdAt: '',
        gameMode: GameMode.RANKED_DISCOVERY,
        playerRank: PlayerRank.WANDERER,
        playerRankStage: PlayerRankStage.STAGE_II,
        playerRankState: '',
        winRatio: 0.5,
        gamesPlayed: 2
      }
    }
  },
  {
    id: 2,
    name: 'd3vfleam',
    level: 2,
    seasonLevel: 1,
    levelUpXP: 100,
    experience: 125,
    address: '',
    warmUps: 0,
    locale: 'en',
    createdAt: '',
    updatedAt: '',
    region: 'us',
    titleID: 2,
    tagArtID: undefined, //'unit-panou-32',
    stats: {
      rankedConstructed: {
        winCount: 1,
        winStreak: 1,
        lossCount: 1,
        lossStreak: 1,
        tieCount: 0,
        forfeitCount: 0,
        abandonCount: 0,
        score: 0,
        createdAt: '',
        gameMode: GameMode.RANKED_CONSTRUCTED,
        playerRank: PlayerRank.WANDERER,
        playerRankStage: PlayerRankStage.STAGE_II,
        playerRankState: '',
        winRatio: 0.5,
        gamesPlayed: 2
      },
      rankedDiscovery: {
        winCount: 1,
        winStreak: 1,
        lossCount: 1,
        lossStreak: 1,
        tieCount: 0,
        forfeitCount: 0,
        abandonCount: 0,
        score: 0,
        createdAt: '',
        gameMode: GameMode.RANKED_DISCOVERY,
        playerRank: PlayerRank.WANDERER,
        playerRankStage: PlayerRankStage.STAGE_II,
        playerRankState: '',
        winRatio: 0.5,
        gamesPlayed: 2
      }
    }
  }
]

class TestSkyTagScene extends BaseTestScene {
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')
    await getAssetsManager().loadAsset('gamePiecesGraphical')

    const container = ui.getContainer('randomTests')
    await container.ready
    let rankStage: PlayerRankStage = PlayerRankStage.STAGE_I
    storeHelper.useFakeStoreData = true
    makeQuickButtonColumn(
      container,
      playerRankOrder.map(r => ({
        label: r,
        onSelect: () => {
          if (
            accounts[0].stats?.rankedConstructed &&
            accounts[0].stats?.rankedDiscovery &&
            accounts[1].stats?.rankedConstructed &&
            accounts[1].stats?.rankedDiscovery
          ) {
            accounts[0].stats.rankedConstructed.playerRank = r
            accounts[0].stats.rankedDiscovery.playerRank = r
            accounts[1].stats.rankedConstructed.playerRank = r
            accounts[1].stats.rankedDiscovery.playerRank = r
            console.log('AHH', r)

            updateStages()
            makeTags()
          }
        }
      })),
      ReadonlyPin.Center,
      ReadonlyPin.Center.cloneOffset(-200, 0)
    )
    let gamemode: GameMode = GameMode.RANKED_DISCOVERY
    const buttons = makeQuickButtonColumn(
      container,
      [
        {
          label: 'Constructed',
          onSelect: () => {
            gamemode = GameMode.RANKED_CONSTRUCTED
            makeTags()
          }
        },
        {
          label: 'Discovery',
          onSelect: () => {
            gamemode = GameMode.RANKED_DISCOVERY
            makeTags()
          }
        },
        {
          label: 'Tutorial',
          onSelect: () => {
            gamemode = GameMode.TUTORIAL
            makeTags()
          }
        }
      ],
      ReadonlyPin.Center,
      ReadonlyPin.Center.cloneOffset(100, 0)
    )
    makeQuickButtonColumn(
      container,
      [
        {
          label: 'Stage I',
          onSelect: () => {
            rankStage = PlayerRankStage.STAGE_I
            updateStages()
            makeTags()
          }
        },
        {
          label: 'Stage II',
          onSelect: () => {
            rankStage = PlayerRankStage.STAGE_II
            updateStages()
            makeTags()
          }
        },
        {
          label: 'Stage III',
          onSelect: () => {
            rankStage = PlayerRankStage.STAGE_III
            updateStages()
            makeTags()
          }
        }
      ],
      ReadonlyPin.Center,
      ReadonlyPin.Center.cloneOffset(250, 0)
    )

    container.show()
    super.initUI(ui)

    const unscalingContainer = makeUnscalingContainer('uiWidth', 660)
    container.add(unscalingContainer)

    let tags: Object2D[] = []
    function updateStages() {
      if (
        accounts[0].stats?.rankedConstructed &&
        accounts[0].stats?.rankedDiscovery &&
        accounts[1].stats?.rankedConstructed &&
        accounts[1].stats?.rankedDiscovery
      ) {
        const r = accounts[0].stats?.rankedConstructed.playerRank
        if (
          r === PlayerRank.UNKNOWN ||
          r === PlayerRank.UNRANKED ||
          r === PlayerRank.WANDERER ||
          r === PlayerRank.MASTER ||
          r === PlayerRank.GRANDWEAVER
        ) {
          accounts[0].stats.rankedConstructed.playerRankStage =
            PlayerRankStage.STAGE_NONE
          accounts[0].stats.rankedDiscovery.playerRankStage =
            PlayerRankStage.STAGE_NONE
          accounts[1].stats.rankedConstructed.playerRankStage =
            PlayerRankStage.STAGE_NONE
          accounts[1].stats.rankedDiscovery.playerRankStage =
            PlayerRankStage.STAGE_NONE
        } else {
          accounts[0].stats.rankedConstructed.playerRankStage = rankStage
          accounts[0].stats.rankedDiscovery.playerRankStage = rankStage
          accounts[1].stats.rankedConstructed.playerRankStage = rankStage
          accounts[1].stats.rankedDiscovery.playerRankStage = rankStage
        }
      }
    }
    function makeTags() {
      console.log(accounts[0].stats!)
      for (const tag of tags) {
        removeFromParent(tag)
      }
      for (const button of buttons) {
        button.disabled = true
      }
      accounts[1].titleID = 5002
      accounts[0].titleID = 5003
      const skyTagHudUp = createHUDSkyTag(
        ui,
        accounts[1],
        gamemode,
        SkyTagVersion.Up,
        1
      )
      container.add(skyTagHudUp)
      skyTagHudUp.matrix.setConstraints(
        new Pin(0, 0, WIDTH, HEIGHT),
        ReadonlyPin.TopLeft,
        ReadonlyPin.TopLeft
      )
      const skyTagHudDown = createHUDSkyTag(
        ui,
        accounts[0],
        gamemode,
        SkyTagVersion.Down,
        0
      )
      container.add(skyTagHudDown)
      skyTagHudDown.matrix.setConstraints(
        new Pin(0, 0, WIDTH, HEIGHT),
        ReadonlyPin.BottomLeft,
        ReadonlyPin.BottomLeft
      )

      const skyTagLeft = createSkyTag(
        accounts[0],
        gamemode,
        SkyTagDirection.Left,
        0,
        TextureType.UI
      )
      unscalingContainer.add(skyTagLeft)
      skyTagLeft.matrix.setConstraints(
        new Pin(0, 0, WIDTH, HEIGHT),
        ReadonlyPin.BottomLeft,
        ReadonlyPin.BottomLeft.cloneOffset(6, -100)
      )
      const skyTagRight = createSkyTag(
        accounts[1],
        gamemode,
        SkyTagDirection.Right,
        1,
        TextureType.UI
      )
      unscalingContainer.add(skyTagRight)
      skyTagRight.matrix.setConstraints(
        new Pin(0, 0, WIDTH, HEIGHT),
        ReadonlyPin.BottomRight,
        ReadonlyPin.BottomRight.cloneOffset(-6, -100)
      )
      tags = [skyTagHudUp, skyTagHudDown, skyTagLeft, skyTagRight]

      for (const button of buttons) {
        button.disabled = false
      }
    }
  }

  update(dt: number) {
    super.update(dt)
  }
}
export const scene = TestSkyTagScene
