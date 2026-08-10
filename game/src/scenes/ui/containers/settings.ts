import { i18n, TFuncKey } from '@opensky/language-manager'
import { GameMode, MatchStatus, TutorialLevel } from '@opensky/proto'
import { UserStorageKeys } from '@opensky/shared/constants'
import device from '@opensky/shared/device'
import {
  changeUrlAndReload,
  queryStringUrlReplacement
} from '@opensky/shared/utils/location'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'

import apiClient from '~/apiClient'
import { BUTTON_HEIGHT, BUTTON_MARGINS, PALETTE_ROW } from '~/constants'
import env from '~/env'
import {
  AnyGameMode,
  gameMode,
  isOnlineGame
} from '~/helpers/envGameModeHelpers'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { playSound, playSoundLoop, stopSoundLoop } from '~/helpers/soundHelpers'
import Object2D from '~/meshes/Object2D'
import queryParams from '~/queryParams'
import { store } from '~/state'
import { takeAction } from '~/systems/input/StateInteractions'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { globalAccess } from '~/utils/globalAccess'
import { NOOP } from '~/utils/jsUtils'
import { removeFromParent } from '~/utils/threeUtils'
import {
  createButton,
  createButtonText,
  createGenericModal,
  createOverlay
} from '~/utils/ui'

import { UI } from '..'
import Button from '../components/Button'
import { TOP_BAR_HEIGHT } from '../components/Modal'
import PinnedButton from '../components/PinnedButton'
import UIContainer from '../components/UIContainer'
import { goBackToWebapp } from '../helpers'
import { SupportedUIContainerNames } from '.'
import DialogContainer from './dialog'

const concedeButtonSettings: Partial<{
  [K in AnyGameMode]: {
    text: TFuncKey
    onClick: (container: SettingsContainer) => void
  }
}> & {
  default: {
    text: TFuncKey
    onClick: (container: SettingsContainer) => void
  }
} = {
  default: {
    text: 'common:options.concede',
    onClick: c => {
      DialogContainer.present(
        globalAccess.ui!,
        i18n.t('common:options.prompt.concede'),
        {
          label: i18n.t('common:options.confirm'),
          onSelect: () => {
            takeAction({ type: 'Concede' })
            c.close()
          },
          basePaletteRow: PALETTE_ROW.RED,
          useFancyHighlight: true
        },
        {
          label: i18n.t('common:options.cancel'),
          onSelect: NOOP
        }
      )
    }
  },
  REPLAY: {
    text: 'common:options.exitReplay',
    onClick: c => {
      DialogContainer.present(
        globalAccess.ui!,
        i18n.t('common:options.prompt.exitReplay'),
        {
          label: i18n.t('common:options.confirm'),
          onSelect: () => {
            goBackToWebapp()
            c.close()
          },
          basePaletteRow: PALETTE_ROW.RED,
          useFancyHighlight: true
        },
        {
          label: i18n.t('common:options.cancel'),
          onSelect: NOOP
        }
      )
    }
  },
  SPECTATE: {
    text: 'common:options.stopSpectating',
    onClick: c => {
      DialogContainer.present(
        globalAccess.ui!,
        i18n.t('common:options.stopSpectating'),
        {
          label: i18n.t('common:options.confirm'),
          onSelect: () => {
            goBackToWebapp()
            c.close()
          },
          basePaletteRow: PALETTE_ROW.RED,
          useFancyHighlight: true
        },
        {
          label: i18n.t('common:options.cancel'),
          onSelect: NOOP
        }
      )
    }
  },
  TUTORIAL: {
    text: 'common:options.exitTutorial',
    onClick: c => {
      DialogContainer.present(
        globalAccess.ui!,
        i18n.t('common:options.prompt.exitTutorial'),
        {
          label: i18n.t('common:options.confirm'),
          onSelect: async () => {
            if (!queryParams.skipAuth && !queryParams.lethalPuzzleURL) {
              await apiClient.botMatchEnd({
                req: {
                  mode: GameMode.TUTORIAL,
                  metrics: {},
                  status: MatchStatus.COMPLETED,
                  turnNonce: 0,
                  tutorialLevel: TutorialLevel.LEVEL_1,
                  winningPlayer: 1, // pretend we won so it completes
                  deckString: '',
                  playerSessionId: window.sessStorage?.sessionId,
                  matchStartedAt: (
                    store.matchStartTime ?? new Date()
                  ).toISOString(),
                  playerQuestProgressUpdates: {}
                }
              })
              await apiClient.userStorageSave({
                key: UserStorageKeys.TUTORIAL_PROGRESS,
                object: [1]
              })
            }
            goBackToWebapp()
            c.close()
          },
          basePaletteRow: PALETTE_ROW.RED,
          useFancyHighlight: true
        },
        {
          label: i18n.t('common:options.cancel'),
          onSelect: NOOP
        }
      )
    }
  }
}

