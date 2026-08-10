import { Account } from '@opensky/proto'
import { StickerLibrary } from '@opensky/shared/cosmetics'
import { LocalGameMode } from '@opensky/shared/gameModes'
import { Texture } from 'three'

import apiClient from '~/apiClient'
import { getAssetsManager } from '~/assets'
import {
  BREAKDOWN_BAR_HEIGHT,
  BUTTON_MARGINS,
  END_TURN_BUTTON_HEIGHT,
  SIDEBAR_WIDTH,
  SKYTAG_HEIGHT,
  SKYTAG_WIDTH
} from '~/constants'
import { putChildAtBottom } from '~/helpers/I2D'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import keyboardShortcuts from '~/keyboardShortcuts'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import { store } from '~/state'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import keyboard from '~/systems/input/keyboard'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { showSpectatorCount } from '~/userSettings'
import { globalAccess } from '~/utils/globalAccess'
import { getTempTexture } from '~/utils/tempTexture'
import { safelyResetFlipY } from '~/utils/textureUtils'
import { recursivelySetDepth } from '~/utils/threeUtils'
import { createButton, createButtonText } from '~/utils/ui'

import { UI } from '..'
import PinnedButton from '../components/PinnedButton'
import { createHUDSkyTag, SkyTagVersion } from '../components/SkyTag'
import {
  SidebarPosition,
  SidebarStatus
} from '../components/SlideOutSidebar/constants'
import {
  createCloseButton,
  SlideOutSidebar
} from '../components/SlideOutSidebar/SlideOutSidebar'
import UIContainer from '../components/UIContainer'

