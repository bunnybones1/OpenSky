import { pickBestStartingCards } from '@opensky/bot'
import device from '@opensky/shared/device'
import {
  CardInstance,
  CardSelectionState,
  PlayerAction,
  SkyWeaver
} from '@skyweaver/state-metadata'
import { Entity, EntityManager, System } from 'gg'
import { BackSide, BufferGeometry, Mesh, Object3D, Vector3 } from 'three'

import { toggleCardBase } from '~/assemblages/CardAssemblage'
import { getAssetsManager } from '~/assets'
import { Components } from '~/components'
import BookmarkComponent from '~/components/BookmarkComponent'
import CardInstanceComponent from '~/components/CardInstanceComponent'
import ForegroundInhibitorComponent from '~/components/ForegroundInhibitorComponent'
import FrontFacesVisibleComponent from '~/components/FrontFacesVisibleComponent'
import SelectableComponent from '~/components/SelectableComponent'
import { setHoveredCardAsync } from '~/helpers/cardPopupHelpers'
import {
  buildMeshSpriteEffect,
  buildMeshSpriteStatic
} from '~/helpers/meshAnimationHelpers'
import {
  addEffectToSceneRelativeToCamera,
  cardCastingAdjustments
} from '~/helpers/meshAnimationUtils'
import { playSound } from '~/helpers/soundHelpers'
import { ownedZoneCollections } from '~/helpers/zoneCollections'
import FakeCylinderGlowMeshMaterial from '~/materials/FakeCylinderGlowMeshMaterial'
import ZPaletteMappedMeshMaterial from '~/materials/ZPaletteMappedMeshMaterial'
import { scene } from '~/scenes/arena/scene'
import { UI } from '~/scenes/ui'
import { matchEnded, store } from '~/state'
import ZoneSystem from '~/systems/cardPositioning/ZoneSystem'
import { scrollingCardSelection } from '~/userSettings'
import { animationDelay } from '~/utils/asyncUtils'
import { cameraShaker } from '~/utils/cameraShaker'
import { notEmpty } from '~/utils/jsUtils'
import { ReadonlyTrackableCollection } from '~/utils/TrackableCollection'
import { world } from '~/world'

import { Easing } from '../animation/Easing'
import { simpleTweener } from '../animation/tweeners'

const _selectableCards: ReadonlyTrackableCollection<Entity<Components>> =
  CardInstanceComponent.entities.intersect(
    scrollingCardSelection.value
      ? ownedZoneCollections.Player_CardSelection.union(
          ownedZoneCollections.Player_OptimisticHand
        )
      : ownedZoneCollections.Player_CardSelection
  )

const _bookmarkedCards: ReadonlyTrackableCollection<Entity<Components>> =
  scrollingCardSelection.value
    ? ownedZoneCollections.Player_OptimisticHand.union(
        BookmarkComponent.entities
      )
    : BookmarkComponent.entities

export default class ChooseSystem extends System<Components> {
  private _indicesToCommit: number[]
  private cardSelectionState: CardSelectionState | undefined
  private isPlayerDoneCardSelection: boolean | undefined
  private axelCoinContainer: Object3D | undefined
  private axelCoin: Object3D | undefined
  private axelCoinGlow:
    | Mesh<BufferGeometry, FakeCylinderGlowMeshMaterial>
    | undefined
  private spectralCoins:
    | Mesh<BufferGeometry, ZPaletteMappedMeshMaterial>
    | undefined
  private coinInScene: boolean

  constructor(
    private ui: UI,
    private _takeAction: (action: PlayerAction) => Promise<void>
  ) {
    super()
  }

