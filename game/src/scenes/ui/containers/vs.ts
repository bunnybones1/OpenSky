import { i18n } from '@opensky/language-manager'
import { ConquestStatusReturn } from '@opensky/proto'
import { AssetPriority } from '@opensky/shared/assets'
import device from '@opensky/shared/device'
import { renderMetrics } from '@opensky/shared/renderMetrics'
import { Player } from '@skyweaver/state-metadata'
import { ClampToEdgeWrapping, Texture } from 'three'

import { getAssetsManager } from '~/assets'
import { TextureType } from '~/assets/TextureType'
import { COLOR_LILAC } from '~/colors/colorLibrary'
import {
  conquestDataHelper,
  deduceCurrentMatchNum
} from '~/helpers/conquestDataHelper'
import { getPrematchConquestProgress } from '~/helpers/conquestProgressHelpers'
import {
  gameMode,
  isConquestGame,
  isOnlineGame,
  LocalGameMode
} from '~/helpers/envGameModeHelpers'
import { getFireHighlightOptionOverrides } from '~/helpers/fireHighlightMaterialFactory'
import { getHeroSkin } from '~/helpers/heroSkins'
import { Pin, ReadonlyPin, SizePin } from '~/helpers/LayoutHelpers'
import { makeUnscalingContainer } from '~/helpers/makeUnscalingContainer'
import { prismsToTextureBaseName } from '~/helpers/typeHelpers'
import MagicFireHighlightMeshMaterial from '~/materials/MagicFireHighlightMeshMaterial'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import {
  createSkyTag,
  SKYTAG_ASPECT_RATIO,
  SkyTagDirection
} from '~/scenes/ui/components/SkyTag'
import { accountsLoaded, store, storeHelper } from '~/state'
import { isBot } from '~/state/isBot'
import { loadProgressHelper } from '~/state/loadProgressHelper'
import { getTimeString, statePlayer } from '~/state/StatePlayer'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import { fontFaces } from '~/systems/text/FontFace'
import TextMesh from '~/systems/text/TextMesh'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { AnimatedBool } from '~/utils/AnimatedBool'
import { createResolvable } from '~/utils/asyncUtils'
import { padLeadingZeros } from '~/utils/stringUtils'
import { safelyResetFlipY } from '~/utils/textureUtils'

import type { UI } from '..'
import PlayerProgressBar from '../components/PlayerProgressBar'
import ProgressionLine from '../components/ProgressionLine'
import {
  getPrematchConquestProgressTicks,
  TickIndicator
} from '../components/ProgressionTick'
import UIContainer from '../components/UIContainer'
import type ConquestVSCoverContainer from './conquestVSCoverContainer'

const baseHeroAnchor = new Pin(0.5, 0.2)
export default class VSContainer extends UIContainer {
  bothPlayersFinishedLoading = createResolvable()
  myPlayerFinishedLoading = createResolvable()

  private hero1: RectangleMesh
  private hero2: RectangleMesh
  private vsText: UITextMesh
  private skyTag1: Object2D
  private skyTag2: Object2D
  private prism1: RectangleMesh
  private prism2: RectangleMesh
  private prismText1: TextMesh
  private prismText2: TextMesh
  private progressBars: [PlayerProgressBar, PlayerProgressBar]
  private _conquestStatus: ConquestStatusReturn | undefined
  private _conquestVSCover: ConquestVSCoverContainer | undefined
  private _abandonTimeouts: { player: TextMesh; opponent: TextMesh } | undefined

  private __caughtZeroTimeoutBug = false
  private __closedOnce = false
  fogState: AnimatedBool

  constructor(ui: UI, priority: number) {
    super(ui, 'vs', {
      priority
    })

    this.progressBars = [
      new PlayerProgressBar({
        size: new SizePin(1, 0, 100, 'x'),
        anchor: ReadonlyPin.Bottom,
        offset: ReadonlyPin.Top.clone()
      }),
      new PlayerProgressBar(
        {
          size: new SizePin(1, 0, 100, 'x'),
          anchor: ReadonlyPin.Bottom,
          offset: ReadonlyPin.Top.clone()
        },
        ReadonlyPin.Right
      )
    ]
  }

