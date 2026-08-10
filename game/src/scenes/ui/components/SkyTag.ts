import { i18n } from '@opensky/language-manager'
import {
  Account,
  AccountStat,
  GameMode,
  PlayerRank,
  PlayerRankStage
} from '@opensky/proto'
import { AssetPriority } from '@opensky/shared/assets'
import { BOT_HERO } from '@opensky/shared/constants'
import {
  CrystalLibrary,
  SkyTagTitlesLibrary
} from '@opensky/shared/cosmetics'
import { AnyGameMode, LocalGameMode } from '@opensky/shared/gameModes'
import { Color, Texture, Vector2 } from 'three'

import { getAssetsManager } from '~/assets'
import { TextureType } from '~/assets/TextureType'
import { lineworkSettingsLib } from '~/constants'
import { Pin, ReadonlyPin, SizePin } from '~/helpers/LayoutHelpers'
import { setupRowArt } from '~/helpers/rowArtHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import queryParams from '~/queryParams'
import { isBot } from '~/state/isBot'
import { isBotHero } from '~/state/isBotHero'
import { simpleTweener } from '~/systems/animation/tweeners'
import inputProvider from '~/systems/input/input'
import TextMesh from '~/systems/text/TextMesh'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { PPM } from '~/utils/measurements'
import { getTempTexture } from '~/utils/tempTexture'
import { safelyResetFlipY } from '~/utils/textureUtils'
import { findObject3DByName, recursivelySetDepth } from '~/utils/threeUtils'

import { UI } from '../index'
import ProgressBarContinuous from './ProgressBarContinuous'

const SEGMENTS_WIDTH = 282
const SEGMENTS_HEIGHT = 2

const RANK_BADGE_SIZE = 38

const FLAG_WIDTH = 20
const FLAG_HEIGHT = 15

export const WIDTH = 307
export const HEIGHT = 45
export const SKYTAG_ASPECT_RATIO = WIDTH / HEIGHT

export enum SkyTagDirection {
  Left,
  Right
}

export enum SkyTagVersion {
  Up,
  Down
}

const gameModePaths: { [key in AnyGameMode]: 'constructed' | 'discovery' } = {
  [GameMode.RANKED_CONSTRUCTED]: 'constructed',
  [GameMode.CONQUEST_CONSTRUCTED]: 'constructed',
  [GameMode.RANKED_DISCOVERY]: 'discovery',
  [GameMode.UNKNOWN]: 'discovery',
  [GameMode.CHALLENGE_CONSTRUCTED]: 'constructed',
  [GameMode.CHALLENGE_DISCOVERY]: 'discovery',
  [GameMode.TUTORIAL]: 'discovery',
  [GameMode.PRACTICE_BOT]: 'constructed',
  [GameMode.PRACTICE_PVP]: 'constructed',
  [GameMode.WARM_UP]: 'constructed',
  [GameMode.CONQUEST_DISCOVERY]: 'discovery',
  [LocalGameMode.LOCAL_BOT]: 'discovery',
  [LocalGameMode.SANDBOX]: 'discovery',
  [LocalGameMode.REPLAY]: 'discovery',
  [LocalGameMode.SPECTATE]: 'discovery'
}

const getGameModePath = (gameMode: AnyGameMode) =>
  gameModePaths[gameMode] || gameModePaths[GameMode.RANKED_DISCOVERY]

function getRegion(account: Account) {
  let { region } = account
  if (!region && queryParams.region) {
    region = queryParams.region
  }
  return region
}

