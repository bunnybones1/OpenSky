import { i18n } from '@opensky/language-manager'
import { GameMode } from '@opensky/proto'
import { DECKCLASS_HEROES } from '@opensky/shared/constants'
import { StickerLibrary } from '@opensky/shared/cosmetics'
import device from '@opensky/shared/device'
import { Emote, Emotes } from '@opensky/shared/game-server-message-types'
import { prismsToDeckClass } from '@opensky/shared/helpers'
import { renderMetrics } from '@opensky/shared/renderMetrics'
import { delayPromise } from '@opensky/shared/utils/async'
import { lerp, unlerp } from '@opensky/shared/utils/math'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Player } from '@skyweaver/state-metadata'
import { Entity, System } from 'gg'
import { Vector2, Vector3 } from 'three'

import { getAssetsManager } from '~/assets'
import { Components } from '~/components'
import EmoteRingOpenComponent from '~/components/EmoteRingOpenComponent'
import GamePinCushionComponent from '~/components/GamePinCushionComponent'
import MuteEnemyRingOpenComponent from '~/components/MuteEnemyRingOpenComponent'
import StickerRingOpenComponent from '~/components/StickerRingOpenComponent'
import { debugAccounts } from '~/debugAccounts'
import { getHero } from '~/helpers/effectHelpers'
import {
  gameMode,
  isBotGame,
  isNoActionsGameMode,
  isOnlineGame,
  isReplayGame
} from '~/helpers/envGameModeHelpers'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { playSound } from '~/helpers/soundHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import { SidebarStatus } from '~/scenes/ui/components/SlideOutSidebar/constants'
import {
  makeInteractiveSpeechBubble,
  TailDirection
} from '~/scenes/ui/components/utils/speechBubbleUtils'
import { cardSelectionFinished, store, storeHelper } from '~/state'
import { accountsStore } from '~/state/AccountStore'
import { randomSample } from '~/utils/arrayUtils'
import { getScreenSpace } from '~/utils/camera'
import { cameraShaker } from '~/utils/cameraShaker'
import { globalAccess, onGlobalUiAccessReady } from '~/utils/globalAccess'
import { onNextFrame } from '~/utils/onNextFrame'
import { getTempTexture } from '~/utils/tempTexture'
import { safelyResetFlipY } from '~/utils/textureUtils'
import { removeFromParent } from '~/utils/threeUtils'
import { createOverlay } from '~/utils/ui'

import {
  Easing,
  makeRelativeTimelineRemap,
  makeSkipMiddleEase
} from './animation/Easing'
import { CompleteStatus } from './animation/RawTweener'
import { simpleTweener } from './animation/tweeners'
const STICKER_LAYOUT_MAP = [2, 3, 1, 4, 0, 5]
const MAX_BUBBLE_SLOTS = 6

const LAYOUT_SETTINGS = {
  stickers: {
    left: {
      firstAngleRatio: -0.52,
      lastAngleRatio: 0.02,
      radius: 130,
      verticalShift: 30,
      horizontalShift: 0,
      toggleBubbleVertShift: -30,
      middleOffsetAngle: -Math.PI / 2,
      distributionEase: Easing.Custom.EmoteWheelStickerDistribution,
      aspect: 0.8
    },
    right: {
      firstAngleRatio: -0.02,
      lastAngleRatio: 0.52,
      radius: 130,
      verticalShift: 30,
      horizontalShift: 30,
      toggleBubbleVertShift: -30,
      middleOffsetAngle: -Math.PI / 2,
      distributionEase: Easing.Custom.EmoteWheelStickerDistribution,
      aspect: 0.8
    },
    center: {
      firstAngleRatio: -0.37,
      lastAngleRatio: 0.37,
      radius: 110,
      verticalShift: -20,
      horizontalShift: 0,
      toggleBubbleVertShift: -20,
      middleOffsetAngle: -Math.PI / 2,
      distributionEase: makeSkipMiddleEase(0.18),
      aspect: 1.2
    }
  },
  speechBubbles: {
    left: {
      firstAngleRatio: -0.5,
      lastAngleRatio: -0.0,
      radius: 130,
      verticalShift: 30,
      horizontalShift: 30,
      toggleBubbleVertShift: -30,
      middleOffsetAngle: -Math.PI / 2,
      distributionEase: Easing.Custom.EmoteWheelDistribution,
      aspect: 0.8
    },
    right: {
      firstAngleRatio: 0.5,
      lastAngleRatio: 0.0,
      radius: 130,
      verticalShift: 30,
      horizontalShift: -30,
      toggleBubbleVertShift: -30,
      middleOffsetAngle: -Math.PI / 2,
      distributionEase: Easing.Custom.EmoteWheelDistribution,
      aspect: 0.8
    },
    center: {
      firstAngleRatio: -0.35,
      lastAngleRatio: 0.35,
      radius: 95,
      verticalShift: 0,
      horizontalShift: 0,
      toggleBubbleVertShift: -20,
      middleOffsetAngle: -Math.PI / 2,
      distributionEase: makeSkipMiddleEase(0.1),
      aspect: 1.1
    }
  }
}

