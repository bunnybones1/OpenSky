import { CardLocation, InstanceID } from '@skyweaver/state-metadata'

import { getCardCache } from './cardCache'
import { ownedZoneCollections } from './helpers/zoneCollections'
import PaletteMappedButton from './scenes/ui/components/PaletteMappedButton'
import DialogContainer from './scenes/ui/containers/dialog'
import { getScreenSpace } from './utils/camera'
import { cameraShaker } from './utils/cameraShaker'
import { globalAccess } from './utils/globalAccess'
import {
  findActiveSkipOrContinueButton,
  getButtonScreenPosition,
  Position
} from './utils/ui'

const buttons = [
  'CardSelection',
  'Settings',
  'Concede',
  'DialogLeft',
  'DialogRight',
  'Skip'
] as const

if (import.meta.hot) {
  import.meta.hot.accept('./scenes/ui/containers/dialog', () => {
    console.warn(
      'DialogContainer updated, not forcing a refresh via automatation.ts'
    )
  })
}

export interface Automation {
  PlayerField: () => InstanceID[]
  OpponentField: () => InstanceID[]
  PlayerHand: () => InstanceID[]
  PlayerCardSelection: () => InstanceID[]
  getCardPosition(id: InstanceID | CardLocation): Position | void
  getButtonPosition: (button: (typeof buttons)[number]) => Position | void
}

export function setupAutomation() {
  const zones: {
    [Z in
      | 'PlayerField'
      | 'OpponentField'
      | 'PlayerHand'
      | 'PlayerCardSelection']: () => InstanceID[]
  } = {
    PlayerCardSelection: () =>
      ownedZoneCollections.Player_CardSelection.items.map(
        c => c.get('cardInstance').id
      ),
    PlayerField: () =>
      ownedZoneCollections.Player_Field.items.map(
        c => c.get('cardInstance').id
      ),
    OpponentField: () =>
      ownedZoneCollections.Opponent_Field.items.map(
        c => c.get('cardInstance').id
      ),
    PlayerHand: () =>
      ownedZoneCollections.Player_Hand.items.map(c => c.get('cardInstance').id)
  }
  function getButtonPosition(
    button: (typeof buttons)[number]
  ): Position | void {
    const ui = globalAccess.ui
    if (!ui) {
      return
    }
    let b: PaletteMappedButton['mesh'] | undefined = undefined
    switch (button) {
      case 'CardSelection':
        b = ui.getContainer('cardSelection').finishButton.mesh
        break
      case 'Settings':
        b = ui.getContainer('hud').buttonSettings.mesh
        break
      case 'Concede':
        b = ui.getContainer('settings').concedeButton.mesh
        break
      // eslint-disable-next-line no-duplicate-case
      case 'DialogLeft':
      case 'DialogRight': {
        const dialog = DialogContainer.getTopDialog()
        if (dialog) {
          b =
            dialog[button === 'DialogLeft' ? 'leftOption' : 'rightOption']
              .button.mesh
        }
        break
      }
      case 'Skip':
        b = findActiveSkipOrContinueButton()
        break
      default: {
        const _: never = button
        console.error('got unexpected button', _)
      }
    }

    if (b) {
      return getButtonScreenPosition(b)
    }
  }

  const automation = {
    getCardPosition(id: InstanceID | CardLocation): Position | void {
      const entity = getCardCache().getEntity(id)
      if (!entity) {
        return
      }
      const pos = getScreenSpace(
        cameraShaker.camera,
        entity.get('transform').position
      )
      return { x: pos.x, y: pos.y }
    },
    // Individual methods for each
    getButtonPosition,
    ...buttons.reduce(
      (o, button) => ({
        ...o,
        [`get${button[0].toUpperCase()}${button.slice(1)}ButtonPosition`]: () =>
          getButtonPosition(button)
      }),
      {}
    ),
    ...zones
  }

  window.automation = automation
}