function getAccountStats(account: Account, gameMode: AnyGameMode) {
  return gameMode.includes('CONSTRUCTED') || gameMode.includes('PRACTICE')
    ? account.stats?.rankedConstructed
    : account.stats?.rankedDiscovery
}
function makeTitle(account: Account, align: 'left' | 'right') {
  const titleID = account.titleID
  if (!titleID) {
    return
  }
  const titleData = SkyTagTitlesLibrary.get(titleID)!
  const titleAssetString = `game/titles/${titleData.asset}.png`
  const titleText = titleData?.name
  const fontColor = titleData?.textColor
  const glowColor = titleData?.glowColor

  const container = new Object2D()
  container.matrix.setConstraints(
    new Pin(0, 0, 0, 0),
    align === 'left' ? ReadonlyPin.Left : ReadonlyPin.Right,
    align === 'left'
      ? ReadonlyPin.Left.cloneOffset(63, 7)
      : ReadonlyPin.Right.cloneOffset(-63, 7)
  )
  container.matrix.opacity = 0
  const rectMesh = getAssetsManager().fetchMeshDeepClone(
    'uiSmall',
    'titles-3-slice',
    true,
    true
  )

  rectMesh.material.useFragmentTextureSampler = true
  getAssetsManager()
    .load('texture', titleAssetString, undefined, AssetPriority.PreGame)
    .then(titleTexture => {
      simpleTweener.to({
        description: 'show title',
        target: container.matrix,
        propertyGoals: { opacity: 1 },
        duration: 250
      })
      rectMesh.material.uniforms.uPaletteMap.value = titleTexture
      safelyResetFlipY(titleTexture)
    })
  rectMesh.matrix.setConstraints(
    new Pin(0, 0, 37, 6),
    ReadonlyPin.Center,
    ReadonlyPin.Center.cloneOffset(0, -0.0),
    new Vector2(0.12, 0.1)
  )
  const onMeaurementUpdate = (tm: TextMesh) => {
    rectMesh.matrix.size.x.offset = tm.width + 37
    rectMesh.matrix.size.y.offset = tm.height + 6
    container.matrix.size.x.offset = tm.width
    container.matrix.size.y.offset = tm.height
  }
  const titleTextMesh = new UITextMesh(
    titleText,
    {
      ...textOptions.titleName,
      color: fontColor
    },
    undefined,
    undefined,
    undefined,
    onMeaurementUpdate,
    false
  )
  titleTextMesh.matrix.setConstraintsPosition(
    ReadonlyPin.Center.cloneOffset(0, -0.5)
  )
  const titleTextGlowMesh = new UITextMesh(
    titleText,
    {
      ...textOptions.titleNameGlow,
      color: glowColor
    },
    undefined,
    undefined,
    undefined,
    onMeaurementUpdate,
    false
  )
  // debug shadows
  if (queryParams.tweakTitleGlows) {
    inputProvider.onMove.addListener((x, y) => {
      titleTextGlowMesh.material.uniforms.weight.value =
        (x / window.innerWidth) * 4 - 2
      titleTextGlowMesh.material.uniforms.contrastMultiplier.value =
        Math.pow(2, (y / window.innerHeight) * 4) - 2
      console.log(
        titleTextGlowMesh.material.uniforms.weight.value,
        titleTextGlowMesh.material.uniforms.contrastMultiplier.value
      )
    })
  }
  titleTextGlowMesh.matrix.setConstraintsPosition(
    ReadonlyPin.Center.cloneOffset(0, -2.5)
  )
  container.add(rectMesh)
  container.add(titleTextGlowMesh)
  container.add(titleTextMesh)
  return container
}

function makeNameLabel(
  account: Account,
  align: 'left' | 'right',
  onMeaurementUpdate: (tm: TextMesh) => void,
  scale = 1
) {
  const textColor =
    CrystalLibrary.get(account.crystalID!)?.color ??
    textOptions.skyTagName.color
  const nameTextMesh = new UITextMesh(
    account.name,
    {
      ...textOptions.skyTagName,
      size: textOptions.skyTagName.size * scale,
      align,
      vAlign: 'top',
      color: textColor
    },
    undefined,
    undefined,
    undefined,
    onMeaurementUpdate,
    false
  )
  return nameTextMesh
}