const __masterPrescale = new Vector2(1, 1)

listenToProperty(renderMetrics, 'uiHeight', h => {
  const s = h / 600
  __masterPrescale.set(s, s)
})

const __emoteOffset = new Vector3(-0.025, 0, -0.02)
export default class EmoteSystem extends System<Components> {
  cardSelectionFinished = false
  private _emoteRingDismissal: (() => void) | undefined
  private _characterSpeechBubbleDismissals: Map<Entity<Components>, () => void>
  radius: number
  opponentMuted: boolean
  selectedBubble: number
  init() {
    this.opponentMuted = false
    this._characterSpeechBubbleDismissals = new Map()
    store.subscribeToEmotes((player, emote) => {
      if (this.opponentMuted && player !== store.player) {
        return
      }
      this.showEmote(player, emote)
    })
    store.subscribeToChats((player, chat) => {
      const hero = getHero(player === store.player!)
      if (!hero) {
        return
      }
      if (this.opponentMuted && player !== store.player) {
        return
      }
      this.speakFromEntity(hero, chat)
    })

    store.subscribeToStickers((player, sticker) => {
      if (this.opponentMuted && player !== store.player) {
        return
      }
      this.showSticker(player, sticker)
    })
    store.subscribeToMutes(muted => {
      this.opponentMuted = muted
    })
    EmoteRingOpenComponent.entities.listenForAdd(this.openEmoteRing)
    MuteEnemyRingOpenComponent.entities.listenForAdd(this.openMuteEnemyRing)

    StickerRingOpenComponent.entities.listenForAdd(e =>
      this.openEmoteRing(e, true)
    )
    if (!isNoActionsGameMode) {
      cardSelectionFinished.then(() => {
        this.cardSelectionFinished = true
      })
    }
  }
  update() {
    //nothing
  }

  private createMuteBubblePivot = (entity: Entity<Components>) => {
    const masterPivot = new Object2D()
    const animsIn: Promise<CompleteStatus>[] = []

    const muteBubblePivot = new Object2D()

    const stickerBubble = makeInteractiveSpeechBubble(
      { label: this.opponentMuted ? 'Un-mute' : 'Mute' },
      'center',
      () => {
        if (entity.has('muteEnemyRingOpen')) {
          entity.remove('muteEnemyRingOpen')
          if (this._emoteRingDismissal) {
            this._emoteRingDismissal()
            this._emoteRingDismissal = undefined
          }
          store.setEnemyMuted(!this.opponentMuted)
        }
      }
    )
    const stickerBubbleOffset = new Pin(0, 0)
    muteBubblePivot.matrix.offset = stickerBubbleOffset
    const stickerBubbleAnchor = new Pin(0.5, 0.5, 0, 20)
    stickerBubble.matrix.anchor = stickerBubbleAnchor
    muteBubblePivot.add(stickerBubble)
    masterPivot.add(muteBubblePivot)

    const relativeRemap = makeRelativeTimelineRemap(1, 3, 0)
    const animInVal = { value: 0.001 }
    animsIn.push(
      simpleTweener.to({
        description: 'open mute emote',
        target: animInVal,
        propertyGoals: { value: 1 },
        duration: 1000,
        easing: Easing.Linear,
        onUpdate: () => {
          const relative = relativeRemap(animInVal.value)
          const easedScale = Easing.Elastic.Out(relative)
          stickerBubbleOffset.x.offset =
            +LAYOUT_SETTINGS.stickers.center.horizontalShift
          stickerBubbleOffset.y.offset =
            LAYOUT_SETTINGS['speechBubbles']['center'].toggleBubbleVertShift -
            60
          muteBubblePivot.matrix.prescale.setScalar(Math.max(0.001, easedScale))
        }
      }).finished
    )
    return { muteBubblePivot, masterPivot }
  }

