import { GameMode } from '@opensky/proto'
import { muteAudio } from '@opensky/shared/userSettings'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Howler } from 'howler'

import { BUTTON_HEIGHT, BUTTON_MARGINS } from '~/constants'
import { initSkyTimer } from '~/controllers/skyTimerController'
import env from '~/env'
import {
  gameMode,
  isOnlineGame,
  LocalGameMode
} from '~/helpers/envGameModeHelpers'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import queryParams from '~/queryParams'
import { arenaReady } from '~/scenes/arena'
import { appStore } from '~/state/stores/AppStore'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import {
  showPing,
  toggleActionHistorySideBarOpen,
  toggleSkyControls,
  toggleSkyTimer
} from '~/userSettings'
import { globalAccess } from '~/utils/globalAccess'
import {
  createButton,
  createButtonIcon,
  giveButtonKeyboardShortcut
} from '~/utils/ui'

import { UI } from '..'
import PingDisplay from '../components/PingDisplay'
import PinnedButton from '../components/PinnedButton'
import { SidebarStatus } from '../components/SlideOutSidebar/constants'
import UIContainer from '../components/UIContainer'

export default class HUDContainer extends UIContainer {
  buttonActionHistory: PinnedButton
  buttonSettings: PinnedButton
  buttonDeckViewer: PinnedButton
  constructor(ui: UI, priority: number) {
    super(ui, 'hud', {
      priority
    })
  }
  protected async init() {
    const buttonHeight = BUTTON_HEIGHT
    const buttonWidth = BUTTON_HEIGHT * 1.2
    const marginX = BUTTON_MARGINS
    const marginY = BUTTON_MARGINS
    let cursorX = marginX

    const versionString = new UITextMesh(
      `OpenSky v${env.GITCOMMIT.slice(0, 10)}`,
      {
        ...textOptions.generic,
        vAlign: 'top',
        align: 'right',
        size: 12
      }
    )
    versionString.matrix.setConstraintsPosition(
      ReadonlyPin.TopRight.cloneOffset(0, 0)
    )
    versionString.opacity = 0.2
    this.add(versionString)

    this.buttonSettings = createButton(
      this,
      async () => {
        const settingsContainer = this.ui.getContainer('settings')
        await settingsContainer.ready
        settingsContainer.fadeIn()
      },
      Pin.fromPixels(buttonWidth, buttonHeight),
      ReadonlyPin.TopRight,
      ReadonlyPin.TopRight.cloneOffset(-cursorX, marginY),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'buttonReplay'
    )
    createButtonIcon(this.buttonSettings.mesh, 'ui-icon-settings')

    giveButtonKeyboardShortcut(this.buttonSettings, 'Escape')
    cursorX += buttonWidth + marginX * 1.5

    const buttonMute = createButton(
      this,
      () => (muteAudio.value = !muteAudio.value),
      Pin.fromPixels(buttonWidth, buttonHeight),
      ReadonlyPin.TopRight,
      ReadonlyPin.TopRight.cloneOffset(-cursorX, marginY)
    )
    const buttonMuteOnIcon = createButtonIcon(
      buttonMute.mesh,
      'ui-icon-sound-on'
    )
    const buttonMuteOffIcon = createButtonIcon(
      buttonMute.mesh,
      'ui-icon-sound-off'
    )

    buttonMuteOffIcon.visible = false
    muteAudio.listen(muted => {
      Howler.mute(muted)
      buttonMuteOnIcon.visible = !muted
      buttonMuteOffIcon.visible = muted
    })

    listenToProperty(
      appStore,
      'status',
      () => {
        const appMuted = !appStore.isActive
        Howler.mute(appMuted || muteAudio.value)
      },
      true
    )

    cursorX += buttonWidth + marginX * 1.5

    const buttonActionHistory = createButton(
      this,
      async () => {
        const container = this.ui.getContainer('actionHistory')
        await container.ready
        if (container.sidebar.started.isResolved) {
          container.sidebar.toggle()
        }
      },
      Pin.fromPixels(buttonWidth, buttonHeight),
      ReadonlyPin.TopRight,
      ReadonlyPin.TopRight.cloneOffset(-cursorX, marginY)
    )
    toggleActionHistorySideBarOpen.listen(isOpen => {
      buttonActionHistory.selected = isOpen
    })
    createButtonIcon(buttonActionHistory.mesh, 'ui-icon-history')
    this.buttonActionHistory = buttonActionHistory
    if (gameMode === LocalGameMode.REPLAY || gameMode === GameMode.TUTORIAL) {
      buttonActionHistory.mesh.visible = false
    }
    const deckSideBarContainer = this.ui.getContainer('deckSidebars')
    await deckSideBarContainer.ready
    const buttonDeckViewer = createButton(
      this,
      () => {
        deckSideBarContainer.playerDeckSidebar.toggle()
      },
      Pin.fromPixels(buttonWidth, buttonHeight),
      ReadonlyPin.TopRight,
      ReadonlyPin.TopRight.cloneOffset(-cursorX, marginY)
    )
    deckSideBarContainer.playerDeckSidebar.onToggle(status => {
      buttonDeckViewer.selected =
        status === SidebarStatus.Revealing || status === SidebarStatus.Revealed
    })
    this.remove(buttonDeckViewer.mesh)
    createButtonIcon(buttonDeckViewer.mesh, 'ui-icon-deck')
    this.buttonDeckViewer = buttonDeckViewer
    cursorX += buttonWidth + marginX * 1.5

    let pingDisplay: PingDisplay | null = null
    showPing.listen(active => {
      if (active) {
        if (pingDisplay) {
          return
        }
        if (isOnlineGame || queryParams.testPingDisplay) {
          pingDisplay = new PingDisplay()
          pingDisplay.mesh.matrix.setConstraints(
            Pin.fromPixels(buttonWidth * 1.45, buttonHeight / 2),
            ReadonlyPin.TopRight,
            ReadonlyPin.TopRight.cloneOffset(
              -cursorX,
              marginY + buttonHeight / 4
            )
          )
          this.add(pingDisplay.mesh)
        }
      } else {
        if (!pingDisplay) {
          return
        }
        pingDisplay.kill()
        this.remove(pingDisplay.mesh)
        pingDisplay = null
      }
    })

    if (toggleSkyTimer.value && !toggleSkyControls.value) {
      await arenaReady

      if (globalAccess.sky) {
        initSkyTimer(globalAccess.sky)
      } else {
        throw new Error('Sky not created yet')
      }
    }
  }
}