function makeBanner(
  player: number,
  account: Account,
  rowPrototypeName: string,
  textureType = TextureType.SmallUI
) {
  const rowPrototype = findObject3DByName<Mesh2D>(
    getAssetsManager().getAsset('gamePiecesGraphical'),
    rowPrototypeName
  )
  const tagArtID =
    (isBotHero(player) ? BOT_HERO.artID : account.tagArtID) || 'bg-mind-03'
  const tagArtSegment = tagArtID.split('-')[0]
  const tagArtDir = `${tagArtSegment === 'hero' ? 'heroe' : tagArtSegment}s`
  const fgUrl = `game/cards/art-rows/${tagArtDir}/${tagArtID}.png`
  const banner = setupRowArt(
    rowPrototype,
    'sky',
    fgUrl,
    lineworkSettingsLib.rowDesktop.overrideColor,
    lineworkSettingsLib.rowDesktop.deepenColor,
    textureType
  )
  return banner
}

function makeFlag(region: string) {
  const flagRect = new Object2D()

  const flagBG = new RectangleMesh(new RectangleMaterial({}))
  flagBG.matrix.setColor(new Color(0x100632))
  flagBG.matrix.setConstraints(ReadonlyPin.FullSize)
  flagRect.add(flagBG)

  const flag = new RectangleMesh(
    new RectangleMaterial({
      map: getTempTexture(),
      forceTransparent: true
    })
  )
  flag.matrix.setConstraints(
    new Pin(1, 1, -2, -2),
    ReadonlyPin.Center,
    ReadonlyPin.Center
  )
  flagRect.add(flag)
  const flagUrl = `game/region-flags/${region.toLowerCase()}.png`
  getAssetsManager()
    .load('texture', flagUrl, undefined, AssetPriority.PreGame)
    .then(flagTexture => {
      flag.material.uniforms.mapTexture.value = flagTexture
      safelyResetFlipY(flagTexture)
    })
  return flagRect
}

function makeRankBadge(
  playerRank: PlayerRank,
  stage: PlayerRankStage,
  gameMode: AnyGameMode
) {
  const rankBadgeUrl = `game/rank-badges/${
    playerRank === PlayerRank.UNKNOWN ? 'ai' : playerRank.toLowerCase()
  }${`-${getGameModePath(gameMode).toLowerCase()}`}${
    stage
      ? stage === PlayerRankStage.STAGE_NONE
        ? ''
        : `-${stage.replace('_', '-').toLowerCase()}`
      : ''
  }.png`

  const rankBadge = new RectangleMesh(
    new RectangleMaterial({
      map: getTempTexture(),
      forceTransparent: true
    })
  )

  getAssetsManager()
    .load('textureSmallUI', rankBadgeUrl, undefined, AssetPriority.PreGame)
    .then(tex => {
      const texture = tex as Texture
      safelyResetFlipY(texture)
      rankBadge.material.uniforms.mapTexture.value = texture
    })
  return rankBadge
}

function makeRankBar(account: Account, accountStats: AccountStat) {
  const { playerRank, score, playerRankStage } = accountStats
  const { level, experience } = account
  const rankUpData = {
    UNRANKED: [0, 200],
    WANDERER: [0, 100],
    TRAINEE: [300, 400],
    APPRENTICE: [600, 700],
    EXPERT: [900, 1000],
    MASTER: [1200, score],
    GRANDWEAVER: [1200, score]
  } as { [key in PlayerRank]: number[] }

  const rankStageMod = {
    STAGE_NONE: 0,
    STAGE_I: 0,
    STAGE_II: 100,
    STAGE_III: 200
  } as { [key in PlayerRankStage]: number }
  const segmentsRect = new Object2D()
  if (
    playerRank === PlayerRank.UNKNOWN ||
    playerRank === PlayerRank.MASTER ||
    playerRank === PlayerRank.GRANDWEAVER
  ) {
    return segmentsRect
  }
  const isXP = level === 0
  const min = rankUpData[playerRank][0] + rankStageMod[playerRankStage]
  const max = rankUpData[playerRank][1] + rankStageMod[playerRankStage]
  const bar = new ProgressBarContinuous(
    isXP ? experience : score ?? 0,
    isXP ? 0 : min,
    isXP ? 200 : max,
    isXP ? 0 : 3,
    false,
    undefined,
    false
  )
  bar.matrix.setConstraints(
    new Pin(0, 1, SEGMENTS_WIDTH, 0),
    ReadonlyPin.TopLeft,
    new Pin(0, 0)
  )
  segmentsRect.add(bar)

  return segmentsRect
}