  update() {
    this.progressBars.forEach((progressBar, idx) => {
      progressBar.progress =
        idx === 0
          ? loadProgressHelper.playerLoadingProgress
          : loadProgressHelper.opponentLoadingProgress
      progressBar.update()
    })

    if (loadProgressHelper.playerLoadingProgress === 1) {
      this.myPlayerFinishedLoading.resolve()
      if (loadProgressHelper.opponentLoadingProgress === 1) {
        this.bothPlayersFinishedLoading.resolve()
      }
    }
    if (
      this._abandonTimeouts &&
      loadProgressHelper.matchLoadingScreenAbandonTime !== -1
    ) {
      const now = Date.now()
      const endDate = loadProgressHelper.matchLoadingScreenAbandonTime
      const diff = endDate - now

      const minutes = Math.max(0, Math.floor((diff % 3.6e6) / 6e4))
      const seconds = Math.max(0, Math.floor((diff % 6e4) / 1000))
      const timeLeft = `${minutes}:${padLeadingZeros(seconds, 2)}`
      if (loadProgressHelper.playerLoadingProgress < 1) {
        this._abandonTimeouts.player.text = i18n.t('ui.vs.loadingAssets', {
          timeLeft
        })
        this._abandonTimeouts.opponent.text = ''
      } else if (loadProgressHelper.opponentLoadingProgress < 1) {
        this._abandonTimeouts.opponent.text = i18n.t(
          'ui.vs.waitingForOpponent',
          { timeLeft }
        )
        this._abandonTimeouts.player.text = ''
        if (minutes === 0 && seconds === 0 && !this.__caughtZeroTimeoutBug) {
          setTimeout(() => {
            // if you stick on 0:00 for more than 8s, fire a sentry log.
            if (!this.__closedOnce) {
              console.error('VS screen reached 0:00, but DID NOT CLOSE!!!')
              store.fireClientError(
                new Error('Failed to load into match. Try reloading.')
              )
            }
          }, 8000)
          this.__caughtZeroTimeoutBug = true
        }
      } else {
        this._abandonTimeouts.opponent.text = ''
        this._abandonTimeouts.player.text = ''
      }
    }
  }

  fadeInHeros() {
    this.fogState.value = true
    this.vsText.matrix.prescale.set(3, 3)
    const offset = renderMetrics.width / 2
    this.hero1.matrix.anchor.x.offset = offset
    this.hero2.matrix.anchor.x.offset = -offset

    const slideInHeros = () => {
      simpleTweener
        .to({
          description: 'slide in hero1',
          target: this.hero1.matrix.anchor.x,
          propertyGoals: { offset: offset / 5 },
          duration: 500,
          easing: Easing.Quartic.In
        })
        .finished.then(() => {
          simpleTweener.to({
            description: 'more slide in hero1',
            target: this.hero1.matrix.anchor.x,
            propertyGoals: { offset: 0 },
            duration: 2000,
            easing: Easing.Quartic.Out
          })
        })

      simpleTweener
        .to({
          description: 'slide in hero2',
          target: this.hero2.matrix.anchor.x,
          propertyGoals: { offset: -offset / 5 },
          duration: 500,
          easing: Easing.Quartic.In
        })
        .finished.then(() => {
          simpleTweener.to({
            description: 'more slide in hero2',
            target: this.hero2.matrix.anchor.x,
            propertyGoals: { offset: 0 },
            duration: 2000,
            easing: Easing.Quartic.Out
          })
        })
    }

    const fadeInVSText = () => {
      this.vsText.opacity = 0
      this.vsText.material.userData.originalOpacity = 0
      simpleTweener.to({
        description: 'fade in prism1',
        target: this.vsText,
        propertyGoals: {
          opacity: 1
        },
        delay: 500,
        duration: 500,
        easing: Easing.Quartic.In
      })

      simpleTweener
        .to({
          description: 'fade in prism1',
          target: this.vsText.matrix.prescale,
          propertyGoals: {
            x: 1.5,
            y: 1.5
          },
          delay: 250,
          duration: 500,
          easing: Easing.Quartic.In
        })
        .finished.then(() => {
          simpleTweener.to({
            description: 'fade in prism1',
            target: this.vsText.matrix.prescale,
            propertyGoals: {
              x: 1,
              y: 1
            },
            duration: 2000,
            easing: Easing.Quartic.Out
          })
        })
    }

    const slideInSkyTags = () => {
      const offset = renderMetrics.width / 2
      this.skyTag1.matrix.anchor.x.offset = offset
      this.skyTag2.matrix.anchor.x.offset = -offset

      simpleTweener.to({
        description: 'slide in skytag1',
        target: this.skyTag1.matrix.anchor.x,
        propertyGoals: { offset: 0 },
        duration: 500,
        easing: Easing.Quartic.In
      })

      simpleTweener.to({
        description: 'slide in skytag2',
        target: this.skyTag2.matrix.anchor.x,
        propertyGoals: { offset: 0 },
        duration: 500,
        easing: Easing.Quartic.In
      })
    }

    const fadeInPrisms = () => {
      this.prism1.matrix.opacity = 0
      this.prism1.matrix.opacity = 0
      this.prismText1.opacity = 0
      this.prismText2.opacity = 0

      simpleTweener.to({
        description: 'fade in prism1',
        target: this.prism1.matrix,
        propertyGoals: { opacity: 1 },
        delay: 250,
        duration: 500,
        easing: Easing.Quartic.In
      })
      simpleTweener.to({
        description: 'fade in prism2',
        target: this.prism2.matrix,
        propertyGoals: { opacity: 1 },
        delay: 250,
        duration: 500,
        easing: Easing.Quartic.In
      })
      simpleTweener.to({
        description: 'fade in prism1 text',
        target: this.prismText1,
        propertyGoals: { opacity: 1 },
        delay: 250,
        duration: 500,
        easing: Easing.Quartic.In
      })
      simpleTweener.to({
        description: 'fade in prism2 text',
        target: this.prismText2,
        propertyGoals: { opacity: 1 },
        delay: 250,
        duration: 500,
        easing: Easing.Quartic.In
      })
    }

    this.fadeIn(250)
    this._conquestVSCover?.fadeIn()

    slideInHeros()
    fadeInVSText()
    slideInSkyTags()
    fadeInPrisms()
  }