  init() {
    matchEnded().then(() => {
      this.disable()
    })

    const zones = world.getSystem(ZoneSystem).zones

    const updateBigHand = () => {
      const selectionFull =
        _bookmarkedCards.length === (this.cardSelectionState?.maxChoices ?? 0)

      for (const card of zones.Player_CardSelection.cardsInZone.items) {
        card.toggle(ForegroundInhibitorComponent, selectionFull)
      }
      if (
        zones.Player_CardSelection.cardsInZone.length > 0 &&
        !this.isPlayerDoneCardSelection
      ) {
        zones.Player_OptimisticHand.isEnlarged = selectionFull
          ? 'optimistic_ready'
          : 'optimistic'
      } else {
        zones.Player_OptimisticHand.isEnlarged = 'normal'
      }
    }
    if (scrollingCardSelection.value) {
      _bookmarkedCards.listenForChange(updateBigHand)
      zones.Player_CardSelection.cardsInZone.listenForChange(updateBigHand)
    }
    _bookmarkedCards.listenForChange(_cards => {
      this.updateGui()
    })
    _selectableCards.listenForRemove(this.onSelectableRemoved)
    _selectableCards.listenForAdd(this.onSelectableAdded)

    if (
      store.state?.state.players[store.player!].heroAbilityBase ===
      '25023' /* Axel - Fate's Fortune */
    ) {
      // only get the player with the hero ability to load the coin & MSA assets

      const am = getAssetsManager()
      Promise.all([
        am.loadAsset('axel_coin'),
        am.loadAsset('fakeCylinderGlow')
      ]).then(() => {
        this.axelCoinContainer = new Object3D()
        this.axelCoinGlow = am.fetchMeshDeepClone(
          'fakeCylinderGlow',
          'fake-cylinder-glow',
          true
        ) as Mesh<BufferGeometry, FakeCylinderGlowMeshMaterial>
        this.axelCoinGlow.scale.setScalar(0.018)
        this.axelCoinGlow.rotation.x = -Math.PI * 0.175
        this.axelCoinGlow.translateZ(-0.01)
        this.axelCoin = am.fetchMeshDeepClone('axel_coin', 'coin', true)
        this.axelCoin.scale.setScalar(0.018)
        this.axelCoin.rotation.z = Math.PI
        this.axelCoinContainer.add(this.axelCoin)
        this.axelCoinContainer.add(this.axelCoinGlow)
        am.loadAsset('main_shape')
        am.loadAsset('burst_shine')
        am.loadAsset('sparks')
        am.loadAsset('axel_spectral_coins')
      })
    }
  }
  onSelectableRemoved = (entity: Entity<Components>) => {
    entity.remove('selectable')
    entity.remove('bookmark')

    toggleCardBase(entity, false)
  }
  onSelectableAdded = (entity: Entity<Components>) => {
    if (!this.cardSelectionState) {
      return
    }
    if (!entity.has('frontFacesVisible')) {
      entity.add(new FrontFacesVisibleComponent())
    }
    const isSingleChoice = this.cardSelectionState.maxChoices === 1

    if (
      /* Axel - Fate's Fortune choices */
      (entity.has('cardInstance') &&
        entity.get('cardInstance').base === '25024') ||
      entity.get('cardInstance').base === '25025'
    ) {
      if (entity.has('mesh')) {
        const mesh = entity.get('mesh')
        mesh.visible = false

        animationDelay(950).then(() => {
          mesh.visible = true

          const cardCastLayers = [
            'main_shape_silver_MSA',
            'burst_shine_silver_MSA',
            'sparks_silver_MSA'
          ] as const

          for (const layer of cardCastLayers) {
            buildMeshSpriteEffect(layer, 'main_shape_base').then(effect => {
              if (entity.has('mesh')) {
                const cardMesh = entity.get('mesh')
                cardMesh.add(effect.mesh)
                cardCastingAdjustments(effect, entity)
                effect.mesh.scale.multiplyScalar(1.1)
              }
            })
          }
        })
      }
    }

    if (scrollingCardSelection.value) {
      entity.add(
        new SelectableComponent(entity => {
          if (!entity.has('zone')) {
            return
          }
          const zone = entity.get('zone')
          const isInFakeHand = zone.current.cardStatus === 'OptimisticHand'

          if (!isInFakeHand) {
            playSound('audioFxCommon', 'Click1')
            if (isSingleChoice || this.isPlayerDoneCardSelection) {
              entity.toggleComponent(BookmarkComponent, true)
            } else {
              if (
                _bookmarkedCards.length >=
                (this.cardSelectionState?.maxChoices ?? 0)
              ) {
                _bookmarkedCards.items[0].get('zone').setUserZone('UseState')
              }
              zone.setUserZone('OptimisticHand')
            }
          } else {
            playSound('audioFxCommon', 'Click3')
            zone.setUserZone('UseState')
          }
        })
      )
    } else {
      entity.add(
        new SelectableComponent(entity => {
          const bookmarkIt = !entity.has('bookmark')
          entity.toggleComponent(BookmarkComponent, bookmarkIt)
          if (bookmarkIt) {
            playSound('audioFxCommon', 'Click1')
            if (
              _bookmarkedCards.length >
              (this.cardSelectionState?.maxChoices ?? 0)
            ) {
              _bookmarkedCards.items[0].remove('bookmark')
            }
          } else {
            playSound('audioFxCommon', 'Click3')
          }
        })
      )
    }
    this.updateGui()

    toggleCardBase(entity, true)
  }
  setCardSelectionCards(
    state: CardSelectionState,
    isPlayerDoneCardSelection: boolean
  ) {
    this.cardSelectionState = state
    this.isPlayerDoneCardSelection = isPlayerDoneCardSelection
    for (const e of _selectableCards.items) {
      if (!e.has('selectable')) {
        this.onSelectableAdded(e)
      }
    }

    if (!this.enabled) {
      this.enable()
    }
    world.getSystem(ZoneSystem).zones.Player_CardSelection.flipped = true
    this.updateGui()
  }

