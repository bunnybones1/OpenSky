import { CardLibrary } from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import { DoubleSide, Matrix4, Mesh, Object3D, Scene, Vector4 } from 'three'
import { lerp } from 'three/src/math/MathUtils'

import { getAssetsManager } from '~/assets'
import { COLOR_BLACK } from '~/colors/colorLibrary'
import { Components } from '~/components'
import FakeHasAttachmentComponent from '~/components/FakeHasAttachmentComponent'
import FrontFacesVisibleComponent from '~/components/FrontFacesVisibleComponent'
import InspectableComponent from '~/components/InspectableComponent'
import SelectableComponent from '~/components/SelectableComponent'
import { hijackCardText } from '~/helpers/cardTextHijacker'
import { tryAttachBakedAttachedSpell } from '~/helpers/fakeAttachedSpellHelper'
import InputBoundVerticalScroll from '~/helpers/InputBoundVerticalScroll'
import { WorldPointObject3D } from '~/helpers/WorldPointObject3D'
import BasicColorMeshMaterial from '~/materials/BasicColorMeshMaterial'
import BasicMapMeshMaterial from '~/materials/BasicMapMeshMaterial'
import QuadraticRibbonMesh from '~/meshes/QuadraticRibbonMesh'
import { Easing } from '~/systems/animation/Easing'
import {
  animateTransformToTarget,
  TargetTransform
} from '~/systems/animation/transform'
import { simpleTweener } from '~/systems/animation/tweeners'
import { autoManageFrontFacingVisibility } from '~/systems/cardPositioning/ecsUtils'
import UpdateManager from '~/systems/UpdateManager'
import { AnimatedBool } from '~/utils/AnimatedBool'
import { cameraShaker } from '~/utils/cameraShaker'
import { getFakeCardTagView } from '~/utils/card'
import { getSharedPlaneBufferGeometry } from '~/utils/geometry'
import SafeListeners from '~/utils/helpers/SafeListeners'
import { getTempTexture } from '~/utils/tempTexture'
import {
  cloneTransform,
  copyTransform,
  distanceBetweenTransforms
} from '~/utils/transformUtils'

import { createCardFromCardView } from '../../helpers/cardHelpers'
import { world } from '../../world'
import DelearPhaseMarker from './DealerPhaseMarker'
import { DealerStepName } from './dealerStepTypes'
import DraftDealerChair from './DraftDealerChair'
import { isFirstPlayer } from './draftDealerSteps/utils'
import { draftSettings } from './draftSettings'
import DraftState, {
  DraftStateBoon,
  DraftStateCard,
  DraftStateCardPack,
  DraftStateDebt,
  DraftStateEvent,
  DraftStatePlayer
} from './DraftState'
import { isDistanceInCurrentSlot } from './eventRandomizerUtils'
import { EventStateLifeAuctionDealer } from './EventStateLifeAuction'
import { EventStateRandomizerDealer } from './EventStateRandomizer'
import { ForceDirectedGraph } from './ForceDirectedGraph'
import { getDraftCardSorters } from './getDraftCardSorters'
import { wrapMatrixUpdateWithScroller } from './wrapMatrixUpdateWithScroller'
// import EventStateLifeAuction from './EventStateLifeAuction'
const COLOR_START = new Vector4(2, 2, 1, 1)
const COLOR_END = new Vector4(4, 4, 2, 1)