const innerScale = 0.8

export const createSkyTag = (
  account: Account,
  gameMode: AnyGameMode,
  direction: SkyTagDirection = SkyTagDirection.Left,
  player: number,
  textureType = TextureType.SmallUI
): Object2D => {
  const rect = new Object2D()
  const accountStats = getAccountStats(account, gameMode)

  const banner = makeBanner(
    player,
    account,
    `skytag-${direction === SkyTagDirection.Left ? 'left' : 'right'}`,
    textureType
  )
  banner.matrix.setConstraints(
    ReadonlyPin.FullSize,
    ReadonlyPin.TopLeft,
    direction === SkyTagDirection.Left
      ? ReadonlyPin.TopLeft
      : ReadonlyPin.TopRight,
    new Vector2(PPM, PPM)
  )

  rect.add(banner)

  if (accountStats) {
    const rankBadge = makeRankBadge(
      accountStats.playerRank,
      accountStats.playerRankStage,
      gameMode
    )
    rankBadge.matrix.setConstraints(
      new SizePin(0, RANK_BADGE_SIZE / HEIGHT, 1, 'y'),
      direction === SkyTagDirection.Left
        ? ReadonlyPin.TopLeft
        : ReadonlyPin.TopRight,
      direction === SkyTagDirection.Left
        ? new Pin(0.005, 0.01)
        : new Pin(0.995, 0.01)
    )
    rect.add(rankBadge)
  }

  const flagOffset = new Pin(0, 0, 0, 1)
  const directionScale = direction === SkyTagDirection.Left ? 1 : -1

  const nameTextMesh = makeNameLabel(
    account,
    direction === SkyTagDirection.Left ? 'left' : 'right',
    (mesh: TextMesh) => {
      flagOffset.x.offset = (mesh.width + 4) * directionScale
    },
    innerScale
  )

  nameTextMesh.matrix.setConstraints(
    ReadonlyPin.EmptySize,
    ReadonlyPin.TopLeft,
    new Pin(direction === SkyTagDirection.Left ? 0.16 : 1 - 0.16, 0.12)
  )
  rect.add(nameTextMesh)

  const region = getRegion(account)
  if (region) {
    const flag = makeFlag(region)
    flag.matrix.setConstraints(
      ReadonlyPin.EmptySize.cloneOffset(
        FLAG_WIDTH * innerScale,
        FLAG_HEIGHT * innerScale
      ),
      direction === SkyTagDirection.Left
        ? ReadonlyPin.TopLeft
        : ReadonlyPin.TopRight,
      flagOffset
    )
    nameTextMesh.add(flag)
  }
  if (account.titleID) {
    const titleMesh = makeTitle(
      account,
      direction === SkyTagDirection.Left ? 'left' : 'right'
    )
    rect.add(titleMesh!)
  } else if (accountStats) {
    const { playerRank } = accountStats
    const rankTextMesh = new UITextMesh(
      isBot(player) ? i18n.t('ui.Bot') : i18n.t(`ui.playerRank.${playerRank}`),
      {
        ...textOptions.skyTagRank,
        size: textOptions.skyTagRank.size * innerScale,
        align: direction === SkyTagDirection.Left ? 'left' : 'right',
        vAlign: 'top'
      },
      undefined,
      undefined,
      undefined,
      undefined,
      false
    )
    rankTextMesh.matrix.setConstraints(
      new SizePin(0, 1, SKYTAG_ASPECT_RATIO, 'y'),
      ReadonlyPin.TopLeft,
      new Pin(direction === SkyTagDirection.Left ? 0.16 : 1 - 0.16, 0.5)
    )
    rect.add(rankTextMesh)
  }

  //Create rank points segments bar
  if (accountStats) {
    const segmentsRect = makeRankBar(account, accountStats)
    segmentsRect.matrix.setConstraints(
      new Pin(SEGMENTS_WIDTH / WIDTH, SEGMENTS_HEIGHT / HEIGHT),
      direction === SkyTagDirection.Left
        ? ReadonlyPin.BottomLeft
        : ReadonlyPin.BottomRight,
      new Pin(
        direction === SkyTagDirection.Left ? 2.5 / WIDTH : 1 - 2.5 / WIDTH,
        1 - 3 / HEIGHT
      )
    )
    rect.add(segmentsRect)
  }
  return rect
}