  private createBubblePivots = (
    entity: Entity<Components>,
    isSticker?: boolean
  ) => {
    const parentTransform = entity.get('transform')
    const heroScreenPosition = getScreenSpace(
      cameraShaker.camera,
      parentTransform.position
    )

    const heroPositionRatio = heroScreenPosition.x / renderMetrics.width
    const smallLayoutDirection =
      heroPositionRatio < 0.25 ? -1 : heroPositionRatio > 0.75 ? 1 : 0
    const sideLayout = smallLayoutDirection !== 0

    const settings =
      LAYOUT_SETTINGS[isSticker ? 'stickers' : 'speechBubbles'][
        heroPositionRatio < 0.25
          ? 'right'
          : heroPositionRatio > 0.75
          ? 'left'
          : 'center'
      ]
    this.radius = settings.radius
    const angleStart =
      Math.PI *
        2 *
        lerp(settings.firstAngleRatio, settings.lastAngleRatio, 0.5) +
      settings.middleOffsetAngle

    const masterPivot = new Object2D()
    const bubblePivots: Object2D[] = []
    const animsIn: Promise<CompleteStatus>[] = []

    const ownedStickers = (
      (storeHelper.useFakeStoreData
        ? debugAccounts[0]
        : accountsStore.accounts?.[store.player!]
      )?.deckEquipment?.stickers ?? []
    )
      .filter(
        s => StickerLibrary.has(s) // filter out uninitialized dev stickers
      )
      .sort()
    this.selectedBubble = -1
    const items = isSticker
      ? ({
          isSticker: true,
          list: randomSample(ownedStickers, MAX_BUBBLE_SLOTS)
        } as const)
      : ({ isSticker: false, list: Emotes } as const)

    for (let i = 0; i < items.list.length; i++) {
      const rawRatio =
        (isSticker ? STICKER_LAYOUT_MAP[i] : i) / (Emotes.length - 1)
      const ratio = settings.distributionEase(rawRatio)
      const angleEnd =
        lerp(settings.firstAngleRatio, settings.lastAngleRatio, ratio) *
          Math.PI *
          2 +
        settings.middleOffsetAngle
      const tailDir = sideLayout
        ? 'none'
        : Math.cos(angleEnd) < 0
        ? 'right'
        : 'left'
      const bubblePivot = new Object2D()
      bubblePivots.push(bubblePivot)
      const bubbleData = items.isSticker
        ? {
            stickerUrl: `game/stickers/${StickerLibrary.get(items.list[i])
              ?.artID}.png`
          }
        : {
            label: i18n.t(`emote.labels.${items.list[i]}`)
          }
      const bubble = makeInteractiveSpeechBubble(bubbleData, tailDir, () => {
        if (entity.has(isSticker ? 'stickerRingOpen' : 'emoteRingOpen')) {
          this.selectedBubble = i
          playSound('audioFxCommon', 'BubbleClick')
          items.isSticker
            ? store.sticker(items.list[i])
            : store.emote(items.list[i])
          entity.remove(isSticker ? 'stickerRingOpen' : 'emoteRingOpen')

          if (this._emoteRingDismissal) {
            this._emoteRingDismissal()
            this._emoteRingDismissal = undefined
          }
        }
      })
      bubblePivot.add(bubble)

      // const t = getAssetsManager().fetchMeshDeepClone('uiSmall', 'circle-filled-outline-outer')
      // t.matrix.setConstraints(
      //   new Pin(0, 0, 2, 2),
      //   ReadonlyPin.Center,
      //   ReadonlyPin.Center.cloneOffset(0, 0)
      // )
      // bubblePivot.add(t)
      const bubblePins = {
        left: new Pin(0, 1, 20, 18),
        right: new Pin(1, 1, -20, 18),
        none: new Pin(smallLayoutDirection * 0.5 + 0.5, 0.5, 0, 0)
      }
      const offset = isSticker ? new Pin(0.5, 0.5) : new Pin(0, 0)
      bubblePivot.matrix.offset = offset
      if (!isSticker) {
        bubble.matrix.anchor = bubblePins[tailDir]
      }
      masterPivot.add(bubblePivot)

      const sinRange = unlerp(-1, 1, Math.sin(angleEnd))

      const animVal = { value: 0.001 }
      const relativeRemap = makeRelativeTimelineRemap(1 - sinRange, 5, sinRange)
      animsIn.push(
        simpleTweener.to({
          description: 'open emote ring',
          target: animVal,
          propertyGoals: { value: 1 },
          duration: 1000,
          easing: Easing.Linear,
          onUpdate: () => {
            const relative = relativeRemap(animVal.value)
            const easedScale = Easing.Elastic.Out(relative)
            const angle = lerp(
              angleStart,
              angleEnd,
              Easing.Quartic.Out(relative)
            )
            const xOffset =
              Math.cos(angle) * this.radius * settings.aspect +
              settings.horizontalShift
            const yOffset =
              Math.sin(angle) * this.radius + settings.verticalShift
            offset.x.offset = xOffset
            offset.y.offset = yOffset
            bubblePivot.matrix.prescale.setScalar(Math.max(0.001, easedScale))
          }
        }).finished
      )
    }
    if (ownedStickers.length) {
      const stickerBubblePivot = new Object2D()
      bubblePivots.push(stickerBubblePivot)

      const stickerBubble = makeInteractiveSpeechBubble(
        { icon: entity.has('emoteRingOpen') ? 'stickers' : 'back' },
        entity.has('emoteRingOpen') ? 'center' : 'none',
        async () => {
          if (entity.has('emoteRingOpen')) {
            entity.remove('emoteRingOpen')
            if (this._emoteRingDismissal) {
              this._emoteRingDismissal()
              this._emoteRingDismissal = undefined
            }
            await delayPromise(200)
            onNextFrame(() =>
              entity.addComponent(new StickerRingOpenComponent())
            )
          } else if (entity.has('stickerRingOpen')) {
            entity.remove('stickerRingOpen')
            await delayPromise(200)
            onNextFrame(() => entity.addComponent(new EmoteRingOpenComponent()))
          }
        }
      )
      const stickerBubbleOffset = new Pin(0, 0)
      stickerBubblePivot.matrix.offset = stickerBubbleOffset
      const stickerBubbleAnchor = new Pin(
        0.5,
        0.5,
        0,
        entity.has('emoteRingOpen') ? 20 : 0
      )
      stickerBubble.matrix.anchor = stickerBubbleAnchor
      stickerBubblePivot.add(stickerBubble)
      masterPivot.add(stickerBubblePivot)

      const relativeRemap = makeRelativeTimelineRemap(1, 3, 0)
      const animInVal = { value: 0.001 }
      animsIn.push(
        simpleTweener.to({
          description: 'open sticker emote',
          target: animInVal,
          propertyGoals: { value: 1 },
          duration: 1000,
          easing: Easing.Linear,
          onUpdate: () => {
            const relative = relativeRemap(animInVal.value)
            const easedScale = Easing.Elastic.Out(relative)
            stickerBubbleOffset.x.offset =
              +LAYOUT_SETTINGS.stickers.center.horizontalShift
            stickerBubbleOffset.y.offset =
              -this.radius + settings.toggleBubbleVertShift
            stickerBubblePivot.matrix.prescale.setScalar(
              Math.max(0.001, easedScale)
            )
          }
        }).finished
      )
    }

    return { bubblePivots, masterPivot }
  }