  fadeOutHeros() {
    this.fogState.value = false
    simpleTweener.to({
      description: 'fade out hero1',
      target: this.hero1.matrix.anchor.x,
      propertyGoals: {
        offset: this.hero1.matrix.anchor.x.offset + renderMetrics.width / 3
      },
      duration: 1500,
      easing: Easing.Quartic.In
    })

    simpleTweener.to({
      description: 'fade out hero1',
      target: this.hero2.matrix.anchor.x,
      propertyGoals: {
        offset: this.hero2.matrix.anchor.x.offset - renderMetrics.width / 3
      },
      duration: 1500,
      easing: Easing.Quartic.In
    })

    this.__closedOnce = true
    this.fadeOut(1500)
    this._conquestVSCover?.fadeOut()
  }

  protected async init() {
    // await matchStarted
    await accountsLoaded

    const accounts = storeHelper.getAccounts()
    if (!accounts) {
      throw new Error(
        'accountsLoaded resolved, but accountsStore.accounts is null'
      )
      // should never happen
    }
    const player = storeHelper.getPlayer()
    const oppt = (1 - player) as Player

    if (isBot(oppt)) {
      loadProgressHelper.opponentLoadingProgress = 1
    }

    await getAssetsManager().priorityPending(AssetPriority.PreGame)

    if (isConquestGame) {
      this._conquestStatus =
        await conquestDataHelper.getPrematchConquestStatus()
      const conquestVSCover = this.ui.getContainer('conquestVSCover')
      await conquestVSCover.ready
      const matchNum = deduceCurrentMatchNum(
        this._conquestStatus!.conquest.matchProgress
      )
      conquestVSCover.setGame(matchNum)
      this._conquestVSCover = conquestVSCover
    }

    const playerPrisms = accounts[player].prisms
    const opptPrisms = accounts[oppt].prisms

    const playerSkin = getHeroSkin(player, playerPrisms)
    const playerHeroURL = `game/cards/art-full/${
      playerSkin.id === -25 ? 'units' : 'heroes'
    }/${playerSkin.artID}.png`
    const opptSkin = getHeroSkin(oppt, opptPrisms)
    const opptHeroURL = `game/cards/art-full/${
      opptSkin.id === -25 ? 'units' : 'heroes'
    }/${opptSkin.artID}.png`
    const [playerHeroArt, opptHeroArt] = (await Promise.all([
      getAssetsManager().load(
        'textureBig',
        playerHeroURL,
        undefined,
        AssetPriority.PreGame
      ),
      getAssetsManager().load(
        'textureBig',
        opptHeroURL,
        undefined,
        AssetPriority.PreGame
      )
    ])) as Texture[]
    safelyResetFlipY(playerHeroArt)
    safelyResetFlipY(opptHeroArt)
    const tc = getAssetsManager().getTextureCache(TextureType.Big)
    tc.protect(playerHeroURL)
    tc.protect(opptHeroURL)

    playerHeroArt.wrapS = ClampToEdgeWrapping
    playerHeroArt.wrapT = ClampToEdgeWrapping
    opptHeroArt.wrapS = ClampToEdgeWrapping
    opptHeroArt.wrapT = ClampToEdgeWrapping
    const playerPrismArt = (await getAssetsManager().load(
      'texture',
      `game/prisms/${prismsToTextureBaseName(playerPrisms)}.png`,
      undefined,
      AssetPriority.PreGame
    )) as Texture
    const opptPrismArt = (await getAssetsManager().load(
      'texture',
      `game/prisms/${prismsToTextureBaseName(opptPrisms)}.png`,
      undefined,
      AssetPriority.PreGame
    )) as Texture

    playerPrismArt.wrapS = ClampToEdgeWrapping
    playerPrismArt.wrapT = ClampToEdgeWrapping
    opptPrismArt.wrapS = ClampToEdgeWrapping
    opptPrismArt.wrapT = ClampToEdgeWrapping

    // VS
    const vsCenter = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'vs-lines',
      true,
      true
    )
    vsCenter.matrix.setColor(COLOR_LILAC)
    // vsCenter.material.blending = AdditiveBlending
    vsCenter.matrix.setConstraints(new SizePin(1, 0.3, 497 / 256, 'y'))