export default class SpectatorCountContainer extends UIContainer {
  buttonActionHistory: PinnedButton
  buttonSettings: PinnedButton
  buttonDeckViewer: PinnedButton
  sidebar: SlideOutSidebar<
    Account & {
      canSeeHand: boolean
    },
    string,
    AccountRow
  >
  constructor(ui: UI, priority: number) {
    super(ui, 'spectatorCount', {
      priority
    })
  }
  protected init() {
    let sidebarPlayerCountText: UITextMesh | undefined
    this.sidebar = new SlideOutSidebar(
      SidebarPosition.Right,
      AccountRow as any,
      row => row.account,
      accountOrAddress =>
        typeof accountOrAddress === 'string'
          ? accountOrAddress
          : accountOrAddress.address,
      {
        createBar: yOffset => {
          const bar = getAssetsManager().fetchMeshDeepClone(
            'uiSmall',
            'breakdown-box',
            true,
            true
          )
          bar.shouldRenderAsGroup = true

          const barHeight = BREAKDOWN_BAR_HEIGHT

          bar.matrix.setConstraints(
            new Pin(1, 0, 0, barHeight),
            ReadonlyPin.TopLeft,
            ReadonlyPin.TopLeft.cloneOffset(0, yOffset)
          )
          sidebarPlayerCountText = new UITextMesh('♙ --', {
            ...textOptions.buttonText,
            size: 20,
            align: 'left'
          })
          bar.add(sidebarPlayerCountText)
          sidebarPlayerCountText.matrix.setConstraints(
            undefined,
            ReadonlyPin.Left,
            ReadonlyPin.Left.cloneOffset(BUTTON_MARGINS, 0)
          )
          updateSpectators()

          return { bar, yOffset: yOffset + barHeight }
        },
        itemSorter: (a, b) => +b.account.canSeeHand - +a.account.canSeeHand
      }
    )
    this.add(this.sidebar)
    createCloseButton(this, this.sidebar)

    keyboard.listenToKey(keyboardShortcuts.Spectators, () => {
      this.sidebar.toggle()
    })

    // add specate settings
    const spectatorButton = createButton(
      this,
      () => {
        this.sidebar.toggle()
      },
      Pin.fromPixels(100, 40),
      ReadonlyPin.BottomRight,
      ReadonlyPin.BottomRight.cloneOffset(
        -BUTTON_MARGINS,
        -END_TURN_BUTTON_HEIGHT - 12 - BUTTON_MARGINS
      )
    )
    const playerCountText = createButtonText(spectatorButton.mesh, '♙ --', {
      ...textOptions.buttonText,
      size: 24
    })

    recursivelySetDepth(this, 0.9)

    const updateSpectators = () => {
      const t = `♙ ${showSpectatorCount.value ? store.spectators.length : '--'}`

      playerCountText.text = t
      if (sidebarPlayerCountText) {
        sidebarPlayerCountText.text = t + ' watching'
      }

      if (!this.visible && store.spectators.length > 0) {
        this.fadeIn()
      }
      for (const oldAddress of this.sidebar.allItems) {
        if (!store.spectators.some(s => s.address === oldAddress)) {
          this.sidebar.removeRow(oldAddress)
        }
      }
      for (const curr of store.spectators) {
        if (!this.sidebar.hasRow(curr.address, true)) {
          const acc = {
            ...loadingAccount,
            id: curr.id,
            address: curr.address,
            name: curr.address,
            canSeeHand: curr.canSeeHand
          }

          if (acc.address.startsWith('0x')) {
            apiClient
              .getAccount({ address: acc.address })
              .then(({ account }) => {
                Object.assign(acc, account)
              })
              .finally(() => {
                this.sidebar.createRow(acc)
              })
          } else {
            this.sidebar.createRow(acc)
          }
        }
      }
    }

    showSpectatorCount.listen(updateSpectators)
    store.subscribeToSpectators(updateSpectators)

    store.subscribeToSpectatorStickers((address, sticker) => {
      const username = this.sidebar.getRow(address)?.account?.name
      const mesh = makeFloatySticker(username, sticker)
      if (!mesh) {
        return
      }
      const deckSideBar = this.ui.getContainer('deckSidebars')

      const isSidebarOpen =
        deckSideBar.playerDeckSidebar.status === SidebarStatus.Revealed ||
        this.sidebar.status === SidebarStatus.Revealed
      const pin = ReadonlyPin.BottomRight.cloneOffset(
        -BUTTON_MARGINS - 70 - (isSidebarOpen ? SIDEBAR_WIDTH : 0),
        -END_TURN_BUTTON_HEIGHT - 12 - BUTTON_MARGINS
      )
      const startX = pin.x.offset
      const startY = pin.y.offset

      mesh.matrix.setConstraints(undefined, ReadonlyPin.Center, pin)
      this.add(mesh)
      putChildAtBottom(mesh)
      const randSeed = Math.random()
      recursivelySetDepth(this, 0.92)
      simpleTweener

        .to({
          description: 'animate sticker up and away',
          target: { ani: 0 },
          propertyGoals: {
            ani: 1
          },
          duration: 4000,
          onUpdate: (_, val) => {
            mesh.matrix.opacity = Easing.Custom.FlatTopHalfSin(val)
            pin.x.offset =
              (Math.sin(val + randSeed) - 1) * 50 * randSeed + startX
            pin.y.offset = val * -300 + startY
          }
        })
        .finished.then(() => {
          this.remove(mesh)
        })
    })
  }
  async fadeIn(duration?: number) {
    if (store.spectators.length > 0) {
      await super.fadeIn(duration)
    }
  }
  update(dt: number) {
    this.sidebar.update(dt)
  }
}
const loadingAccount = {
  locale: 'en',
  warmUps: 0,
  createdAt: '01/01/2020',
  updatedAt: '01/01/2020',
  experience: 0,
  level: 0,
  seasonLevel: 0,
  levelUpXP: 0
}
class AccountRow extends Object2D {
  private tag: Object2D
  constructor(
    _sidebar: unknown,
    public account: Account & {
      canSeeHand: boolean
    }
  ) {
    super()
    this.matrix.setConstraints(
      Pin.fromPixels(SIDEBAR_WIDTH, SKYTAG_HEIGHT),
      ReadonlyPin.TopLeft.clone(),
      ReadonlyPin.TopLeft.clone()
    )

    const tagContainer = new Object2D()
    tagContainer.matrix.prescale.set(0.9, 0.9)
    this.add(tagContainer)

    tagContainer.remove(this.tag)
    this.tag = createHUDSkyTag(
      globalAccess.ui!,
      this.account,
      LocalGameMode.SPECTATE,
      SkyTagVersion.Down,
      0
    )
    this.tag.matrix.setConstraints(
      Pin.fromPixels(SKYTAG_WIDTH, SKYTAG_HEIGHT),
      ReadonlyPin.Top,
      ReadonlyPin.Top
    )

    tagContainer.add(this.tag)
    if (!this.account.canSeeHand) {
      this.tag.matrix.opacity = 0.5
    }
  }
}

const STICKER_SIZE = 120

function makeFloatySticker(
  username: string | undefined,
  stickerID: number
): RectangleMesh | void {
  const stickerMesh = new RectangleMesh(
    new RectangleMaterial({
      map: getTempTexture(),
      forceTransparent: true
    })
  )
  stickerMesh.matrix.setConstraints(Pin.fromPixels(STICKER_SIZE, STICKER_SIZE))
  const stickerName = StickerLibrary.get(stickerID)?.artID
  if (!stickerName) {
    return
  }
  const stickerUrl = `game/stickers/${stickerName}.png`
  getAssetsManager()
    .load('texture', stickerUrl)
    .then((texture: Texture) => {
      safelyResetFlipY(texture)
      stickerMesh.material.uniforms.mapTexture.value = texture
    })

  const pin = Pin.fromPixels(STICKER_SIZE, 26)

  const namePlate = getAssetsManager().fetchMeshDeepClone(
    'uiSmall',
    'info-box',
    true,
    true
  )
  namePlate.matrix.setConstraints(pin, ReadonlyPin.Bottom, ReadonlyPin.Bottom)
  const name = new UITextMesh(
    username ?? 'anonymous',
    {
      ...textOptions.generic,
      size: 12
    },
    undefined,
    undefined,
    undefined,
    mesh => {
      pin.x.offset = mesh.width + 16
    }
  )
  namePlate.add(name)
  stickerMesh.add(namePlate)

  return stickerMesh
}