  private openEmoteRing = async (
    entity: Entity<Components>,
    isStickerRing?: boolean
  ) => {
    if (
      !this.enabled ||
      !this.cardSelectionFinished ||
      isReplayGame ||
      gameMode === GameMode.TUTORIAL
    ) {
      entity.remove('emoteRingOpen')
      return
    }
    if (
      EmoteRingOpenComponent.entities.length === 1 ||
      StickerRingOpenComponent.entities.length === 1
    ) {
      //probably first only/one
      const container = globalAccess.ui?.getContainer('emoteRing')
      container?.ready.then(c => c.fadeIn())
    }

    this.attemptToDismissEmote(entity)

    playSound('audioFxCommon', 'BubblesSelectOpen')
    const { bubblePivots, masterPivot } = this.createBubblePivots(
      entity,
      isStickerRing
    )

    masterPivot.matrix.setConstraintsPosition(new Pin(0, 0))
    masterPivot.matrix.offset = GamePinCushionComponent.getPin(
      entity,
      __masterPinOffset
    )

    masterPivot.matrix.prescale = __masterPrescale

    await onGlobalUiAccessReady()
    const container = globalAccess.ui!.getContainer('emoteRing')!
    await container.ready

    const overlay = createOverlay(
      container,
      () => this.cancelEmoteRings(),
      false // otherwise right-clicking the hero will instantly open & close the emote ring
    )
    overlay.material.visible = false

    container.add(masterPivot)

    await new Promise<void>(resolve => {
      const relevantEntities = EmoteRingOpenComponent.entities.length
        ? EmoteRingOpenComponent.entities
        : StickerRingOpenComponent.entities
      const onRemoveRing = (e: Entity<Components>) => {
        if (e === entity) {
          relevantEntities.stopListeningForRemove(onRemoveRing)
          resolve()
        }
      }

      relevantEntities.listenForRemove(onRemoveRing)
    })
    removeFromParent(overlay)

    playSound('audioFxCommon', 'BubblesSelectClose')
    await Promise.all(
      bubblePivots.map((p, i) => {
        const animOutVal = { value: 1 }
        const callout = entity.has('emoteCallout')
        const relativeRemap = makeRelativeTimelineRemap(
          i,
          5,
          bubblePivots.length - 1 - i
        )
        const easing = callout
          ? Easing.Back.In
          : (v: number) => Easing.Quartic.In(relativeRemap(v))
        simpleTweener.to({
          description: 'close emote ring',
          target: animOutVal,
          propertyGoals: { value: 0.001 },
          duration: callout ? 400 : 300,
          delay: this.selectedBubble === i ? 1000 : 0,
          easing,
          onUpdate: () => {
            p.matrix.prescale.setScalar(Math.max(0.001, animOutVal.value))
          },
          onComplete() {
            removeFromParent(masterPivot)
          }
        })
      })
    )
  }

