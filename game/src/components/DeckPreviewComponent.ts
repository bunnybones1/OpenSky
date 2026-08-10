import {
  listenToProperty,
  stopListeningToProperty
} from '@opensky/shared/utils/propertyListeners'
import { Component, Entity } from 'gg'
import { Color, Vector2 } from 'three'

import {
  COLOR_DECK_BUFFED_TEXT,
  COLOR_DECK_NERFED_TEXT,
  COLOR_WHITE
} from '~/colors/colorLibrary'
import { ARENA_ANGLE, RENDER_ORDERS } from '~/constants'
import IconIndicator, { IconIndicatorName } from '~/meshes/IconIndicator'
import { simpleTweener } from '~/systems/animation/tweeners'
import TextMesh from '~/systems/text/TextMesh'
import * as textOptions from '~/systems/text/TextOptions'
import { cameraShaker } from '~/utils/cameraShaker'
import { addText } from '~/utils/textUtils'
import { removeFromParent } from '~/utils/threeUtils'

import { Components } from '.'

const ICON_GROUP_SETTINGS: { [K in GroupAssignment]: GroupSettings } = {
  major: { distanceBetweenIcons: 0.05, x: 0, z: 0 },
  minor: { distanceBetweenIcons: 0.03, x: 0.04, z: -0.016 }
}

const __supportedIconNames: IconIndicatorName[] = [
  'ReturnToHand',
  'Summon',
  'dust',
  'buff-arrow-encircled',
  'buff-arrow-encircled-flipped-up'
]

type GroupSettings = {
  distanceBetweenIcons: number
  x: number
  z: number
}

type SupportedPropNames =
  | 'summon'
  | 'dusted'
  | 'returnToHand'
  | 'buffed'
  | 'debuffed'

type IconDetails = {
  propName: SupportedPropNames
  position: Vector2
  group: GroupAssignment
  textAlign: 'center' | 'right'
  textColor: Color
  shadow: boolean
}

type GroupAssignment = 'major' | 'minor'

const __counterPropNameByIconName: Map<IconIndicatorName, IconDetails> =
  new Map()

__counterPropNameByIconName.set('ReturnToHand', {
  propName: 'returnToHand',
  position: new Vector2(0.09, -0.07),
  group: 'major',
  textAlign: 'center',
  textColor: COLOR_WHITE,
  shadow: true
})
__counterPropNameByIconName.set('Summon', {
  propName: 'summon',
  position: new Vector2(0, -0.012),
  group: 'major',
  textAlign: 'center',
  textColor: COLOR_WHITE,
  shadow: true
})
__counterPropNameByIconName.set('dust', {
  propName: 'dusted',
  position: new Vector2(0, -0.012),
  group: 'major',
  textAlign: 'center',
  textColor: COLOR_WHITE,
  shadow: true
})
__counterPropNameByIconName.set('buff-arrow-encircled', {
  propName: 'debuffed',
  position: new Vector2(-0.04, -0.006),
  group: 'minor',
  textAlign: 'right',
  textColor: COLOR_DECK_NERFED_TEXT,
  shadow: false
})
__counterPropNameByIconName.set('buff-arrow-encircled-flipped-up', {
  propName: 'buffed',
  position: new Vector2(-0.04, -0.006),
  group: 'minor',
  textAlign: 'right',
  textColor: COLOR_DECK_BUFFED_TEXT,
  shadow: false
})

export default class DeckPreviewComponent extends Component<void> {
  private _fader = { opacity: 1 }
  private _labels: TextMesh[] = []
  private _icons: IconIndicator[] = []
  constructor() {
    super()

    listenToProperty(this._fader, 'opacity', this._onOpacityChange)
  }

  _onOpacityChange = (opacity: number) => {
    for (const icon of this._icons) {
      icon.opacity = opacity
    }
    for (const label of this._labels) {
      label.opacity = opacity
    }
  }

  onAttach(deckEntity: Entity<Components>) {
    const direction = deckEntity
      .get('deck')
      .ownedCardStatus.includes('Graveyard')
      ? 1
      : -1

    const icons: { [K in GroupAssignment]: IconIndicator[] } = {
      major: [],
      minor: []
    }

    for (const iconName of __supportedIconNames) {
      const details = __counterPropNameByIconName.get(iconName)!
      const icon = new IconIndicator(iconName, details.shadow)
      const data = deckEntity.get('deckPreviewManager')
      const total = data[details.propName]
      // + (__supportedIconNames.indexOf(iconName) % 2) * 10 + 5
      if (total === 0) {
        continue
      }

      deckEntity.get('transform').add(icon)
      icon.rotation.x = ARENA_ANGLE - Math.PI / 2
      icon.scale.multiplyScalar(0.13)
      icon.position.y -= 0.025

      const delta = icon.position
        .clone()
        .sub(cameraShaker.camera.position)
        .normalize()
        .multiplyScalar(0.02)
      icon.position.add(delta)
      icon.position.x += 0.01 * direction

      if (total > 1) {
        const count = addText(
          icon,
          total,
          {
            ...textOptions.cardNumber,
            align: details.textAlign,
            color: details.textColor
          },
          details.position.x,
          details.position.y,
          -0.003
        )
        this._labels.push(count)

        count.name = 'COUNT'
        count.renderOrder = RENDER_ORDERS.damage + 2
        count.rotateX(-Math.PI / 2)
        count.scale.multiplyScalar(6.5)

        const countShadow = addText(
          icon,
          total,
          { ...textOptions.cardNumberShadow, align: details.textAlign },
          details.position.x +
            (details.textAlign === 'center' ? -0.001 : 0.0075),
          details.position.y - 0.012,
          -0.001
        )
        this._labels.push(countShadow)

        countShadow.name = 'COUNT_SHADOW'
        countShadow.renderOrder = RENDER_ORDERS.damage + 2
        countShadow.rotateX(-Math.PI / 2)
        countShadow.scale.multiplyScalar(6.5)
      }

      this._icons.push(icon)
      icons[details.group].push(icon)
    }
    this._fader.opacity = 0

    simpleTweener.to({
      description: 'deck preview animate in',
      target: this._fader,
      propertyGoals: { opacity: 1 },
      duration: 500
    })

    for (const groupName of ['major', 'minor'] as const) {
      const settings = ICON_GROUP_SETTINGS[groupName]
      const groupIcons = icons[groupName]
      const spreadLength =
        (groupIcons.length - 1) * settings.distanceBetweenIcons
      const spreadOffset = spreadLength * 0.5
      for (let i = 0; i < groupIcons.length; i++) {
        const icon = groupIcons[i]
        icon.position.z +=
          settings.distanceBetweenIcons * i - spreadOffset + settings.z
        icon.position.x += settings.x * direction
      }
    }
  }

  onDetach(): void {
    simpleTweener.to({
      description: 'deck preview animate out',
      target: this._fader,
      propertyGoals: { opacity: 0 },
      duration: 500,
      onComplete: () => {
        for (const icon of this._icons) {
          removeFromParent(icon)
        }
        stopListeningToProperty(this._fader, 'opacity', this._onOpacityChange)
      }
    })
  }
}