export const createHUDSkyTag = (
  ui: UI,
  account: Account,
  gameMode: AnyGameMode,
  version: SkyTagVersion = SkyTagVersion.Up,
  player: number
) => {
  const rect = new Object2D()
  const accountStats = getAccountStats(account, gameMode)

  const banner = makeBanner(
    player,
    account,
    `skytag-desktop-version-${version === SkyTagVersion.Up ? 'up' : 'down'}`
  )

  banner.matrix.setConstraints(
    ReadonlyPin.FullSize,
    ReadonlyPin.TopLeft,
    ReadonlyPin.TopLeft,
    new Vector2(PPM, PPM)
  )

  rect.add(banner)

  if (accountStats) {
    const rankBadge = makeRankBadge(
      accountStats.playerRank,
      accountStats.playerRankStage,
      gameMode
    )
    rankBadge.matrix.setConstraints(
      ReadonlyPin.EmptySize.cloneOffset(RANK_BADGE_SIZE, RANK_BADGE_SIZE),
      ReadonlyPin.Left,
      new Pin(0.005, 0.46)
    )

    rect.add(rankBadge)
  }

  const flagOffset = new Pin(0, 0, 0, 0)
  const nameTextMesh = makeNameLabel(account, 'left', mesh => {
    flagOffset.x.offset = mesh.width + 5
  })
  nameTextMesh.matrix.setConstraints(
    new SizePin(0, 1, SKYTAG_ASPECT_RATIO, 'y'),
    ReadonlyPin.TopLeft,
    ReadonlyPin.TopLeft.cloneOffset(49, 6)
  )
  rect.add(nameTextMesh)

  const region = getRegion(account)
  if (region) {
    const flag = makeFlag(region)
    flag.matrix.setConstraints(
      ReadonlyPin.EmptySize.cloneOffset(FLAG_WIDTH, FLAG_HEIGHT),
      ReadonlyPin.TopLeft,
      flagOffset
    )
    nameTextMesh.add(flag)
  }

  //Create rank points segments bar
  if (accountStats) {
    const segmentsRect = makeRankBar(account, accountStats)
    segmentsRect.matrix.setConstraints(
      new Pin(SEGMENTS_WIDTH / WIDTH, SEGMENTS_HEIGHT / HEIGHT),
      ReadonlyPin.BottomLeft,
      new Pin(4 / WIDTH, 1 - 2.5 / HEIGHT)
    )
    rect.add(segmentsRect)
  }
  if (account.titleID) {
    const titleMesh = makeTitle(account, 'left')!
    titleMesh.matrix.offset.y.offset += 1
    titleMesh.matrix.offset.x.offset -= 3

    titleMesh.matrix.prescale = new Vector2(0.85, 0.85)
    rect.add(titleMesh)
  }
  recursivelySetDepth(rect, 0.91)
  return rect
}