  private openMuteEnemyRing = async (entity: Entity<Components>) => {
    if (
      !this.enabled ||
      !this.cardSelectionFinished ||
      !isOnlineGame ||
      isBotGame
    ) {
      entity.remove('muteEnemyRingOpen')
      return
    }
    if (MuteEnemyRingOpenComponent.entities.length === 1) {
      const container = globalAccess.ui?.getContainer('emoteRing')
      container?.ready.then(c => c.fadeIn())
    }

    this.attemptToDismissEmote(entity)

    playSound('audioFxCommon', 'BubblesSelectOpen')
    const { muteBubblePivot, masterPivot } = this.createMuteBubblePivot(entity)

    masterPivot.matrix.setConstraintsPosition(new Pin(0, 0))
    masterPivot.matrix.offset = GamePinCushionComponent.getPin(
      entity,
      __masterPinOffset
    )
    masterPivot.matrix.prescale = __masterPrescale
    await onGlobalUiAccessReady()
    const container = globalAccess.ui!.getContainer('emoteRing')!
    await container.ready

    const overlay = createOverlay(
      container,
      () => this.cancelEmoteRings(),
      false // otherwise right-clicking the hero will instantly open & close the emote ring
    )
    overlay.material.visible = false

    container.add(masterPivot)

    await new Promise<void>(resolve => {
      const relevantEntities = MuteEnemyRingOpenComponent.entities
      const onRemoveRing = (e: Entity<Components>) => {
        if (e === entity) {
          relevantEntities.stopListeningForRemove(onRemoveRing)
          resolve()
        }
      }
      relevantEntities.listenForRemove(onRemoveRing)
    })
    removeFromParent(overlay)

    playSound('audioFxCommon', 'BubblesSelectClose')

    await new Promise(() => {
      const animOutVal = { value: 1 }
      const callout = entity.has('emoteCallout')
      const relativeRemap = makeRelativeTimelineRemap(0, 5, -1)
      const easing = callout
        ? Easing.Back.In
        : (v: number) => Easing.Quartic.In(relativeRemap(v))
      simpleTweener.to({
        description: 'close emote ring',
        target: animOutVal,
        propertyGoals: { value: 0.001 },
        duration: callout ? 400 : 300,
        delay: 200,
        easing,
        onUpdate: () => {
          muteBubblePivot.matrix.prescale.setScalar(
            Math.max(0.001, animOutVal.value)
          )
        },
        onComplete() {
          removeFromParent(masterPivot)
        }
      })
    })
  }

