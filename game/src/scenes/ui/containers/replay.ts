import { MatchStatus } from '@opensky/proto'
import device from '@opensky/shared/device'
import { renderMetrics } from '@opensky/shared/renderMetrics'
import { distributions } from '@opensky/shared/utils/distributions'
import NiceFloatParameter from '@opensky/shared/utils/NiceFloatParameter'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Player } from '@skyweaver/state-metadata'

import { getAssetsManager } from '~/assets/index'
import { COLOR_DARK_BLUE_GRADIENT } from '~/colors/colorLibrary'
import { BUTTON_MARGINS, PALETTE_ROW } from '~/constants'
import { copyToClipboardButton } from '~/helpers/buttonHelpers'
import { setHoveredCardAsync } from '~/helpers/cardPopupHelpers'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { setupDone } from '~/helpers/setupHelper'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import queryParams from '~/queryParams'
import { store } from '~/state'
import { getTimeString, statePlayer } from '~/state/StatePlayer'
import { emitParticlesInLineShape } from '~/systems/animation/emitParticlesInLineShape'
import { TextSegment } from '~/systems/text/TextMesh'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { animationDelay } from '~/utils/asyncUtils'
import { cameraShaker } from '~/utils/cameraShaker'
import { changeUrlParamWithoutReload } from '~/utils/location'
import { makeInteractive } from '~/utils/makeInteractive'
import { timeWarp } from '~/utils/timeWarp'
import {
  createButton,
  createButtonText,
  giveButtonKeyboardShortcut
} from '~/utils/ui'

import { UI } from '..'
import PinnedButton from '../components/PinnedButton'
import ReplaySlider, {
  SLIDER_COLOR_PAUSE,
  SLIDER_COLOR_PLAY
} from '../components/ReplaySlider'
import UIContainer from '../components/UIContainer'

// const BG_COLOR = new Color('rgb(10, 7, 28)')
const REPLAY_BUTTON_SIZE = 36
const NUM_LEFT_BUTTINS = 5
const __shapeData = [
  [REPLAY_BUTTON_SIZE, 0],
  [0, 0],
  [0, REPLAY_BUTTON_SIZE],
  [REPLAY_BUTTON_SIZE, REPLAY_BUTTON_SIZE]
] as const
export default class ReplayContainer extends UIContainer {
  slider: ReplaySlider
  speed: number
  speedText: UITextMesh
  pauseButton: PinnedButton
  leftButtons: PinnedButton[] = []
  stopParticles: (() => void) | undefined
  more: Object2D
  constructor(ui: UI, priority: number) {
    super(ui, 'replay', {
      priority
    })
  }