export default function draftMockupInternalsVisuals(
  scene: Scene,
  state: DraftState,
  dealerChair: DraftDealerChair
) {
  const safe = new SafeListeners()
  const helper = new Object3D()

  const placedAtleastOnce = new Set<TargetTransform>()
  function attemptMove(
    target: TargetTransform,
    to: TargetTransform,
    overrideDuration?: number
  ) {
    if (!placedAtleastOnce.has(target)) {
      copyTransform(target, to)
      placedAtleastOnce.add(target)
    } else {
      const duration =
        overrideDuration === undefined
          ? 100 + distanceBetweenTransforms(target, to) * 3000
          : overrideDuration
      animateTransformToTarget(
        target,
        cloneTransform(to),
        duration,
        Easing.Custom.SnappyButSmooth
      )
    }
  }
  scene.add(helper)
  const entities: Array<Entity<Components>> = []
  const cardEntitiesByDraftCards = new Map<DraftStateCard, Entity<Components>>()
  const visualAnchorsByPlayer = new Map<DraftStatePlayer, Object3D>()
  const packMeshesByPacks = new Map<DraftStateCardPack, Object3D>()
  const avatarMeshesByAvatars = new Map<DraftStateCard, Object3D>()
  safe.listenForAdd(FrontFacesVisibleComponent.entities, e => {
    const tc = e.get('transform')
    const mc = e.get('mesh')
    tryAttachBakedAttachedSpell(e.get('cardInstance'), 'fake', tc, mc, 0)
  })

  function ensureVisualsForCard(card: DraftStateCard) {
    if (!cardEntitiesByDraftCards.has(card)) {
      const cardView = getFakeCardTagView(
        card.base,
        card.rarity,
        undefined,
        true
      )
      if (
        card instanceof DraftStateEvent ||
        card instanceof DraftStateBoon ||
        card instanceof DraftStateDebt
      ) {
        hijackCardText(cardView, card.name, card.description)
      }
      const e = createCardFromCardView(cardView, card.type)!
      if (e.get('cardInstance').attachment) {
        e.toggle(FakeHasAttachmentComponent, true)
      }
      if (e.has('zone')) {
        e.get('zone').setUserZone('Drafting')
      }
      // e.add(new FrontFacesVisibleComponent())
      e.add(new InspectableComponent())
      cardEntitiesByDraftCards.set(card, e)
      entities.push(e)
    }
    return cardEntitiesByDraftCards.get(card)!
  }

  function rejectVisualsForCard(card: DraftStateCard) {
    if (cardEntitiesByDraftCards.has(card)) {
      const e = cardEntitiesByDraftCards.get(card)!
      world.removeEntity(e.id)
      cardEntitiesByDraftCards.delete(card)
    }
  }

  const packMeshes: Object3D[] = []
  const playerMeshes: Object3D[] = []
  const avatarMeshes: Object3D[] = []

  function ensureVisualsForPack(pack: DraftStateCardPack) {
    if (!packMeshesByPacks.has(pack)) {
      const packMesh = new Object3D()
      packMesh.rotateX(Math.PI * 0.5)
      packMeshes.push(packMesh)
      scene.add(packMesh)
      packMeshesByPacks.set(pack, packMesh)
    }
    return packMeshesByPacks.get(pack)!
  }

  function ensureVisualAnchorForPlayer(player: DraftStatePlayer) {
    if (!visualAnchorsByPlayer.has(player)) {
      const playerAnchor = new Object3D()
      playerAnchor.rotateX(Math.PI * 0.5)
      playerMeshes.push(playerAnchor)
      scene.add(playerAnchor)
      visualAnchorsByPlayer.set(player, playerAnchor)
    }
    return visualAnchorsByPlayer.get(player)!
  }

  function ensureVisualsForAvatar(avatar: DraftStateCard) {
    if (!avatarMeshesByAvatars.has(avatar)) {
      const mat = new BasicMapMeshMaterial(
        { map: getTempTexture() },
        {
          side: DoubleSide,
          transparent: false,
          depthWrite: true,
          alphaTest: 0.5
        }
      )
      const avatarMesh = new Mesh(getSharedPlaneBufferGeometry(), mat)
      const cardMeta = CardLibrary.get(avatar.base)!
      getAssetsManager()
        .load('texture', `game/cards/art-full/units/${cardMeta.artSlug}.png`)
        .then(texture => {
          mat.texture = texture
        })
      avatarMeshes.push(avatarMesh)
      scene.add(avatarMesh)
      avatarMeshesByAvatars.set(avatar, avatarMesh)
    }
    return avatarMeshesByAvatars.get(avatar)!
  }

  function rearrangeAvatarToAnchor(player: DraftStatePlayer) {
    const playerAnchor = ensureVisualAnchorForPlayer(player)
    if (player.avatar) {
      const avatarMesh = ensureVisualsForAvatar(player.avatar)
      copyTransform(helper, playerAnchor)
      helper.rotateX(Math.PI * 0.5)
      helper.translateY(0.05)
      // helper.translateX(-0.085)
      helper.translateZ(-0.15)
      helper.scale.set(0.2, 0.35, 0.1)
      if (isFirstPlayer(state, player)) {
        helper.rotateX(Math.PI * -0.125)
        helper.translateX(-0.15)
        helper.translateZ(0.1)
        helper.translateY(-0.15)
        helper.scale.multiplyScalar(0.7)
      }
      attemptMove(avatarMesh, helper)
    }
  }

  function rearrangePackCardsToPack(
    pack: DraftStateCardPack,
    direction: 1 | -1 = 1,
    durationOverride?: number
  ) {
    const packMesh = ensureVisualsForPack(pack)
    for (let i = 0; i < pack.length; i++) {
      const card = pack.items[i]
      const e = ensureVisualsForCard(card)
      copyTransform(helper, packMesh)
      helper.rotateX(Math.PI * -0.5)
      helper.translateY(0.0015 * i * direction)
      const tc = e.get('transform')
      // e.toggleComponent(FrontFacesVisibleComponent, true)
      attemptMove(tc, helper, durationOverride)
    }
  }

  function rearrangePackCardsToPackFanOut(pack: DraftStateCardPack) {
    const packMesh = ensureVisualsForPack(pack)
    for (let i = 0; i < pack.length; i++) {
      const card = pack.items[i]
      const e = ensureVisualsForCard(card)
      copyTransform(helper, packMesh)
      helper.rotateX(Math.PI * -0.5)
      if (pack.length > 4) {
        helper.translateX((i - (pack.length - 1) * 0.5) * 0.028)
        helper.translateZ(((i % 2) - 0.5) * 0.075)
      } else {
        helper.translateX((i - (pack.length - 1) * 0.5) * 0.056)
      }
      const tc = e.get('transform')
      attemptMove(tc, helper)
    }
  }

  const sorters = getDraftCardSorters()
  function rearrangePackCardsToScrollingView(
    pack: DraftStateCardPack,
    player: DraftStatePlayer
  ) {
    const packMesh = ensureVisualsForPack(pack)
    const sortPrimary = sorters[player.lookingAtDeckSortBy]
    const sortSecondary = sorters[player.lookingAtDeckSortBySecondary]
    const cards = pack.items.slice()
    cards.sort((a, b) => sortPrimary(a, b) + sortSecondary(a, b) * 0.01)
    if (player.lookingAtDeckReverse) {
      cards.reverse()
    }
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]
      const e = ensureVisualsForCard(card)
      copyTransform(helper, packMesh)
      helper.rotateX(Math.PI * -0.5)
      if (pack.length > 4) {
        const col = i % 4
        const row = Math.floor(i / 4)
        helper.translateX((col - 3 * 0.5 + (row % 2) * 0.5 - 0.25) * 0.056)
        helper.translateZ(row * 0.075 - 0.1)
      } else {
        helper.translateX((i - (pack.length - 1) * 0.5) * 0.056)
      }
      const tc = e.get('transform')
      attemptMove(tc, helper, 200)
    }
  }

  function onCardPackAdded(pack: DraftStateCardPack) {
    for (let i = 0; i < state.cardPacks.length; i++) {
      const ratio = (i + 0.5) / state.cardPacks.length
      const pack2 = state.cardPacks.items[i]
      const packMesh = ensureVisualsForPack(pack2)
      const angle = lerp(0, Math.PI, lerp(-0.3, 1.3, ratio))
      const distance = 0.17
      packMesh.position.z = Math.sin(angle) * distance
      packMesh.position.x = Math.cos(angle) * distance
      packMesh.rotation.x = Math.PI * -0.5
      packMesh.rotation.z = -angle + Math.PI * 0.5
      rearrangePackCardsToPack(pack2)
    }
    const cb = () => rearrangePackCardsToPack(pack)
    safe.listenForRemove(pack, cb)
    safe.listenForAdd(pack, cb)
  }

  function onAvatarPackAdded(pack: DraftStateCardPack) {
    for (let i = 0; i < state.avatarPacks.length; i++) {
      const ratio = (i + 0.5) / state.avatarPacks.length
      const pack2 = state.avatarPacks.items[i]
      const packMesh = ensureVisualsForPack(pack2)
      const angle = lerp(0, Math.PI, lerp(0.1, 0.9, ratio))
      const distance = 0.1
      packMesh.position.z = Math.sin(angle) * distance
      packMesh.position.x = Math.cos(angle) * distance
      packMesh.rotation.x = Math.PI * -0.5
      packMesh.rotation.z = -angle + Math.PI * -0.5
      rearrangePackCardsToPack(pack2)
    }
    function onPackCardsChanged() {
      rearrangePackCardsToPack(pack)
    }
    safe.listenForRemove(pack, onPackCardsChanged)
    safe.listenForAdd(pack, onPackCardsChanged)
  }

  function onEventPackAdded(pack: DraftStateCardPack) {
    for (let i = 0; i < state.eventPacks.length; i++) {
      const ratio = (i + 0.5) / state.eventPacks.length
      const pack2 = state.eventPacks.items[i]
      const packMesh = ensureVisualsForPack(pack2)
      const angle = lerp(0, -Math.PI, lerp(0.1, 0.9, ratio))
      const distance = 0.1
      packMesh.position.z = Math.sin(angle) * distance
      packMesh.position.x = Math.cos(angle) * distance
      packMesh.rotation.x = Math.PI * 0.5
      packMesh.rotation.z = angle + Math.PI * 0.5
      rearrangePackCardsToPack(pack2)
    }
    function onPackEventsChanged() {
      rearrangePackCardsToPack(pack)
      for (const card of pack.items) {
        const e = ensureVisualsForCard(card)
        e.toggle(FrontFacesVisibleComponent, true)
      }
    }
    safe.listenForRemove(pack, onPackEventsChanged)
    safe.listenForAdd(pack, onPackEventsChanged)
  }

  let dimmer: Mesh | undefined

  function getDeckInspectionDimmer(pack: DraftStateCardPack | undefined) {
    if (!dimmer) {
      dimmer = new Mesh(
        getSharedPlaneBufferGeometry(),
        new BasicColorMeshMaterial({
          color: COLOR_BLACK,
          opacity: 0.6,
          transparent: true,
          depthWrite: false
        })
      )
      dimmer.renderOrder = -11
      scene.add(dimmer)
    }
    if (pack) {
      const deckMesh = ensureVisualsForPack(pack)
      copyTransform(dimmer, deckMesh)
      dimmer.rotateX(Math.PI)
      dimmer.translateZ(-0.02)
    }
    return dimmer
  }
  function onPlayerAdded(player: DraftStatePlayer) {
    const deck = player.deck
    const boons = player.boons

    function onDeckCardsChanged() {
      if (player.lookingAt !== 'deck') {
        const deckMesh = ensureVisualsForPack(deck)
        copyTransform(deckMesh, ensureVisualAnchorForPlayer(player))
        rearrangePackCardsToPack(deck, undefined, 200)
        for (const c of deck.items) {
          const e = ensureVisualsForCard(c)
          const topOfDeck = deck.items.indexOf(c) === deck.items.length - 1
          if (topOfDeck && isFirstPlayer(state, player)) {
            if (!e.has('selectable')) {
              e.add(
                new SelectableComponent(() => {
                  player.lookingAt = 'deck'
                  e.remove('selectable')
                })
              )
            }
          } else {
            if (e.has('selectable')) {
              e.remove('selectable')
            }
          }
          autoManageFrontFacingVisibility(
            e,
            topOfDeck,
            500,
            () => deck.items.indexOf(c) !== deck.items.length - 1
          )
        }
      } else {
        const deckMesh = ensureVisualsForPack(deck)
        copyTransform(deckMesh, ensureVisualAnchorForPlayer(player))
        deckMesh.position.set(-0.9, 0.15, 0.3)
        deckMesh.rotation.x = Math.PI * 0.83
        rearrangePackCardsToScrollingView(deck, player)
        for (const card of deck.items) {
          const e = ensureVisualsForCard(card)
          e.toggle(FrontFacesVisibleComponent, true)
        }
      }
    }
    function onDeckSortChange() {
      rearrangePackCardsToScrollingView(deck, player)
    }
    safe.listenToProperty(player, 'lookingAtDeckSortBy', onDeckSortChange)
    safe.listenToProperty(player, 'lookingAtDeckReverse', onDeckSortChange)
    for (let i = 0; i < state.players.length; i++) {
      const ratio = i === 0 ? 0.5 : (i - 1 + 0.5) / (state.players.length - 1)
      const aPlayer = state.players.items[i]
      const playerAnchor = ensureVisualAnchorForPlayer(aPlayer)
      const angle =
        i === 0 ? lerp(0, Math.PI, 0.5) : lerp(0, -Math.PI, lerp(0, 1, ratio))
      const distance = 0.27
      playerAnchor.position.z = Math.sin(angle) * distance
      playerAnchor.position.x = Math.cos(angle) * distance
      playerAnchor.rotation.z = angle + Math.PI * -0.5
      rearrangeAvatarToAnchor(player)
      onDeckCardsChanged()
      onBoonCardsChanged()
    }

    function onAvatarAssignment(avatar?: DraftStateCard) {
      if (!avatar) {
        return
      }
      rearrangeAvatarToAnchor(player)
    }
    safe.listenToProperty(player, 'avatar', onAvatarAssignment)

    safe.listenForRemove(deck, onDeckCardsChanged)
    safe.listenToProperty(
      player,
      'lookingAt',
      (newLookTarget, oldLookTarget) => {
        if (newLookTarget === 'deck' || oldLookTarget === 'deck') {
          onDeckCardsChanged()
        }
        if (newLookTarget === 'boons' || oldLookTarget === 'boons') {
          onBoonCardsChanged()
        }
      }
    )

    if (isFirstPlayer(state, player)) {
      const originalCameraTransform = cloneTransform(cameraShaker.camera)
      safe.addCleanup(() => {
        copyTransform(cameraShaker.camera, originalCameraTransform)
      })
      safe.listenToProperty(player, 'lookingAt', newLookTarget => {
        if (newLookTarget === 'deck') {
          copyTransform(helper, originalCameraTransform)
          helper.position.x -= 0.9
          // helper.rotation.set(-0.4, 0.2, 0)
          // helper.scale.set(1, 1, 1)
          attemptMove(cameraShaker.camera, helper, 200)
        } else {
          attemptMove(cameraShaker.camera, originalCameraTransform, 200)
        }
        // cameraShaker.camera.position.x = -0.3
        // cameraShaker.camera.rotation.y = Math.PI * -0.05
        // cameraShaker.camera.rotation.z = Math.PI * -0.05
        getDeckInspectionDimmer(
          newLookTarget === 'deck'
            ? deck
            : newLookTarget === 'boons'
            ? boons
            : undefined
        ).visible = newLookTarget !== 'none'
      })
      const scrollMat4 = new Matrix4()
      const scroller = new InputBoundVerticalScroll(safe)
      function updateScrollingMatrix() {
        scrollMat4.makeTranslation(
          0,
          0,
          lookingTransition.animatedValue *
            (scroller.scrollY.innerPos * 0.00027 + 0.05)
        )
      }
      function onScrollableDeckCardsChanged() {
        scroller.scrollY.innerSize = Math.max(
          750,
          Math.ceil(deck.length / 4) * 300
        )
      }
      safe.listenForAdd(deck, onScrollableDeckCardsChanged)
      safe.listenForRemove(deck, onScrollableDeckCardsChanged)
      const lookingTransition = new AnimatedBool(
        updateScrollingMatrix,
        false,
        1000,
        Easing.Custom.SnappyButSmooth
      )
      safe.listenToProperty(
        player,
        'lookingAt',
        newLookTarget => (lookingTransition.value = newLookTarget === 'deck')
      )
      const scrollUpdater = {
        update() {
          updateScrollingMatrix()
        }
      }
      safe.onRafUpdate(scrollUpdater)
      function onScrollableCardAddedToDeck(c: DraftStateCard) {
        const e = ensureVisualsForCard(c)
        wrapMatrixUpdateWithScroller(e.get('transform'), scrollMat4)
      }
      safe.listenForAdd(deck, onScrollableCardAddedToDeck)
    }

    function onCardAddedToDeck(c: DraftStateCard) {
      const e = ensureVisualsForCard(c)
      if (e.has('interactiveIndicators')) {
        e.get('interactiveIndicators').playableState.value = false
        if (e.has('selectable')) {
          e.remove('selectable')
        }
      }
      onDeckCardsChanged()
    }
    safe.listenForAdd(deck, onCardAddedToDeck)

    function onBoonCardsChanged() {
      if (player.lookingAt !== 'boons') {
        const boonsMesh = ensureVisualsForPack(boons)
        copyTransform(boonsMesh, ensureVisualAnchorForPlayer(player))
        boonsMesh.translateX(-0.05)
        rearrangePackCardsToPack(boons)
        for (const c of boons.items) {
          const e = ensureVisualsForCard(c)
          const topOfBoons = boons.items.indexOf(c) === boons.items.length - 1
          if (topOfBoons && isFirstPlayer(state, player)) {
            if (!e.has('selectable')) {
              e.add(
                new SelectableComponent(() => {
                  player.lookingAt = 'boons'
                  e.remove('selectable')
                })
              )
            }
          } else {
            if (e.has('selectable')) {
              e.remove('selectable')
            }
          }
          autoManageFrontFacingVisibility(
            e,
            topOfBoons,
            500,
            () => boons.items.indexOf(c) !== boons.items.length - 1
          )
        }
      } else {
        const boonsMesh = ensureVisualsForPack(boons)
        copyTransform(boonsMesh, ensureVisualAnchorForPlayer(player))
        boonsMesh.position.set(0, 0.15, 0.3)
        boonsMesh.rotation.x = Math.PI * 0.83
        rearrangePackCardsToPackFanOut(boons)
        for (const card of boons.items) {
          const e = ensureVisualsForCard(card)
          e.toggle(FrontFacesVisibleComponent, true)
        }
      }
    }
    safe.listenForRemove(boons, onBoonCardsChanged)
    function onCardAddedToBoons(c: DraftStateCard) {
      const e = ensureVisualsForCard(c)
      if (e.has('interactiveIndicators')) {
        const indicators = e.get('interactiveIndicators')
        indicators.playableState.value = false
        indicators.bookmarkState.value = false
        indicators.healingPredictionState.value = false
        if (e.has('selectable')) {
          e.remove('selectable')
        }
      }
      onBoonCardsChanged()
    }
    safe.listenForAdd(boons, onCardAddedToBoons)

    function onPlayerQueuedPacksChanged() {
      const playerAnchor = ensureVisualAnchorForPlayer(player)
      for (let i = 0; i < player.packQueue.length; i++) {
        const pack = player.packQueue.items[i]
        const packMesh = ensureVisualsForPack(pack)
        copyTransform(helper, playerAnchor)
        helper.rotateX(Math.PI)
        helper.translateX(0.085 + 0.055 * i)
        copyTransform(packMesh, helper)
        rearrangePackCardsToPack(pack)
      }
    }
    safe.listenForAdd(player.packQueue, onPlayerQueuedPacksChanged)
    safe.listenForRemove(player.packQueue, onPlayerQueuedPacksChanged)
    function onPlayerCurrentPackChanged(
      currentPack?: DraftStateCardPack,
      oldPack?: DraftStateCardPack
    ) {
      if (isFirstPlayer(state, player)) {
        if (oldPack) {
          for (const c of oldPack.items) {
            const e = ensureVisualsForCard(c)
            e.toggleComponent(FrontFacesVisibleComponent, false)
            if (e.has('interactiveIndicators')) {
              e.get('interactiveIndicators').playableState.value = false
            }
            if (e.has('selectable')) {
              e.remove('selectable')
            }
          }
        }
      }
      if (!currentPack) {
        return
      }
      const currentPackMesh = ensureVisualsForPack(currentPack)
      const playerAnchor = ensureVisualAnchorForPlayer(player)
      copyTransform(helper, playerAnchor)
      helper.rotateX(Math.PI * 0.35)
      helper.position.y += 0.15
      copyTransform(currentPackMesh, helper)
      rearrangePackCardsToPackFanOut(currentPack)
      if (isFirstPlayer(state, player)) {
        for (const c of currentPack.items) {
          const e = ensureVisualsForCard(c)
          e.toggleComponent(FrontFacesVisibleComponent, true)
          if (e.has('interactiveIndicators')) {
            e.get('interactiveIndicators').playableState.value =
              !player.choiceCommited
            e.get('interactiveIndicators').bookmarkState.value =
              player.currentCardChoice === c
          }
          e.add(
            new SelectableComponent(() => {
              if (player.currentCardChoice !== c && !player.choiceCommited) {
                player.currentCardChoice = c
              } else {
                player.choiceCommited = true
              }
              for (const c2 of currentPack.items) {
                const e2 = ensureVisualsForCard(c2)
                e2.get('interactiveIndicators').playableState.value =
                  !player.choiceCommited
              }
            })
          )
        }
      }
    }
    safe.listenToProperty(player, 'currentCardPack', onPlayerCurrentPackChanged)
    if (isFirstPlayer(state, player)) {
      function onPlayerCurrentCardChoiceChanged(
        currentCard?: DraftStateCard,
        oldCard?: DraftStateCard
      ) {
        if (oldCard) {
          const e = ensureVisualsForCard(oldCard)
          if (e.has('interactiveIndicators')) {
            e.get('interactiveIndicators').bookmarkState.value = false
          }
        }
        if (currentCard) {
          const e = ensureVisualsForCard(currentCard)
          if (e.has('interactiveIndicators')) {
            e.get('interactiveIndicators').bookmarkState.value = true
          }
        }
      }
      safe.listenToProperty(
        player,
        'currentCardChoice',
        onPlayerCurrentCardChoiceChanged
      )
    }
  }

  safe.listenForAdd(state.players, onPlayerAdded)

  function onCardCubeChanged() {
    const cardCube = ensureVisualsForPack(state.cardCube)
    cardCube.position.x = -0.065
    cardCube.rotation.z = 0
    cardCube.rotation.x = Math.PI * -0.5
    rearrangePackCardsToPack(state.cardCube, -1)
  }

  safe.listenForAdd(state.cardCube, onCardCubeChanged)
  safe.listenForRemove(state.cardCube, onCardCubeChanged)

  function onEventsQueueChanged() {
    const eventsQueue = ensureVisualsForPack(state.eventsQueue)
    eventsQueue.position.z = -0.05
    eventsQueue.rotation.z = 0
    eventsQueue.rotation.x = Math.PI * 0.5
    for (let i = 0; i < state.eventsQueue.items.length; i++) {
      const e = ensureVisualsForCard(state.eventsQueue.items[i])
      e.toggle(FrontFacesVisibleComponent, true)
    }
    rearrangePackCardsToPack(state.eventsQueue)
  }

  safe.listenForAdd(state.eventsQueue, onEventsQueueChanged)
  safe.listenForRemove(state.eventsQueue, onEventsQueueChanged)

  function onAvatarCubeChanged() {
    const avatarCube = ensureVisualsForPack(state.avatarCube)
    avatarCube.position.x = 0.065
    avatarCube.rotation.z = 0
    for (const avatar of state.avatarCube.items) {
      const e = ensureVisualsForCard(avatar)
      e.toggle(FrontFacesVisibleComponent, true)
    }
    rearrangePackCardsToPack(state.avatarCube)
  }

  safe.listenForAdd(state.avatarCube, onAvatarCubeChanged)
  safe.listenForRemove(state.avatarCube, onAvatarCubeChanged)

  function onEventCubeChanged() {
    const eventCube = ensureVisualsForPack(state.eventCube)
    eventCube.position.z = 0.065
    eventCube.rotation.z = 0
    eventCube.rotation.x = Math.PI * 0.5
    for (let i = 0; i < state.eventCube.items.length; i++) {
      const e = ensureVisualsForCard(state.eventCube.items[i])
      e.toggle(FrontFacesVisibleComponent, true)
    }
    rearrangePackCardsToPack(state.eventCube)
  }

  safe.listenForAdd(state.eventCube, onEventCubeChanged)
  safe.listenForRemove(state.eventCube, onEventCubeChanged)

  safe.listenForAdd(state.cardPacks, onCardPackAdded)
  safe.listenForAdd(state.avatarPacks, onAvatarPackAdded)
  safe.listenForAdd(state.eventPacks, onEventPackAdded)

  function onCardTrashed(card: DraftStateCard) {
    rejectVisualsForCard(card)
  }
  safe.listenForAdd(state.trashCards, onCardTrashed)

  safe.listenToProperty(
    state,
    'currentEvent',
    function onCurrentEventChanged(newEvent, oldEvent) {
      if (oldEvent) {
        rejectVisualsForCard(oldEvent)
      }
      if (newEvent) {
        const e = ensureVisualsForCard(newEvent)
        const tc = e.get('transform')
        e.toggleComponent(FrontFacesVisibleComponent, true)
        copyTransform(helper, tc)
        helper.position.set(-0.05, 0.235, 0.23)
        helper.rotation.x = Math.PI * 0.35
        helper.scale.setScalar(1.2)
        attemptMove(tc, helper)
      }
      //
    }
  )

  let wheel: Object3D | undefined
  safe.listenToProperty(
    state,
    'dealerEventState',
    function onDealerEventStateChanged(
      newDealerEventState,
      oldDealerEventState
    ) {
      if (newDealerEventState instanceof EventStateLifeAuctionDealer) {
        const newDealerEventStateLifeAuction = newDealerEventState
        const packMesh = ensureVisualsForPack(
          newDealerEventStateLifeAuction.boons
        )
        helper.position.set(0, 0.16, 0.26)
        helper.rotation.x = Math.PI * 0.825
        copyTransform(packMesh, helper)
        safe.listenForAdd(
          newDealerEventStateLifeAuction.boons,
          function onBoonAdded(boon) {
            rearrangePackCardsToPackFanOut(newDealerEventStateLifeAuction.boons)
            const eBoon = ensureVisualsForCard(boon)
            eBoon.toggle(FrontFacesVisibleComponent, true)
          }
        )
        function updateAvatarToken(player: DraftStatePlayer) {
          const e = ensureVisualsForCard(player.avatar!)
          e.toggle(FrontFacesVisibleComponent, true)
          const bidTrack =
            newDealerEventStateLifeAuction.boonBidTracks.items.find(
              bbt => bbt.player === player
            )
          if (bidTrack && bidTrack.debtIndex !== -1) {
            const eDebt = ensureVisualsForCard(
              bidTrack.debts.items[bidTrack.debtIndex]
            )
            copyTransform(helper, eDebt.get('transform'))
            // helper.rotateX(Math.PI)
            helper.translateY(-0.0015)
            helper.scale.multiplyScalar(1.2)
            helper.translateZ(-0.006)
          } else {
            const avatarMesh = ensureVisualsForAvatar(player.avatar!)
            copyTransform(helper, avatarMesh)
            helper.scale.set(1, 1, 1)
            helper.rotateX(Math.PI * -0.5)
            helper.translateY(0.01)
            if (isFirstPlayer(state, player)) {
              helper.translateZ(-0.04)
              //
            } else {
              helper.translateZ(-0.08)
              helper.rotateZ(Math.PI)
              helper.position.z += 0.02
            }
          }
          attemptMove(e.get('transform'), helper)
        }
        for (const bbt of newDealerEventStateLifeAuction.boonBidTracks.items) {
          const eParent = ensureVisualsForCard(bbt.boon)
          const eptc = eParent.get('transform')
          function updateDebts() {
            for (let i = 0; i < bbt.debts.length; i++) {
              const debt = bbt.debts.items[i]
              const ratio = i / (bbt.debts.length - 1) - 0.5
              const eDebt = ensureVisualsForCard(debt)
              copyTransform(helper, eptc)
              helper.translateY(0.01)
              helper.translateZ(0.04)
              helper.translateX(0.035 * ratio)
              if (bbt.debts.items.indexOf(debt) < bbt.debtIndex) {
                helper.rotateX(Math.PI)
              }
              helper.scale.multiplyScalar(0.2)
              // helper.position.x += 0.005 * i - 0.01
              // helper.position.y -= 0.05
              eDebt.toggle(FrontFacesVisibleComponent, true)
              const tc = eDebt.get('transform')
              attemptMove(tc, helper)
              // tc.translateZ(0.05)
            }
          }
          safe.listenToProperty(bbt, 'debtIndex', () => {
            updateDebts()
            if (bbt.player) {
              updateAvatarToken(bbt.player)
            }
          })
          safe.listenToProperty(bbt, 'player', (newPlayer, oldPlayer) => {
            if (newPlayer) {
              updateAvatarToken(newPlayer)
            }
            if (oldPlayer && oldPlayer !== newPlayer) {
              updateAvatarToken(oldPlayer)
            }
          })
        }
        safe.listenForAdd(state.players, updateAvatarToken)
        safe.listenToProperty(
          newDealerEventStateLifeAuction,
          'activePlayer',
          (newPlayer, oldPlayer) => {
            const eNew = ensureVisualsForCard(newPlayer.avatar!)
            if (eNew.has('interactiveIndicators')) {
              // eNew.get('interactiveIndicators').playableState.value = true
              eNew.get('interactiveIndicators').suggestionState.value = true
            }
            if (oldPlayer && newPlayer !== oldPlayer) {
              const eOld = ensureVisualsForCard(newPlayer.avatar!)
              if (eOld.has('interactiveIndicators')) {
                eOld.get('interactiveIndicators').suggestionState.value = false
              }
            }
            if (isFirstPlayer(state, newPlayer)) {
              const validChoices =
                newDealerEventStateLifeAuction.boonBidTracks.items
                  .map(bbt => bbt.debts.items.slice(bbt.debtIndex + 1))
                  .flat()
              for (const bbt of newDealerEventStateLifeAuction.boonBidTracks
                .items) {
                for (const debt of bbt.debts.items) {
                  const isValidChoice = validChoices.includes(debt)
                  const e = ensureVisualsForCard(debt)
                  if (isValidChoice) {
                    e.add(
                      new SelectableComponent(() => {
                        if (newPlayer.currentCardChoice !== debt) {
                          newPlayer.currentCardChoice = debt
                        } else {
                          newPlayer.choiceCommited = true
                        }
                      })
                    )
                  } else {
                    e.remove('selectable')
                  }
                  if (e.has('interactiveIndicators')) {
                    e.get('interactiveIndicators').playableState.value =
                      isValidChoice
                  }
                }
              }
            } else {
              for (const bbt of newDealerEventStateLifeAuction.boonBidTracks
                .items) {
                for (const debt of bbt.debts.items) {
                  const e = ensureVisualsForCard(debt)
                  e.remove('selectable')
                  e.get('interactiveIndicators').playableState.value = false
                }
              }
            }
          }
        )
      } else if (newDealerEventState instanceof EventStateRandomizerDealer) {
        wheel = new Object3D()
        const wheelInner = new Object3D()
        wheelInner.position.y = 0.01
        wheel.add(wheelInner)
        wheel.position.set(0, 0.16, 0.25)
        wheel.scale.setScalar(1.2)
        wheel.rotateX(Math.PI * 0.35)
        wheel.rotateY(Math.PI)
        scene.add(wheel)
        for (let i = 0; i < state.players.length; i++) {
          const player = state.players.items[i]
          const ratio = i / state.players.length
          const e = ensureVisualsForCard(player.avatar!)
          e.toggle(FrontFacesVisibleComponent, true)
          const t = e.get('transform')
          t.position.set(0, 0, 0)
          t.scale.setScalar(0.4)
          t.rotation.set(0, 0, 0)
          t.rotateY(Math.PI * 2 * ratio + Math.PI)
          t.translateZ(-0.02)
          wheelInner.add(t)
        }
        for (let i = 0; i < newDealerEventState.boonSlots.length; i++) {
          const boonSlot = newDealerEventState.boonSlots.items[i]
          const ratio = i / newDealerEventState.boonSlots.length
          if (boonSlot.card) {
            const e = ensureVisualsForCard(boonSlot.card)
            e.toggle(FrontFacesVisibleComponent, true)
            const t = e.get('transform')
            helper.position.set(0, 0, 0)
            helper.rotation.set(0, 0, 0)
            helper.scale.setScalar(1)
            // helper.rotateX(Math.PI)
            helper.rotateY(Math.PI * 2 * ratio + Math.PI)
            helper.rotateZ(Math.PI * 0.03)
            helper.translateZ(-0.06)
            wheel.add(helper)
            scene.attach(helper)
            attemptMove(t, helper)
          }
        }
        const distance = { val: 0 }
        const updater = {
          update() {
            const val = distance.val
            wheelInner.rotation.y =
              ((Math.PI * 2) / newDealerEventState.boonSlots.length) * val
            const bpp = draftSettings.randomizerBoonsPerPlayer
            for (let i = 0; i < newDealerEventState.boonSlots.length; i++) {
              const boon = newDealerEventState.boonSlots.items[i].card
              if (boon) {
                const e = ensureVisualsForCard(boon)
                const mainOne = isDistanceInCurrentSlot(state, distance.val, i)
                const belongsToOpponent =
                  !mainOne && (i - Math.round(distance.val)) % bpp === 0
                const indicators = e.get('interactiveIndicators')
                indicators.bookmarkState.value = mainOne
                indicators.healingPredictionState.value = belongsToOpponent
              }
            }
          }
        }
        const stopUpdater = safe.onRafUpdate(updater)
        simpleTweener.to({
          target: distance,
          description: 'spin the wheel',
          propertyGoals: {
            val: newDealerEventState.distance
          },
          easing: Easing.Custom.WheelSpin,
          delay: 1000,
          duration:
            Math.sqrt(Math.sqrt(newDealerEventState.distance)) * 1000 * 2,
          onComplete: () => {
            stopUpdater()
          }
        })
      }
      if (oldDealerEventState && oldDealerEventState !== newDealerEventState) {
        if (oldDealerEventState instanceof EventStateLifeAuctionDealer) {
          const allBoons = state.players.items
            .map(player => player.boons.items)
            .flat()
          const debtsToDelete = oldDealerEventState.boonBidTracks.items
            .map(bbt =>
              bbt.debts.items.filter(debt => !allBoons.includes(debt))
            )
            .flat()
          for (const debt of debtsToDelete) {
            rejectVisualsForCard(debt)
          }
          for (const player of state.players.items) {
            rejectVisualsForCard(player.avatar!)
          }
        } else if (oldDealerEventState instanceof EventStateRandomizerDealer) {
          for (const player of state.players.items) {
            rejectVisualsForCard(player.avatar!)
          }
          //
        }
      }
    }
  )
  let brainContainer: Object3D | undefined
  let cubeContainer: Object3D | undefined
  let forceDirectedGraph: ForceDirectedGraph | undefined
  safe.listenToProperty(dealerChair, 'dealer', dealer => {
    if (!dealer) {
      return
    }
    if (brainContainer) {
      scene.remove(brainContainer)
      brainContainer = undefined
    }
    if (forceDirectedGraph) {
      UpdateManager.unregister(forceDirectedGraph)
      forceDirectedGraph = undefined
    }
    safe.listenToProperty(state, 'dealerShowBrain', dealerShowBrain => {
      if (dealerShowBrain) {
        if (!brainContainer) {
          forceDirectedGraph = new ForceDirectedGraph()
          UpdateManager.register(forceDirectedGraph)
          brainContainer = new Object3D()
          const dimmer = new Mesh(
            getSharedPlaneBufferGeometry(),
            new BasicColorMeshMaterial({
              color: COLOR_BLACK,
              opacity: 0.5,
              transparent: true,
              depthWrite: false
            })
          )
          dimmer.renderOrder = 10000 - 1
          dimmer.rotateX(Math.PI * -0.5)
          scene.add(brainContainer)
          cubeContainer = new Object3D()
          brainContainer.add(cubeContainer)
          cubeContainer.add(dimmer)
          cubeContainer.rotation.x = Math.PI * 0.35
          cubeContainer.position.set(0, 0.25, 0.4)
          getAssetsManager()
            .loadAsset('tutorialCube')
            .then(() => {
              if (!dealerChair.dealer) {
                return
              }
              const phaseMap = dealerChair.dealer.phases
              const startPhases = Array.from(phaseMap.keys())
              const endPhases = startPhases
                .map(phase => phaseMap.get(phase)!.getAllDestinations())
                .flat()
              const allPhases = Array.from(
                new Set(startPhases.concat(endPhases))
              )
              const phaseMarkersByName = new Map<
                DealerStepName,
                DelearPhaseMarker
              >()
              function getPhaseMarker(phase: DealerStepName) {
                if (!phaseMarkersByName.has(phase)) {
                  const phaseMarker = new DelearPhaseMarker(phase)
                  phaseMarkersByName.set(phase, phaseMarker)
                  cubeContainer!.add(phaseMarker)
                  phaseMarker.active = false
                }
                return phaseMarkersByName.get(phase)!
              }
              for (let i = 0; i < allPhases.length; i++) {
                const phase = allPhases[i]
                const ratio = i / allPhases.length
                const angle = ratio * Math.PI * 2 - Math.PI
                const marker = getPhaseMarker(phase)
                helper.scale.setScalar(1)
                helper.rotation.set(0, 0, 0)
                helper.position.set(
                  Math.cos(angle) * 0.05,
                  0,
                  Math.sin(angle) * 0.05
                )
                attemptMove(marker, helper)
                forceDirectedGraph!.register(marker, 0.022)
              }
              for (const phase of startPhases) {
                for (const otherPhase of phaseMap
                  .get(phase)!
                  .getAllDestinations()) {
                  const fromHelper = getPhaseMarker(phase)
                  const toHelper = getPhaseMarker(otherPhase)
                  const midHelper = new WorldPointObject3D()
                  midHelper.position
                    .copy(fromHelper.position)
                    .add(toHelper.position)
                    .multiplyScalar(0.55)
                  cubeContainer!.add(midHelper)
                  const lineMesh = new QuadraticRibbonMesh({
                    matOptions: {
                      positionStart: fromHelper.worldPosition,
                      positionHandle: midHelper.worldPosition,
                      positionEnd: toHelper.worldPosition,
                      relativeWidth: 0.01,
                      color: COLOR_START,
                      color2: COLOR_END,
                      blendMode: 'screenAlpha'
                    },
                    geomOptionsKey: 'attributionLine'
                  })
                  lineMesh.renderOrder = 10000
                  forceDirectedGraph!.addChain(fromHelper, toHelper, midHelper)
                  brainContainer!.add(lineMesh)
                }
              }
              safe.listenToProperty(
                state,
                'dealerCurrentStep',
                (newDealerCurrentStep, oldDealerCurrentStep) => {
                  if (newDealerCurrentStep) {
                    getPhaseMarker(newDealerCurrentStep).active = true
                  }
                  if (
                    oldDealerCurrentStep &&
                    oldDealerCurrentStep !== newDealerCurrentStep
                  ) {
                    getPhaseMarker(oldDealerCurrentStep).active = false
                  }
                }
              )
            })
        } else {
          brainContainer.visible = true
        }
      } else if (brainContainer) {
        brainContainer.visible = false
      }
    })
  })

  // safe.listenToProperty(state, 'eventState', (newEventState, oldEventState) => {
  //   if (newEventState instanceof EventStateLifeAuction) {
  //     function onEventChoicesChanged() {
  //       rearrangePackCardsToPackFanOut(newEventState.boons)
  //     }
  //   }
  // })

  return function cleanup() {
    safe.cleanup()

    for (const e of entities) {
      world.removeEntity(e.id)
    }

    for (let i = playerMeshes.length - 1; i >= 0; i--) {
      scene.remove(playerMeshes[i])
    }
    for (let i = packMeshes.length - 1; i >= 0; i--) {
      scene.remove(packMeshes[i])
    }
    for (let i = avatarMeshes.length - 1; i >= 0; i--) {
      scene.remove(avatarMeshes[i])
    }
    if (brainContainer) {
      scene.remove(brainContainer)
    }
    if (wheel) {
      scene.remove(wheel)
    }
    if (dimmer) {
      scene.remove(dimmer)
    }
    if (forceDirectedGraph) {
      UpdateManager.unregister(forceDirectedGraph)
    }
  }
}