  cancelEmoteRings = () => {
    const emoteRingOpenEntities = [...EmoteRingOpenComponent.entities.items]
    for (const entity of emoteRingOpenEntities) {
      entity.remove('emoteRingOpen')
      if (entity.has('gamePinCushion')) {
        GamePinCushionComponent.releasePin(entity, __masterPinOffset)
      }
    }
    const stickerRingOpenEntities = [...StickerRingOpenComponent.entities.items]

    for (const entity of stickerRingOpenEntities) {
      entity.remove('stickerRingOpen')
      if (entity.has('gamePinCushion')) {
        GamePinCushionComponent.releasePin(entity, __masterPinOffset)
      }
    }
    const muteEnemyRingOpenEntities = [
      ...MuteEnemyRingOpenComponent.entities.items
    ]

    for (const entity of muteEnemyRingOpenEntities) {
      entity.remove('muteEnemyRingOpen')
      if (entity.has('gamePinCushion')) {
        GamePinCushionComponent.releasePin(entity, __masterPinOffset)
      }
    }
  }

  async speakFromHero(
    player: Player,
    text: string,
    tailDirection: TailDirection = 'right'
  ) {
    if (!this.enabled) {
      return
    }
    const isPlayer = store.player === player
    const heroEntity = getHero(isPlayer)
    if (!heroEntity) {
      return
    }
    await this.speakFromEntity(heroEntity, text, tailDirection)
  }

  async showTimeout(player: Player) {
    const deckClass = prismsToDeckClass(
      store.state!.state.players[player].prisms
    )
    const hero = DECKCLASS_HEROES[deckClass]

    const line = i18n.t(`emote.timeout.${hero}`)
    await this.speakFromHero(player, line, 'right')
  }
  async showSticker(player: Player, sticker: number) {
    const stickerMesh = new RectangleMesh(
      new RectangleMaterial({
        map: getTempTexture(),
        forceTransparent: true
      })
    )
    const stickerName = StickerLibrary.get(sticker)?.artID
    if (!stickerName) {
      return
    }
    const stickerUrl = `game/stickers/${stickerName}.png`
    const texture = await getAssetsManager().load('texture', stickerUrl)
    safelyResetFlipY(texture)
    stickerMesh.material.uniforms.mapTexture.value = texture

    const ahOffset =
      globalAccess.ui?.getContainer('actionHistory').sidebar.status ===
      SidebarStatus.Revealed
        ? 70
        : 0
    const offset =
      player === store.player
        ? ReadonlyPin.BottomLeft.cloneOffset(
            (device.isMobile ? 200 : 260) + ahOffset,
            device.isMobile ? -170 : -220
          )
        : ReadonlyPin.TopLeft.cloneOffset(
            (device.isMobile ? 200 : 260) + ahOffset,
            device.isMobile ? 170 : 220
          )
    stickerMesh.matrix.setConstraints(
      new Pin(0, 0, device.isMobile ? 230 : 330, device.isMobile ? 230 : 330),
      ReadonlyPin.Center,
      offset
    )

    const container = globalAccess.ui?.getContainer('emoteRing')
    const bubblePivot = new Object2D()
    bubblePivot.add(stickerMesh)
    container?.ready.then(c => c.fadeIn())
    container?.add(bubblePivot)

    const animVal = { value: 0.0001 }
    await simpleTweener
      .to({
        description: 'open bubble',
        target: animVal,
        propertyGoals: { value: 1 },
        duration: 400,
        easing: Easing.Linear,
        onUpdate: () => {
          const easedScale = Easing.Back.Out(animVal.value)
          bubblePivot.matrix.prescale.setScalar(easedScale)
        }
      })
      .finished.then(() => delayPromise(1800))

    animVal.value = 1
    playSound('audioFxCommon', 'BubbleFades')
    await simpleTweener.to({
      description: 'close bubble',
      target: animVal,
      propertyGoals: { value: 0.0001 },
      duration: 300,
      easing: Easing.Linear,
      onUpdate: () => {
        bubblePivot.matrix.prescale.setScalar(animVal.value)
      },
      onComplete: () => {
        removeFromParent(bubblePivot)
      }
    })
  }