    const vsText = new UITextMesh(i18n.t('ui.vs.VS'), textOptions.vs)
    vsText.matrix.setConstraintsPosition(new Pin(0.5, 0.45))

    const playerHero = new RectangleMesh(
      new RectangleMaterial({
        map: playerHeroArt,
        forceTransparent: true
      })
    )
    playerHero.matrix.setConstraints(
      new SizePin(1, 1.2, 648 / 1092, 'y'),
      baseHeroAnchor.clone(),
      new Pin(0.2, 0.33)
    )

    const opptHero = new RectangleMesh(
      new RectangleMaterial({
        map: opptHeroArt,
        forceTransparent: true
      })
    )
    opptHero.matrix.setConstraints(
      new SizePin(1, 1.2, 648 / 1092, 'y'),
      baseHeroAnchor.clone(),
      new Pin(0.8, 0.33)
    )

    const superTitlePin = new Pin(0.5, device.isMobile ? 0.15 : 0.2)

    const modeTitle = i18n.t(`ui.gameModeTitles.${gameMode}`)

    const conquestText = new UITextMesh(modeTitle, textOptions.vsTitles)
    conquestText.matrix.setConstraintsPosition(superTitlePin)
    conquestText.matrixAutoUpdate = true

    const unscalingFogBGContainer = makeUnscalingContainer('uiHeight', 1000)
    const unscalingFogFGContainer = makeUnscalingContainer('uiHeight', 1000)

    this.add(unscalingFogBGContainer)
    const group1 = new Object2D()
    group1.shouldRenderAsGroup = true
    this.add(group1)
    group1.add(vsCenter)
    group1.add(playerHero)
    group1.add(opptHero)
    this.add(unscalingFogFGContainer)
    unscalingFogFGContainer.shouldRenderAsGroup = true
    const group2 = new Object2D()
    group2.shouldRenderAsGroup = true
    group2.add(conquestText)
    this.add(group2)

    const modeSubtext = i18n.t(`ui.gameModeSubtext.${gameMode}`)