  update(manager: EntityManager<Components>, dt: number) {
    if (this.axelCoin && this.axelCoinGlow) {
      this.axelCoin.rotation.x -= dt * 6
      this.axelCoinGlow.material.angle = this.axelCoin.rotation.x + 2
    }
  }
  updateGui() {
    if (!this.enabled) {
      return
    }
    const ui = this.ui.getContainer('cardSelection')

    const correctNumberOfCardsSelected = this.cardSelectionState
      ? _bookmarkedCards.length <= this.cardSelectionState?.maxChoices &&
        _bookmarkedCards.length >= this.cardSelectionState?.minChoices
      : false

    const isSingleChoice = this.cardSelectionState?.maxChoices === 1
    const isFixedNumberOfChoices =
      this.cardSelectionState?.maxChoices ===
      this.cardSelectionState?.minChoices

    if (ui.finishButton) {
      ui.finishButton.disabled = !correctNumberOfCardsSelected
      ui.finishButton.mesh.visible = !isSingleChoice
      ui.finishButton.highlight = !ui.finishButton.disabled
      if (this.isPlayerDoneCardSelection) {
        if (
          /* Axel - Fate's Fortune choices */
          _selectableCards.items.length === 2 &&
          _selectableCards.items[0].has('cardInstance') &&
          _selectableCards.items[1].has('cardInstance') &&
          _selectableCards.items[0].get('cardInstance').base === '25024' &&
          _selectableCards.items[1].get('cardInstance').base === '25025'
        ) {
          if (
            this.axelCoin &&
            this.axelCoinContainer &&
            (!this.coinInScene || this.axelCoinContainer.visible === false)
          ) {
            // Coin //
            this.axelCoinContainer.position.copy(cameraShaker.camera.position)
            const startingPos = new Vector3(0, -0.1, -0.25).applyQuaternion(
              cameraShaker.camera.quaternion
            )
            this.axelCoinContainer.position.add(startingPos)
            const translation = new Vector3(0, 0, -0.25).applyQuaternion(
              cameraShaker.camera.quaternion
            )
            const finalPos = cameraShaker.camera.position
              .clone()
              .add(translation)
            if (!this.coinInScene) {
              scene.add(this.axelCoinContainer)
              this.coinInScene = true
            }
            this.axelCoinContainer.visible = true

            simpleTweener.to({
              description: '',
              target: this.axelCoinContainer.position,
              propertyGoals: { y: finalPos.y, z: finalPos.z },
              duration: 400,
              easing: Easing.Quadratic.Out
            })

            if (this.spectralCoins) {
              this.spectralCoins.visible = true
              simpleTweener.to({
                description: '',
                target: this.spectralCoins.material,
                propertyGoals: { opacity: 1 },
                delay: 850,
                duration: 250
              })
            } else {
              buildMeshSpriteStatic('axel_spectral_coins_MSA').then(effect => {
                const translation = new Vector3(
                  0,
                  device.isMobile ? -0.014 : -0.013,
                  -0.3
                ).applyQuaternion(cameraShaker.camera.quaternion)

                effect.position.copy(cameraShaker.camera.position)
                effect.position.add(translation)
                effect.quaternion.copy(cameraShaker.camera.quaternion)
                effect.rotation.x += Math.PI / 2
                effect.rotation.z += Math.PI
                effect.material.side = BackSide
                effect.scale.multiplyScalar(device.isMobile ? 1 : 0.85)
                scene.add(effect)

                this.spectralCoins = effect

                effect.material.opacity = 0
                simpleTweener.to({
                  description: '',
                  target: effect.material,
                  propertyGoals: { opacity: 1 },
                  delay: 850,
                  duration: 250
                })
              })
            }
          }
        }
        ui.finishText.text = 'Confirm'
        for (const text of [ui.topText, ui.topTextShadow]) {
          text.text = `Choose ${isFixedNumberOfChoices ? '' : 'up to '}${
            this.cardSelectionState?.maxChoices ?? 0
          }`
        }
      }
    }

    for (const entity of _selectableCards.items) {
      if (
        entity.has('interactiveIndicators') &&
        this.isPlayerDoneCardSelection
      ) {
        const indicators = entity.get('interactiveIndicators')
        indicators.suggestionState.value = false
        indicators.playableState.value = true
        indicators.bookmarkState.value = false
      }
    }

    //card selection phase
    if (!this.isPlayerDoneCardSelection) {
      this._updateSuggestions()
    }
    if (isSingleChoice && _bookmarkedCards.length === 1) {
      this.commit()
    }

    world.getSystem(ZoneSystem).zones.Player_CardSelection.flipped = true
  }
  enable() {
    super.enable()
    const darkenCoverContainer = this.ui!.getContainer(
      'cardSelectionDarkOverlay'
    )
    darkenCoverContainer.ready.then(() => {
      darkenCoverContainer.fadeIn(500)
    })
    const endTurnButton = this.ui.getContainer('endTurnButton')
    endTurnButton.visible = false

    const hudContainer = this.ui!.getContainer('hud')
    hudContainer.ready.then(() => {
      hudContainer.remove(hudContainer.buttonActionHistory.mesh)
      hudContainer.add(hudContainer.buttonDeckViewer.mesh)
    })
    const graveContainer = this.ui!.getContainer('deckSidebars')
    graveContainer.playerGraveyardSidebar.closeAndLock()

    const container = this.ui.getContainer('cardSelection')
    container.ready
      .then(async () => {
        await container.fadeIn()
      })
      .then(() => {
        setHoveredCardAsync(undefined)
        this.updateGui()
      })
  }
  disable() {
    super.disable()
    const endTurnButton = this.ui.getContainer('endTurnButton')
    endTurnButton.visible = true
    const darkenCoverContainer = this.ui!.getContainer(
      'cardSelectionDarkOverlay'
    )
    darkenCoverContainer.ready.then(() => {
      darkenCoverContainer.fadeOut(500)
    })

    const graveContainer = this.ui!.getContainer('deckSidebars')
    graveContainer.playerGraveyardSidebar.unlock()
    const hudContainer = this.ui!.getContainer('hud')
    hudContainer.ready.then(() => {
      hudContainer.add(hudContainer.buttonActionHistory.mesh)
      hudContainer.remove(hudContainer.buttonDeckViewer.mesh)
    })

    this.cleanupVisuals()
  }
  cleanupVisuals() {
    const ui = this.ui.getContainer('cardSelection')
    if (this.axelCoinContainer && this.coinInScene) {
      buildMeshSpriteEffect('axel_outro_flame_MSA').then(effect => {
        const translation = new Vector3(0, -0.005, -0.08).applyQuaternion(
          cameraShaker.camera.quaternion
        )
        effect.mesh.scale.multiplyScalar(0.25)
        addEffectToSceneRelativeToCamera(effect, translation)
      })
      animationDelay(300).then(() => {
        if (this.axelCoinContainer) {
          this.axelCoinContainer.visible = false
          this.coinInScene = false
        }
      })
    }
    if (this.spectralCoins) {
      simpleTweener.to({
        description: 'spectral coins fade out',
        target: this.spectralCoins.material,
        propertyGoals: {
          opacity: 0
        },
        duration: 500,
        onComplete: () => {
          this.spectralCoins!.visible = false
        }
      })
    }
    for (const e of [..._bookmarkedCards.items, ..._selectableCards.items]) {
      if (e.has('interactiveIndicators')) {
        const indicators = e.get('interactiveIndicators')
        indicators.suggestionState.value = false
        indicators.playableState.value = false
        indicators.bookmarkState.value = false
      }
    }
    ui.fadeOut()
  }