  async showEmote(player: Player, emote: Emote) {
    const deckClass = prismsToDeckClass(
      store.state!.state.players[player].prisms
    )
    const hero = DECKCLASS_HEROES[deckClass]

    const lines = // workaround for custom i18n types
      (
        i18n.t as (
          key: string,
          opts: { returnObjects: true }
        ) => string | string[]
      )(`emote.${hero}.${emote}`, {
        returnObjects: true
      })
    const line =
      typeof lines === 'string'
        ? lines
        : lines[store.state!.state.moveCount % lines.length]
    await this.speakFromHero(player, line)
  }
  attemptToDismissEmote(entity: Entity<Components>) {
    if (this._characterSpeechBubbleDismissals.has(entity)) {
      this._characterSpeechBubbleDismissals.get(entity)!()
      this._characterSpeechBubbleDismissals.delete(entity)
    }
  }
  async speakFromEntity(
    entity: Entity<Components>,
    label: string,
    tailDirection: TailDirection = 'right'
  ) {
    if (!this.enabled) {
      return
    }
    this.attemptToDismissEmote(entity)
    // close emote ring, if it's open
    const container = globalAccess.ui?.getContainer('emoteRing')
    container?.ready.then(c => c.fadeIn())
    const bubble = makeInteractiveSpeechBubble({ label }, tailDirection)
    const bubblePivot = new Object2D()
    const masterPivot = new Object2D()

    masterPivot.add(bubblePivot)
    bubblePivot.add(bubble)
    container?.ready.then(c => c.add(masterPivot))

    bubble.matrix.anchor = ReadonlyPin.BottomRight.cloneOffset(-22, 20)
    masterPivot.matrix.setConstraintsPosition(new Pin(0, 0))
    masterPivot.matrix.offset = GamePinCushionComponent.getPin(
      entity,
      __emoteOffset
    )
    masterPivot.matrix.prescale = __masterPrescale
    bubble.shouldRenderAsGroup = true
    const animVal = { value: 0.0001 }
    const animIn = simpleTweener.to({
      description: 'open bubble',
      target: animVal,
      propertyGoals: { value: 1 },
      duration: 1000,
      easing: Easing.Linear,
      onUpdate: () => {
        const easedScale = Easing.Elastic.Out(animVal.value)
        bubblePivot.matrix.prescale.setScalar(easedScale)
      }
    })
    const earlyEmoteDismissal = new Promise<void>(resolve => {
      this._characterSpeechBubbleDismissals.set(entity, resolve)
    })
    await Promise.race([
      animIn.finished.then(() => delayPromise(2000)),
      earlyEmoteDismissal
    ])

    animVal.value = 1
    playSound('audioFxCommon', 'BubbleFades')
    simpleTweener.to({
      description: 'close bubble',
      target: animVal,
      propertyGoals: { value: 0.0001 },
      duration: 500,
      easing: Easing.Linear,
      onUpdate: () => {
        bubblePivot.matrix.prescale.setScalar(animVal.value)
      },
      onComplete: () => {
        removeFromParent(masterPivot)
        GamePinCushionComponent.releasePin(entity, __emoteOffset)
      }
    })
  }

  disable() {
    super.disable()
    this.cancelEmoteRings()
    for (const dismiss of this._characterSpeechBubbleDismissals.values()) {
      dismiss()
    }
    this._characterSpeechBubbleDismissals.clear()
  }
}

const __masterPinOffset = new Vector3(0, 0, -0.01)