    if (modeSubtext) {
      const gameModeText = new UITextMesh(
        `(${modeSubtext})`,
        textOptions.vsSubTitles
      )
      gameModeText.matrix.setConstraintsPosition(
        superTitlePin.cloneOffset(0, device.isMobile ? 35 : 70)
      )
      gameModeText.matrixAutoUpdate = true
      this.add(gameModeText)
    }

    if (isConquestGame && this._conquestStatus?.conquest) {
      const { initProgress, currentMatch, matchProgress } =
        await getPrematchConquestProgress()
      const ticks = getPrematchConquestProgressTicks(matchProgress)

      const progressBar = new ProgressionLine({
        ticks,
        initProgress,
        tickCurrent: TickIndicator.NEXT,
        tickRadius: 11,
        tickThickness: 2
      })

      const subTitlePin = new Pin(0.5, 0.75)
      progressBar.mesh.matrix.setConstraints(
        new Pin(0, 0, 220, 2),
        ReadonlyPin.Center,
        subTitlePin.cloneOffset(0, -40)
      )
      this.add(progressBar.mesh)

      const matchLabel = i18n.t('ui.vs.conquestMatch', {
        match: currentMatch + 1
      })
      const matchNumberText = new UITextMesh(
        matchLabel,
        textOptions.vsSubTitles
      )
      matchNumberText.matrix.setConstraintsPosition(subTitlePin)
      matchNumberText.matrixAutoUpdate = true
      this.add(matchNumberText)
    }

    this.add(vsText)
    const mode =
      gameMode === LocalGameMode.REPLAY
        ? statePlayer.record!.gameMode
        : gameMode
    const skyTagLeft = await createSkyTag(
      accounts[player],
      mode,
      SkyTagDirection.Left,
      player,
      TextureType.Default
    )
    const skyTagRight = await createSkyTag(
      accounts[oppt],
      mode,
      SkyTagDirection.Right,
      oppt,
      TextureType.Default
    )