  async commit() {
    // Make sure to spread this into a new array,
    // because cleanupVisuals will modify indiciesToCommit.
    this._updateSuggestions()
    if (!store.secret) {
      console.error("No store in store.secret, can't commit suggestions.")
      return
    }
    // const orderedEntities = store.secret.cardSelection
    //   .map(
    //     id =>
    //       _selectableCards.items.find(
    //         card => card.get('cardInstance').id === id
    //       )!
    //   )
    //   .filter(notEmpty)

    // const indicesToCommit = [..._bookmarkedCards.items]
    //   .map(e => orderedEntities.indexOf(e))
    //   .concat(...this._indicesToCommit)
    const indicesToCommit = [...this._indicesToCommit]
    console.log(
      'COMMIT: ',
      _bookmarkedCards.items,
      // indicesToCommit,
      this._indicesToCommit
    )

    if (!scrollingCardSelection.value || this.isPlayerDoneCardSelection) {
      await animationDelay(500)
      world.getSystem(ZoneSystem).zones.Player_OptimisticHand.isEnlarged =
        'normal'
    }

    const ui = this.ui.getContainer('cardSelection')
    if (ui.active) {
      ui.fadeOut()
      this.disable()
    }
    // if (indicesToCommit.length < this.cardSelectionState!.minChoices) {
    //   for (let i = 0; i < this.cardSelectionState!.minChoices; i++) {
    //     indicesToCommit.push(i)
    //   }
    // }

    await this._takeAction({
      type: 'CommitCardSelection',
      cardIndices: indicesToCommit
    })
  }