export default class SettingsContainer extends UIContainer {
  concedeButton: Button
  modalMesh: Object2D
  constructor(ui: UI, priority: number) {
    super(ui, 'settings', {
      priority,
      closeOnEscape: true
    })
  }
  protected async init() {
    createOverlay(this, () => {
      this.close()
    })
    let totalButtons = 3

    const hasSpectateButton = queryParams.allowOfflineSpectating || isOnlineGame

    if (hasSpectateButton) {
      totalButtons++
    }

    const hasReportButton =
      queryParams.allowOfflineReporting ||
      (isOnlineGame &&
        gameMode !== GameMode.CHALLENGE_CONSTRUCTED &&
        gameMode !== GameMode.CHALLENGE_DISCOVERY &&
        gameMode !== GameMode.PRACTICE_BOT)

    if (hasReportButton) {
      totalButtons++
    }

    const height =
      totalButtons * BUTTON_HEIGHT +
      (totalButtons + 1) * BUTTON_MARGINS * 1.4 +
      (device.isMobile ? 50 : 40) +
      TOP_BAR_HEIGHT
    const settingsModal = createGenericModal('dark', 'none')
    settingsModal.mesh.matrix.setConstraints(Pin.fromPixels(400, height))
    this.add(settingsModal.mesh)
    this.modalMesh = settingsModal.mesh

    let cursor = 36 + TOP_BAR_HEIGHT
    const makeLocalButton = (
      label: string,
      onClick: (button: PinnedButton, text: UITextMesh) => void,
      useFancyHighlight?: boolean
    ) => {
      const button = createButton(
        settingsModal.mesh,
        () => onClick(button, text),
        Pin.fromPixels(180, BUTTON_HEIGHT),
        ReadonlyPin.Top,
        ReadonlyPin.Top.cloneOffset(0, cursor),
        undefined,
        undefined,
        undefined,
        useFancyHighlight
      )
      cursor += BUTTON_HEIGHT + BUTTON_MARGINS * 1.4
      const text = createButtonText(button.mesh, label, textOptions.buttonText)
      return { button, text }
    }
    const concedeSettings =
      concedeButtonSettings[gameMode] ?? concedeButtonSettings.default
    this.concedeButton = makeLocalButton(
      i18n.t(concedeSettings.text),
      () => concedeSettings.onClick(this),
      true
    ).button

    this.concedeButton.basePaletteRow = PALETTE_ROW.RED

    type TransToContainer = Partial<{
      [K in TFuncKey]: SupportedUIContainerNames
    }>

    const reportButton = (
      hasReportButton
        ? {
            'common:options.report': 'report'
          }
        : {}
    ) satisfies TransToContainer

    const spectateButton = (
      hasSpectateButton
        ? {
            'common:options.spectate.spectateLink': 'shareSpectate'
          }
        : {}
    ) satisfies TransToContainer

    const buttonsToContainers = {
      'common:options.options': 'options',
      ...reportButton,
      ...spectateButton
    } as const satisfies TransToContainer

    for (const label of Object.keys(buttonsToContainers) as Array<
      keyof typeof buttonsToContainers
    >) {
      const container = buttonsToContainers[label]!
      const { button, text } = makeLocalButton(i18n.t(label), async () => {
        const nextContainer = this.ui.getContainer(container)
        await nextContainer.ready
        nextContainer.fadeIn()
        this.close()
      })
      if (container === 'report') {
        const reportCont = this.ui.getContainer('report')
        await reportCont.ready
        listenToProperty(reportCont, 'reported', reported => {
          button.disabled = reported
          if (reported) {
            text.text = i18n.t('common:options.reported')!
          }
        })
      }
    }
    const mobileHeadOffset = device.isMobile ? 6 : 0
    const settingsLabel = i18n.t('common:options.settings')
    const textMesh = new UITextMesh(settingsLabel, textOptions.modalTitle)
    textMesh.matrix.setConstraintsPosition(
      ReadonlyPin.Top.cloneOffset(0, 27 + mobileHeadOffset)
    )
    settingsModal.mesh.add(textMesh)

    const versionString = new UITextMesh(
      `OpenSky v${env.GITCOMMIT.slice(0, 10)}`,
      {
        ...textOptions.generic,
        vAlign: 'top',
        size: 12
      }
    )
    versionString.matrix.setConstraintsPosition(
      ReadonlyPin.Bottom.cloneOffset(0, -BUTTON_HEIGHT / 2)
    )
    settingsModal.mesh.add(versionString)

    makeLocalButton(i18n.t('common:options.done'), () => this.close())
  }

  swapInReplayButton() {
    removeFromParent(this.concedeButton.mesh)
    const button = createButton(
      this.modalMesh,
      async () => {
        await DialogContainer.present(
          this.ui,
          i18n.t('common:options.prompt.watchReplay') as string,
          {
            label: i18n.t('common:options.confirm'),
            onSelect: () => {
              this.concedeButton.disabled = true
              changeUrlAndReload(
                queryStringUrlReplacement(location.href, {
                  mode: 'REPLAY',
                  serializedGamePlayer: `${store.player}`,
                  replayMatchID: `${store.matchID}`,
                  replayID: `${store.replayID}`
                })
              )
              this.close()
            },
            basePaletteRow: PALETTE_ROW.GREEN,
            useFancyHighlight: true
          },
          {
            label: i18n.t('common:options.cancel'),
            onSelect: NOOP
          }
        )
      },
      Pin.fromPixels(180, BUTTON_HEIGHT),
      ReadonlyPin.Top,
      ReadonlyPin.Top.cloneOffset(0, 36 + TOP_BAR_HEIGHT),
      undefined,
      undefined,
      undefined,
      true
    )
    button.basePaletteRow = PALETTE_ROW.GREEN
    createButtonText(
      button.mesh,
      i18n.t('common:options.watchReplay') as string,
      textOptions.buttonText
    )
  }

  fadeIn(duration?: number) {
    playSoundLoop('audioFxCommon', 'MenuAmb')
    return super.fadeIn(duration)
  }

  close() {
    playSound('audioFxCommon', 'BoxClose')
    stopSoundLoop('audioFxCommon', 'MenuAmb')
    this.fadeOut()
  }
}