  protected init() {
    this.ui
      .getContainer('actionHistory')
      .ready.then(ah => ah.sidebar.closeAndLock())

    renderMetrics.onSizeChange(() => {
      const vertPad = -80
      const horPad = vertPad * renderMetrics.aspect
      cameraShaker.setViewOffset(
        renderMetrics.width,
        renderMetrics.height,
        horPad / 2,
        0,
        renderMetrics.width - horPad,
        renderMetrics.height - vertPad
      )
    }, true)
    const more = getAssetsManager().fetchMeshDeepClone('uiSmall', 'info-box')
    this.more = more
    more.visible = !device.isMobile

    more.matrix.setConstraints(
      Pin.fromPixels(
        REPLAY_BUTTON_SIZE * 4 + BUTTON_MARGINS * 2,
        REPLAY_BUTTON_SIZE * 3 + BUTTON_MARGINS * 4.3
      ),
      ReadonlyPin.BottomRight,
      ReadonlyPin.BottomRight.cloneOffset(0, -70)
    )
    this.add(more)

    const mainBarContainer = new Object2D()
    this.add(mainBarContainer)

    const backgroundMesh = new RectangleMesh(new RectangleMaterial({}))
    makeInteractive(backgroundMesh, {
      cursor: 'default',
      onOver() {
        setHoveredCardAsync(undefined)
      }
    })
    mainBarContainer.matrix.setConstraints(
      new Pin(1, 0, 0, 70),
      ReadonlyPin.Bottom,
      ReadonlyPin.Bottom
    )
    mainBarContainer.add(backgroundMesh)
    backgroundMesh.matrix.setColor(COLOR_DARK_BLUE_GRADIENT)

    this.speed = 1
    statePlayer.speedMultiplier = this.speed
    const timeFormat = (v: number) =>
      getTimeString((statePlayer.recordDuration() * v) / 1000)

    const playbackProgress = new NiceFloatParameter(
      'playback-playhead',
      '',
      0,
      0,
      1,
      distributions.linear,
      timeFormat,
      'never',
      true,
      0.0001,
      0,
      false,
      10000
    )
    let wasPlaying = false
    const slider = new ReplaySlider(
      playbackProgress,
      timeFormat,
      () => {
        wasPlaying = statePlayer.isPlaying
        statePlayer.pause()
      },
      (frac, s) => {
        const { record } = statePlayer
        if (record) {
          statePlayer
            .cue(record.firstFrameTime + frac * statePlayer.recordDuration())
            .then(() => {
              if (wasPlaying && !s.interacting) {
                statePlayer.play()
              }
            })
            .catch(err => store.fireClientError(err))
        }
      }
    )

    const leftSideButtonsSize = buttonsSizeWithMargins(NUM_LEFT_BUTTINS)
    const rightSideButtonsSize = buttonsSizeWithMargins(1)

    slider.container.matrix.setConstraints(
      new Pin(1, 0, -(leftSideButtonsSize + rightSideButtonsSize), 14),
      ReadonlyPin.TopLeft,
      ReadonlyPin.Left.cloneOffset(leftSideButtonsSize, -REPLAY_BUTTON_SIZE / 2)
    )
    mainBarContainer.add(slider.container)
    this.slider = slider
    this.leftButtons = []

    // LEFT BUTTONS - will arrange in order of being added to this.leftButtons array //
    const backwardsButton = createButton(
      mainBarContainer,
      () => {
        statePlayer.goBackwards()
      },
      Pin.fromPixels(REPLAY_BUTTON_SIZE, REPLAY_BUTTON_SIZE),
      ReadonlyPin.Left,
      ReadonlyPin.Center.clone()
    )
    backwardsButton.basePaletteRow = PALETTE_ROW.PURPLE
    createButtonText(backwardsButton.mesh, '⚄', textOptions.replayButtonText)
    giveButtonKeyboardShortcut(backwardsButton, 'ArrowLeft')

    this.leftButtons.push(backwardsButton)
    const pauseButton = createButton(
      mainBarContainer,
      () => {
        statePlayer.playPause()
        updateReplayStatus()
      },
      Pin.fromPixels(REPLAY_BUTTON_SIZE, REPLAY_BUTTON_SIZE),
      ReadonlyPin.Left,
      ReadonlyPin.Center.clone(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'buttonReplay'
    )
    this.leftButtons.push(pauseButton)

    const updateReplayStatus = () => {
      pauseButton.highlight = !statePlayer.isPlaying
      pauseButton.basePaletteRow = statePlayer.isPlaying
        ? PALETTE_ROW.PURPLE
        : PALETTE_ROW.GREEN
      slider.sliderColor = statePlayer.isPlaying
        ? SLIDER_COLOR_PLAY
        : SLIDER_COLOR_PAUSE

      if (!statePlayer.isPlaying && !this.stopParticles) {
        this.startParticles()
      } else if (statePlayer.isPlaying && this.stopParticles) {
        this.stopParticles()
        this.stopParticles = undefined
      }
    }
    listenToProperty(statePlayer, 'isPlaying', async () => {
      await animationDelay(500)
      updateReplayStatus()
    })
    pauseButton.basePaletteRow = PALETTE_ROW.PURPLE
    // pauseButton.highlightColor = makeHSL(250 / 360, 0.77, 0.4)
    pauseButton.highlight = false
    const pauseButtonText = createButtonText(
      pauseButton.mesh,
      '',
      textOptions.replayButtonText
    )
    this.pauseButton = pauseButton
    giveButtonKeyboardShortcut(pauseButton, ' ')
    giveButtonKeyboardShortcut(pauseButton, 'Enter')

    timeWarp.setCustomScaler('ReplaySpeed', this.speed)

    const forwardsButton = createButton(
      mainBarContainer,
      () => {
        statePlayer.goForwards()
      },
      Pin.fromPixels(REPLAY_BUTTON_SIZE, REPLAY_BUTTON_SIZE),
      ReadonlyPin.Left,
      ReadonlyPin.Center.clone()
    )
    forwardsButton.basePaletteRow = PALETTE_ROW.PURPLE
    createButtonText(forwardsButton.mesh, '⚃', textOptions.replayButtonText)
    giveButtonKeyboardShortcut(forwardsButton, 'ArrowRight')

    this.leftButtons.push(forwardsButton)

    const speedButton = createButton(
      mainBarContainer,
      () => {
        this.speed = this.speed * 2 > 4 ? 1 : this.speed * 2
        statePlayer.speedMultiplier = this.speed
        this.speedText.text = `${this.speed}x`
      },
      Pin.fromPixels(REPLAY_BUTTON_SIZE, REPLAY_BUTTON_SIZE),
      ReadonlyPin.Left,
      ReadonlyPin.Center.clone()
    )
    speedButton.basePaletteRow = PALETTE_ROW.PURPLE
    this.speedText = createButtonText(speedButton.mesh, '1x')
    this.leftButtons.push(speedButton)

    const switchSidesButton = createButton(
      mainBarContainer,
      async () => {
        const record = statePlayer.record
        if (!record) {
          store.fireClientError(
            new Error("Can't switch sides, no replay loaded.")
          )
          return
        }
        const newPlayer: Player =
          queryParams.serializedGamePlayer() === '0' ? 1 : 0
        changeUrlParamWithoutReload('serializedGamePlayer', `${newPlayer}`)
        switchSidesButton.disabled = true
        await statePlayer.load(
          record.id,
          record.replayID,
          newPlayer,
          statePlayer.time
        )
        const skyTags = this.ui.getContainer('skyTags')
        skyTags.switchPlayerSkytags()
        switchSidesButton.disabled = false
      },
      Pin.fromPixels(REPLAY_BUTTON_SIZE, REPLAY_BUTTON_SIZE),
      ReadonlyPin.Left,
      ReadonlyPin.Center.clone()
    )
    createButtonText(switchSidesButton.mesh, '⚀', textOptions.replayButtonText)
    this.leftButtons.push(switchSidesButton)

    for (const button of this.leftButtons) {
      const i = this.leftButtons.indexOf(button)
      button.mesh.matrix.offset = ReadonlyPin.Left.cloneOffset(
        BUTTON_MARGINS * (i + 1) + REPLAY_BUTTON_SIZE * i,
        0
      )
    }
    const moreButton = createButton(
      mainBarContainer,
      () => {
        this.more.visible = !this.more.visible
        moreButton.selected = this.more.visible
      },
      Pin.fromPixels(REPLAY_BUTTON_SIZE, REPLAY_BUTTON_SIZE),
      ReadonlyPin.Right,
      ReadonlyPin.Right.cloneOffset(-BUTTON_MARGINS, 0)
    )
    moreButton.selected = !device.isMobile

    moreButton.basePaletteRow = PALETTE_ROW.PURPLE
    createButtonText(moreButton.mesh, '↥', textOptions.replayButtonText)

    listenToProperty(
      statePlayer,
      'isPlaying',
      isPlaying => {
        pauseButtonText.text = isPlaying ? '↦' : '⚅'
      },
      true
    )

    const saveDeckStringButton = createButton(
      this.more,
      () =>
        copyToClipboardButton(() => {
          const p = statePlayer.record?.localPlayer
          if (p === undefined) {
            throw new Error('No player')
          }

          const deckString = statePlayer.record?.players[p].deckString
          if (!deckString) {
            throw new Error('no deckstring')
          }
          return deckString
        })(saveDeckStringButton, saveDeckStringText),
      Pin.fromPixels(REPLAY_BUTTON_SIZE * 4, REPLAY_BUTTON_SIZE * 1.1),
      ReadonlyPin.Bottom,
      ReadonlyPin.Bottom.cloneOffset(0, -BUTTON_MARGINS)
    )
    const saveDeckStringText = createButtonText(
      saveDeckStringButton.mesh,
      'Copy Deck'
    )

    const saveReplayNowButton = createButton(
      this.more,
      () =>
        copyToClipboardButton(() => {
          return `${window.location.origin}${
            window.location.pathname
          }?mode=REPLAY&replayMatchID=${queryParams.replayMatchID}&replayID=${
            queryParams.replayID
          }&serializedGamePlayer=${queryParams.serializedGamePlayer()}&replayTimestamp=${
            statePlayer.time
          }`
        })(saveReplayNowButton, copyLinkNowText),
      Pin.fromPixels(REPLAY_BUTTON_SIZE * 4, REPLAY_BUTTON_SIZE * 1.1),
      ReadonlyPin.Bottom,
      ReadonlyPin.Bottom.cloneOffset(
        0,
        -BUTTON_MARGINS * 2 - REPLAY_BUTTON_SIZE
      )
    )

    const copyLinkNowText = createButtonText(
      saveReplayNowButton.mesh,
      'Copy Link (0:00)'
    )

    const saveReplayButton = createButton(
      this.more,
      () =>
        copyToClipboardButton(() => {
          return `${window.location.origin}${
            window.location.pathname
          }?mode=REPLAY&replayMatchID=${queryParams.replayMatchID}&replayID=${
            queryParams.replayID
          }&serializedGamePlayer=${queryParams.serializedGamePlayer()}`
        })(saveReplayButton, copyLinkText),
      Pin.fromPixels(REPLAY_BUTTON_SIZE * 4, REPLAY_BUTTON_SIZE * 1.1),
      ReadonlyPin.Bottom,
      ReadonlyPin.Bottom.cloneOffset(
        0,
        -BUTTON_MARGINS * 3 - REPLAY_BUTTON_SIZE * 2
      )
    )
    const copyLinkText = createButtonText(saveReplayButton.mesh, 'Copy Link')

    const valueTextApproxWidth = 42
    const valueTextMesh = new UITextMesh('0:00', textOptions.replayTimeText)
    valueTextMesh.matrix.setConstraintsPosition(
      ReadonlyPin.Left.cloneOffset(leftSideButtonsSize, 0)
    )
    playbackProgress.listen(() => {
      valueTextMesh.text = playbackProgress.valueString
      if (copyLinkNowText.text.toString().includes('Copy Link')) {
        copyLinkNowText.text = `Copy Link (${playbackProgress.valueString})`
      }
    })
    mainBarContainer.add(valueTextMesh)
    if (queryParams.test === 'ui.replay') {
      return
    }

    if (!statePlayer.record) {
      throw new Error('No replay loaded!')
    }
    // TODO include winner in matchlog? or get from API
    const record = statePlayer.record
    const metaInfoTextMesh = new UITextMesh(
      [
        {
          text: ` / ${getTimeString(statePlayer.recordDuration() / 1000)}`,
          color: textOptions.replayTimeText.color
        },
        { text: ` ${DOT} `, color: 0xac8fff },
        ...record.players.reduce<Array<TextSegment>>((arr, p, i) => {
          arr.push({
            text: p.account.name,
            color: 0xac8fff
          })

          if ((record.winningPlayer || 0) - 1 === i) {
            arr.push({
              text: '♕',
              color: 0xffc051
            })
          }
          if (i == 0) {
            arr.push({
              text: ' vs ',
              color: 0xc5b4f5
            })
          }
          return arr
        }, []),
        {
          text: ` ${DOT} `,
          color: 0xac8fff
        },
        ...(record.status !== MatchStatus.COMPLETED
          ? [
              {
                text: `Won via ${matchStatusText[record.status]} ${DOT} `,
                color: 0xac8fff
              }
            ]
          : []),
        {
          text: `Played on ${new Date(record.firstFrameTime).toLocaleDateString(
            'en-US',
            {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }
          )}`,
          color: 0xc5b4f5
        }
      ],
      textOptions.replayTimeText
    )
    metaInfoTextMesh.matrix.setConstraintsPosition(
      ReadonlyPin.Left.cloneOffset(
        leftSideButtonsSize + valueTextApproxWidth,
        0
      )
    )
    mainBarContainer.add(metaInfoTextMesh)
    setupDone.then(() => statePlayer.play())
  }

  startParticles() {
    if (this.pauseButton) {
      const e = emitParticlesInLineShape(
        this.pauseButton.mesh,
        __shapeData,
        'uiSparks'
      )
      console.log('sparks', e)
      this.stopParticles = e.destroy
    }
  }
}

const DOT = '∙'

function buttonsSizeWithMargins(numButtons: number) {
  return BUTTON_MARGINS + numButtons * (REPLAY_BUTTON_SIZE + BUTTON_MARGINS)
}

const matchStatusText: { [K in MatchStatus]: string } = {
  ABANDONED: 'abandon',
  COMPLETED: 'regular defeat',
  CRASHED: 'match crash',
  FORFEITED: 'concede',
  IN_PROGRESS: '???',
  UNKNOWN: '???'
}