  private _updateSuggestions() {
    if (!this.cardSelectionState) {
      console.error("No card selection state, can't update suggestions.")
      return
    }
    if (!store.secret) {
      console.error("No store in store.secret, can't commit suggestions.")
      return
    }

    const orderedEntities = store.secret.cardSelection
      .map(
        id =>
          _selectableCards.items.find(
            card => card.get('cardInstance').id === id
          )!
      )
      .filter(notEmpty)
    const views = orderedEntities
      .map(c => c.get('cardInstance'))
      .filter(function (c): c is CardInstance<SkyWeaver> {
        return typeof c === 'object'
      })

    if (views.length !== _selectableCards.length) {
      console.error(
        "Not all cards in _selectableCards have items in cardCache, can't update suggestions"
      )
      return
    }

    const bookmarkedCards = new Set(
      _bookmarkedCards.items
        .map(e => orderedEntities.indexOf(e))
        .filter(i => i >= 0)
    )

    if (bookmarkedCards.size !== _bookmarkedCards.length) {
      console.error(
        "Not all cards in _bookmarkedCards have items in cardCache, can't update suggestions"
      )
      return
    }

    const bestCards = pickBestStartingCards(
      this.cardSelectionState?.minChoices ?? 0,
      views,
      bookmarkedCards
    )
    this._indicesToCommit = bestCards ? bestCards.cardIndices : []

    for (let i = 0; i < orderedEntities.length; i++) {
      const entity = orderedEntities[i]
      if (!entity.has('interactiveIndicators')) {
        return
      }
      const indicators = entity.get('interactiveIndicators')
      const isBookmarked = _bookmarkedCards.items.includes(entity)
      indicators.suggestionState.value =
        this._indicesToCommit.includes(i) &&
        (!scrollingCardSelection.value || !isBookmarked)
      indicators.bookmarkState.value = isBookmarked
    }
  }

  resetChooseState() {
    this.cardSelectionState = undefined
    this.cleanupVisuals()
  }
}