    const fogProto = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle-highlight-from-bottom'
    ) as Mesh2D
    const fogMat = new MagicFireHighlightMeshMaterial(
      getAssetsManager(),
      getFireHighlightOptionOverrides('fog')
    )
    const fog = new Mesh2D(fogProto.geometry, fogMat)
    unscalingFogBGContainer.add(fog)
    const fog2Mat = new MagicFireHighlightMeshMaterial(
      getAssetsManager(),
      getFireHighlightOptionOverrides('fog2')
    )
    const fog2 = new Mesh2D(fogProto.geometry, fog2Mat)
    unscalingFogFGContainer.add(fog2)

    const unscalingContainer = makeUnscalingContainer('uiWidth', 660)
    this.add(unscalingContainer)

    const fogState = new AnimatedBool(
      v => {
        fogMat.thicknessRatio = v
        fog2Mat.thicknessRatio = v
        fogMat.opacity = v
        fog2Mat.opacity = v
      },
      false,
      1000
    )
    this.fogState = fogState

    skyTagLeft.matrix.setConstraints(
      new SizePin(0.46, 1, SKYTAG_ASPECT_RATIO, 'x'),
      ReadonlyPin.BottomLeft.clone(),
      ReadonlyPin.BottomLeft.cloneOffset(2, -4)
    )
    skyTagRight.matrix.setConstraints(
      new SizePin(0.46, 1, SKYTAG_ASPECT_RATIO, 'x'),
      ReadonlyPin.BottomRight.clone(),
      ReadonlyPin.BottomRight.cloneOffset(-2, -4)
    )
    unscalingContainer.add(skyTagLeft)
    unscalingContainer.add(skyTagRight)

    const prismRect1 = new Object2D()
    const prismRect2 = new Object2D()

    prismRect1.matrix.setConstraints(
      new SizePin(0, 0.5, 1, 'y'),
      ReadonlyPin.BottomLeft,
      ReadonlyPin.TopLeft.cloneOffset(0, -5)
    )
    prismRect2.matrix.setConstraints(
      new SizePin(0, 0.5, 1, 'y'),
      ReadonlyPin.BottomRight,
      ReadonlyPin.TopRight.cloneOffset(0, -5)
    )
    const prism1 = new RectangleMesh(
      new RectangleMaterial({
        map: playerPrismArt,
        forceTransparent: true
      })
    )
    prism1.matrix.setConstraints(
      new SizePin(0, 1, 1, 'y'),
      ReadonlyPin.Left,
      ReadonlyPin.Left
    )

    const prism2 = new RectangleMesh(
      new RectangleMaterial({
        map: opptPrismArt,
        forceTransparent: true
      })
    )
    prism2.matrix.setConstraints(
      new SizePin(0, 1, 1, 'y'),
      ReadonlyPin.Right,
      ReadonlyPin.Right
    )

    const prismText1 = new UITextMesh(
      playerPrisms.map(x => i18n.t(`cardMeta:prisms.${x}`)).join(' + '),
      {
        ...textOptions.generic,
        align: 'left',
        vAlign: 'center',
        size: 12,
        color: 0xf2f3e1
      }
    )
    prismText1.matrix.setConstraints(
      new SizePin(0, 1, 1, 'y'),
      ReadonlyPin.TopLeft,
      new Pin(1.2, 0.43)
    )

    const prismText2 = new UITextMesh(
      opptPrisms.map(x => i18n.t(`cardMeta:prisms.${x}`)).join(' + '),
      {
        ...textOptions.generic,
        align: 'right',
        vAlign: 'center',
        size: 12,
        color: 0xf2f3e1
      }
    )
    prismText2.matrix.setConstraints(
      new SizePin(0, 1, 1, 'y'),
      ReadonlyPin.TopLeft,
      new Pin(-0.2, 0.43)
    )

    skyTagLeft.add(this.progressBars[0].mesh)
    skyTagRight.add(this.progressBars[1].mesh)

    prismRect1.add(prism1)
    prismRect2.add(prism2)
    prismRect1.add(prismText1)
    prismRect2.add(prismText2)

    skyTagLeft.add(prismRect1)
    skyTagRight.add(prismRect2)
    if (isOnlineGame) {
      // for rect on top of opponent
      const opponentAbandonTimeout = new UITextMesh(
        '',
        textOptions.abandonTimeoutText
      )

      opponentAbandonTimeout.matrix.setConstraints(
        new SizePin(0, 1, 1, 'y'),
        ReadonlyPin.Left,
        ReadonlyPin.Left.cloneOffset(0, -18)
      )

      //for rect on top of player
      const playerAbandonTimeout = new UITextMesh(
        '',
        textOptions.abandonTimeoutText
      )

      playerAbandonTimeout.matrix.setConstraints(
        new SizePin(0, 1, 1, 'y'),
        ReadonlyPin.Left,
        ReadonlyPin.Left.cloneOffset(185, -18)
      )
      this._abandonTimeouts = {
        player: playerAbandonTimeout,
        opponent: opponentAbandonTimeout
      }

      skyTagRight.add(opponentAbandonTimeout)
      skyTagLeft.add(playerAbandonTimeout)
    }

    if (gameMode === LocalGameMode.REPLAY) {
      const winningPlayer = statePlayer.record?.winningPlayer
      if (winningPlayer) {
        const iWin = winningPlayer - 1 === statePlayer.record?.localPlayer
        const winnerText = new UITextMesh(i18n.t('ui.vs.winner'), {
          ...textOptions.generic,
          fontFace: fontFaces.BarlowBold,
          color: 0xffc051,
          size: 48,
          align: iWin ? 'left' : 'right',
          vAlign: 'top'
        })
        winnerText.matrix.setConstraints(
          undefined,
          iWin ? ReadonlyPin.TopLeft : ReadonlyPin.TopRight,
          iWin
            ? ReadonlyPin.TopLeft.cloneOffset(16, 16)
            : ReadonlyPin.TopRight.cloneOffset(-16, 16)
        )
        this.add(winnerText)
      }
      const matchTimeText = new UITextMesh(
        getTimeString(statePlayer.recordDuration() / 1000),
        { ...textOptions.generic, size: 48 }
      )
      matchTimeText.matrix.setConstraintsPosition(new Pin(0.5, 0.3))
      this.add(matchTimeText)
    }

    this.hero1 = playerHero
    this.hero2 = opptHero
    this.vsText = vsText
    this.skyTag1 = skyTagLeft
    this.skyTag2 = skyTagRight
    this.prism1 = prism1
    this.prism2 = prism2
    this.prismText1 = prismText1
    this.prismText2 = prismText2
  }
}
