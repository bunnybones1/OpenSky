import { i18n, TFuncKey } from '@opensky/language-manager'
import { SKYWEAVER_JWT_KEY, UserStorageKeys } from '@opensky/shared/constants'
import device from '@opensky/shared/device'
import { renderMetrics } from '@opensky/shared/renderMetrics'
import {
  ActionStep,
  AttachedCardTarget,
  BaseTarget,
  FieldTarget,
  GraveTarget,
  HandTarget,
  MessageStep,
  PlayerActionStep,
  Step,
  Target,
  UnitTarget
} from '@opensky/shared/tutorialConfig'
import { sfxVolume } from '@opensky/shared/userSettings'
import { delayPromise } from '@opensky/shared/utils/async'
import { audioLevelCurve } from '@opensky/shared/utils/math'
import {
  listenToProperty,
  stopListeningToProperty
} from '@opensky/shared/utils/propertyListeners'
import { InstanceID } from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import { Howl } from 'howler'
import {
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneBufferGeometry,
  Vector3
} from 'three'

import apiClient from '~/apiClient'
import { getAssetsManager } from '~/assets'
import { getCardCache } from '~/cardCache'
import { Components } from '~/components'
import GamePinCushionComponent from '~/components/GamePinCushionComponent'
import IsAnimatingComponent from '~/components/IsAnimatingComponent'
import TransformComponent from '~/components/TransformComponent'
import { BUTTON_MARGINS, RENDER_ORDERS } from '~/constants'
import { setHoveredCardAsync } from '~/helpers/cardPopupHelpers'
import { playSound, playSoundLoop, stopSoundLoop } from '~/helpers/soundHelpers'
import { tutorialEndPause } from '~/helpers/tutorialEndPause'
import { tutorialIntroductionPause } from '~/helpers/tutorialIntroductionPause'
import { ownedZoneCollections } from '~/helpers/zoneCollections'
import HelperCubeGlowMaterial from '~/materials/HelperCubeGlowMaterial'
import Object2D from '~/meshes/Object2D'
import queryParams from '~/queryParams'
import { matchEnded, store, storeHelper } from '~/state'
import { MessageTutorialChange } from '~/state/StateSharedTypes'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import { getAnimationOrchestrator } from '~/systems/AnimationOrchestrator'
import { deckConfigs } from '~/systems/cardPositioning/deckConfigs'
import ZoneSystem from '~/systems/cardPositioning/ZoneSystem'
import EmoteSystem from '~/systems/EmoteSystem'
import inputProvider from '~/systems/input/input'
import UpdateManager from '~/systems/UpdateManager'
import { CardStatus } from '~/types'
import { createResolvable, Resolvable } from '~/utils/asyncUtils'
import {
  clipToWorld,
  get2DPositionAtDepth,
  hitTestAtPixel,
  toClipX,
  toClipY
} from '~/utils/camera'
import { cameraShaker } from '~/utils/cameraShaker'
import { globalAccess } from '~/utils/globalAccess'
import { waitForNextFrame } from '~/utils/onNextFrame'
import { removeFromParent } from '~/utils/threeUtils'
import { timeWarp } from '~/utils/timeWarp'
import { world } from '~/world'

import { trackTutorialEnd } from '../helpers/analytics-old'

import { getTutorial } from './Tutorial'
import { asArray } from './utils'

const TEST_TARGETS = false
const INACTIVE_TIMEOUT = 6_000
const PLAYER_RADIUS = 0.15
const ENEMY_RADIUS = 0.1
const CUBE_SCALE = 0.15

const { camera } = cameraShaker
const cameraWorldPos = cameraShaker.cameraWorldPos

const helperCubeHomePosition = device.isMobile
  ? new Vector3(0.17, 0.17, 0.1)
  : new Vector3(0.1, 0.2, 0.1)
const helperCubeTargetPosition = helperCubeHomePosition.clone()
const helperCubeHomeOffset = new Vector3(0, 0, 0)
const helperCubeDeckOffset = new Vector3(0, 0.1, 0)
const helperCubeCardOffset = new Vector3(0.035, 0.05, 0)
const helperCubeOpponentHandOffset = new Vector3(0, -0.05, 0.05)
const helperCubePlayerManaVialOffset = new Vector3(0.035, 0.08, 0.0)
const helperCubeOpponentManaVialOffset = new Vector3(0.035, -0.03, 0.05)

interface TargetProps {
  position: Vector3
  offset: Vector3
  radius: number
  skew: number
}

const getCardEntityPosition = (id: InstanceID) => {
  const entity = getCardCache().getEntity(id)

  if (entity) {
    const transform = entity.get('transform')
    return transform.position
  } else {
    console.error('HelperCube: Could not find card entity position')
    return undefined
  }
}

const getHeroID = (player: number) => {
  const entity = getCardCache().findEntity(
    entity =>
      getCardCache().cardOwner(entity) === player &&
      entity.has('cardInstance') &&
      entity.get('cardInstance').state.view.type === 'hero'
  )

  if (entity) {
    return entity.get('cardInstance').id
  } else {
    console.error('HelperCube: Could not find hero entity')
    return undefined
  }
}

function getTargetEntity(
  target: HandTarget | UnitTarget | GraveTarget | AttachedCardTarget
): Entity<Components> | undefined {
  const id = target.getInstanceID(store.state!, store.secret!)
  if (id !== undefined) {
    return getCardCache().getEntity(id)
  }

  return
}

export const getTargetProps = (target: BaseTarget): TargetProps => {
  const props = ((): TargetProps => {
    switch (target) {
      case Target.Home:
        return {
          position: helperCubeHomePosition,
          offset: helperCubeHomeOffset,
          radius: 0,
          skew: 1
        }
      case Target.PlayerDeck:
        return {
          position: deckConfigs.get('Player_Deck')!.pos,
          offset: helperCubeDeckOffset,
          radius: 0.12,
          skew: 1
        }
      case Target.EnemyDeck:
        return {
          position: deckConfigs.get('Opponent_Deck')!.pos,
          offset: helperCubeDeckOffset,
          radius: 0.1,
          skew: 1
        }
      case Target.PlayerGraveyard:
        return {
          position: deckConfigs.get('Player_Graveyard')!.pos,
          offset: helperCubeDeckOffset,
          radius: 0.12,
          skew: 1
        }
      case Target.EnemyGraveyard:
        return {
          position: deckConfigs.get('Opponent_Graveyard')!.pos,
          offset: helperCubeDeckOffset,
          radius: 0.1,
          skew: 1
        }
      case Target.PlayerHand:
        return {
          position:
            world.getSystem(ZoneSystem).zones.Player_Hand.positionHelper
              .position,
          offset: helperCubeDeckOffset,
          radius: 0.15,
          skew: 0.5
        }
      case Target.EnemyHand:
        return {
          position:
            world.getSystem(ZoneSystem).zones.Opponent_Hand.positionHelper
              .position,
          offset: helperCubeOpponentHandOffset,
          radius: 0.11,
          skew: 0.5
        }
      case Target.PlayerManaVial: {
        const pos =
          globalAccess.ui!.getContainer('skyTags').playerManaTracker.uiPivot
            .matrixWorld
        return {
          position: get2DPositionAtDepth(
            camera,
            cameraWorldPos,
            pos.clipSpacePosX + pos.clipSpaceSizeX / 2,
            pos.clipSpacePosY - pos.clipSpaceSizeY / 2,
            0
          ),
          offset: helperCubePlayerManaVialOffset,
          radius: 0.09,
          skew: 1
        }
      }
      case Target.PlayerHeroAbility: {
        const pos =
          ownedZoneCollections.Player_HeroAbility.items[0]
            ?.getComponent('transform')
            ?.value.position.clone() ?? new Vector3()
        return {
          position: pos,
          offset: helperCubePlayerManaVialOffset,
          radius: 0.09,
          skew: 1
        }
      }
      case Target.EnemyManaVial:
        return {
          position: get2DPositionAtDepth(
            camera,
            cameraWorldPos,
            toClipX(40),
            toClipY(60),
            0
          ),
          offset: helperCubeOpponentManaVialOffset,
          radius: 0.09,
          skew: 1
        }
      case Target.EndTurn:
        return {
          position: get2DPositionAtDepth(
            camera,
            cameraWorldPos,
            toClipX(renderMetrics.width - 50 - BUTTON_MARGINS),
            toClipY(renderMetrics.height - 10 - BUTTON_MARGINS),
            0
          ),
          offset: helperCubeDeckOffset,
          radius: 0.06,
          skew: 0.5
        }
      case Target.PlayerHero:
        return {
          position:
            getCardEntityPosition(getHeroID(0)!) || helperCubeHomeOffset,
          offset: helperCubeCardOffset,
          radius: PLAYER_RADIUS,
          skew: 1.4
        }
      case Target.EnemyHero:
        return {
          position:
            getCardEntityPosition(getHeroID(1)!) || helperCubeHomeOffset,
          offset: helperCubeCardOffset,
          radius: ENEMY_RADIUS,
          skew: 1.4
        }
      case Target.Offscreen:
        return {
          position: new Vector3(100, 100, 0),
          offset: helperCubeHomeOffset,
          radius: 0,
          skew: 1
        }
      default: {
        if (target instanceof HandTarget || target instanceof UnitTarget) {
          const id = target.getInstanceID(store.state!, store.secret!)
          const pos = id !== undefined && getCardEntityPosition(id)
          return {
            position: pos || helperCubeHomePosition,
            offset: pos ? helperCubeCardOffset : helperCubeHomeOffset,
            radius: target.player ? ENEMY_RADIUS : PLAYER_RADIUS,
            skew: 1.4
          }
        } else if (target instanceof AttachedCardTarget) {
          const id = target.getInstanceID(store.state!, store.secret!)
          const pos = id !== undefined && getCardEntityPosition(id)
          return {
            position: pos || helperCubeHomePosition,
            offset: pos ? helperCubeCardOffset : helperCubeHomeOffset,
            radius: (target.player ? ENEMY_RADIUS : PLAYER_RADIUS) / 2,
            skew: 1
          }
        }
        return {
          position: helperCubeHomePosition,
          offset: helperCubeHomeOffset,
          radius: 0,
          skew: 1
        }
      }
    }
  })()

  return props
}

const updateTargetPosition = (target: BaseTarget, vec: Vector3) => {
  const { position, offset } = getTargetProps(target)

  vec.copy(position)
  vec.project(camera)
  vec.copy(clipToWorld(camera, vec.x, vec.y))

  vec.add(offset)

  return vec
}

export const onBaseTargetAnimationTick = (
  target: BaseTarget,
  tick: () => void
) => {
  tick()
  let id: InstanceID | undefined
  let targetZone: CardStatus = 'Field'
  if (target === Target.PlayerHero) {
    id = getHeroID(0)
  } else if (target === Target.EnemyHero) {
    id = getHeroID(1)
  } else if (target instanceof HandTarget) {
    id = target.getInstanceID(store.state!, store.secret!)
    targetZone = 'Hand'
  } else if (target instanceof UnitTarget) {
    id = target.getInstanceID(store.state!, store.secret!)
  } else if (target instanceof AttachedCardTarget) {
    id = target.getInstanceID(store.state!, store.secret!)
    targetZone = 'Attachment'
  }

  if (id === undefined) {
    return
  }

  const entity = getCardCache().getEntity(id)
  if (!entity) {
    return
  }

  const isInTargetZone = (entity: Entity<Components>) => {
    const zone = entity.has('zone') && entity.get('zone').current
    return zone && zone.cardStatus === targetZone
  }

  if (isInTargetZone(entity)) {
    if (entity.has('isAnimating')) {
      // still moving to target zone
      const ani = entity.get('isAnimating').animationFull
      const stopFollowing = ani.addUpdateListener(tick)
      ani.finished.then(stopFollowing)
    }
    // already in target zone
  } else {
    // not yet in target zone, or even started animating there.
    const onAddedToIsAnimating = (ent: Entity<Components>) => {
      if (ent === entity && isInTargetZone(entity)) {
        const ani = entity.get('isAnimating').animationFull
        const stopFollowing = ani.addUpdateListener(tick)
        ani.finished.then(() => {
          IsAnimatingComponent.entities.stopListeningForAdd(
            onAddedToIsAnimating
          )
          stopFollowing()
        })
      }
    }
    IsAnimatingComponent.entities.listenForAdd(onAddedToIsAnimating)
  }
  if (entity.has('zone')) {
    const animation = entity.get('zone').current.seat.animation
    if (animation) {
      const stopFollowing = animation.addUpdateListener(tick)
      animation.finished.then(stopFollowing)
    }
  }
}

type HighlightListener = (targets: BaseTarget[]) => void

class HelperCube {
  container: Object3D = new Object3D()
  isStarted: boolean = false
  isPlayingMessage: boolean = false
  isShowingCube: boolean = true

  private cubeContainer: Object3D = new Object3D()
  private cube: Object3D
  private speechBubble: Object2D | undefined
  private glow: Mesh
  private messageQueue: MessageStep[] = []
  private audioPromises: Array<Promise<void>> = []
  private audioAssets: Map<string, Howl> = new Map()
  private currentMessage: MessageStep | undefined
  private currentAudio: Howl | undefined
  private currentHelperCubePositionTarget: BaseTarget
  private inactivePlayerTimeout: NodeJS.Timeout | undefined
  private finishedPlayingMessages: Resolvable<void> | undefined
  private highlightListeners: Set<HighlightListener> = new Set()
  private updateTicker: { update: (dt: number) => void }

  private _playSoundLoop = false

  private currentLoopVariation: number | undefined = undefined
  private lastLoopVariation = 0

  get playSoundLoop(): boolean {
    return this._playSoundLoop
  }
  set playSoundLoop(value: boolean) {
    if (value === this._playSoundLoop) {
      return
    }

    if (value) {
      do {
        this.currentLoopVariation = (~~(Math.random() * 1000) % 4) + 1
      } while (this.lastLoopVariation === this.currentLoopVariation)
      this.lastLoopVariation = this.currentLoopVariation

      playSoundLoop(
        'audioFxTutorial',
        `CubeLoop${this.currentLoopVariation}`,
        0.05,
        1
      )
    } else {
      stopSoundLoop(
        'audioFxTutorial',
        `CubeLoop${this.currentLoopVariation}`,
        0.05
      )
      this.currentLoopVariation = undefined
    }
    this._playSoundLoop = value
  }

  skipCurrentMessage: boolean = false
  speechBubbleTargetHelper: Entity<Components>
  update() {
    // Face the screen
    this.cubeContainer.quaternion.copy(camera.quaternion)

    // Animate cube
    const speed = 0.002
    this.cube.rotation.x = Math.PI / 5
    this.cube.rotation.y = Math.sin((performance.now() * speed) / 2)
    this.cube.rotation.z =
      Math.sin((performance.now() + Math.PI / 2 / speed) * speed) / 4
    this.cube.position.x = Math.sin(performance.now() * speed) / 5000
    this.cube.position.y = Math.sin(performance.now() * speed) / 5000
    this.glow.position.x = this.cube.position.x
    this.glow.position.y = this.cube.position.y
  }

  constructor() {
    this.speechBubbleTargetHelper = world.createEntity([
      new TransformComponent()
    ])
    this.animateHelperCubeToPosition(Target.Home, 0)

    this.container.add(this.cubeContainer)

    inputProvider.onDragStart.addListener(() => this.clearHighlights())

    // // Preload audio for all turns
    // if (this.tutorial.config.turns) {
    //   for (const turn of this.tutorial.config.turns) {
    //     for (const steps of Object.values(turn) as Step[][]) {
    //       this.audioPromises.push(this.preloadAudioFromSteps(steps))
    //     }
    //   }
    // }

    // Preload audio for conditional effects
    const tut = getTutorial()
    if (tut.config.conditions) {
      for (const playerActionStep of tut.config.conditions) {
        if (playerActionStep.options) {
          this.audioPromises.push(
            this.preloadAudioFromSteps(playerActionStep.options.successMessage)
          )
        }
      }
    }
  }

  async reset() {
    this.messageQueue = []

    const oldCubeContainer = this.cubeContainer
    this.container.remove(oldCubeContainer)
    this.cubeContainer = new Object3D()
    this.container.add(this.cubeContainer)
    this.cubeContainer.position.copy(oldCubeContainer.position)
    this.cubeContainer.quaternion.copy(oldCubeContainer.quaternion)
    this.cubeContainer.scale.copy(oldCubeContainer.scale)
    if (this.speechBubble) {
      removeFromParent(this.speechBubble)
    }

    UpdateManager.unregister(this.updateTicker)

    await this.start()
  }

  async start() {
    this.isStarted = true

    globalAccess.ui
      ?.getContainer('endTurnButton')
      .setResetEnabled(getTutorial().config.allowTryAgainBeforeRewards)

    const cube = getAssetsManager().fetchMeshDeepClone(
      'tutorialCube',
      'tutorial-cube',
      undefined,
      true
    )
    cube.position.set(0, 0, 0)
    this.cube = cube
    cube.scale.set(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE) //default cube is 1 metre
    this.cubeContainer.add(cube)

    const cameraPos = camera.position.clone()
    cameraPos.z -= 0.01

    const glowGeometry = new PlaneBufferGeometry(0.07, 0.07)
    const glowMaterial = new HelperCubeGlowMaterial()
    const glow = new Mesh(glowGeometry, glowMaterial)
    glow.renderOrder = RENDER_ORDERS.highlight + 1
    this.cubeContainer.add(glow)
    this.glow = glow
    this.glow.visible = false
    this.glow.scale.set(0.1, 0.1, 0.1)

    const colliderGeometry = new PlaneBufferGeometry(0.007, 0.007)
    const collider = new Mesh(
      colliderGeometry,
      new MeshBasicMaterial({
        visible: false
      })
    )
    this.cubeContainer.add(collider)
    inputProvider.onSelect.addListener((x, y) => {
      hitTestAtPixel(
        x,
        y,
        [collider],
        () => {
          this.fastForward()
          const descr = getTutorial().config.gameEndConditions?.description
          if (descr && this.currentMessage?.text !== descr) {
            this.playMessage({
              type: 'message',
              text: descr,
              duration: 10_000
            })
          }
          return true
        },
        cameraShaker.camera
      )
    })

    // Helper cube starts hidden
    this.hideHelperCube(0)

    this.updateTicker = { update: () => this.update() }
    UpdateManager.register(this.updateTicker)

    if (queryParams.tutorialJump > -1) {
      const goAgane = async () => {
        timeWarp.setCustomScaler('tutorialJump', 100)
        if (getTutorial().turnIdx >= queryParams.tutorialJump) {
          this.skipCurrentMessage = false
          await new Promise<void>(res =>
            getAnimationOrchestrator().stagingStack[0].push(res)
          )
          timeWarp.removeCustomScaler('tutorialJump')
          return
        }
        this.skipCurrentMessage = true
        const a = store.validActions[0]
        if (a) {
          try {
            await store.dispatch(a)
          } catch (e) {
            // np!
          }
        }
        setTimeout(goAgane, 10)
      }
      goAgane()
    }

    if (TEST_TARGETS) {
      this.messageQueue.length = 0

      const testMessages = async () => {
        const targetTests: BaseTarget[] = [
          Target.PlayerHero,
          Target.EnemyHero,
          Target.PlayerDeck,
          Target.EnemyDeck,
          Target.PlayerGraveyard,
          Target.EnemyGraveyard,
          Target.PlayerHand,
          Target.PlayerHandCard('30000'),
          Target.EnemyHand,
          Target.PlayerManaVial,
          Target.EnemyManaVial,
          Target.EndTurn
        ]

        for (const target of targetTests) {
          await this.playMessage({
            type: 'message',
            key: undefined,
            text: target.name,
            position: target,
            highlight: target
          })
        }

        setTimeout(testMessages, 1)
      }

      testMessages()
    } else {
      await this.playIntroductionMessages()

      await Promise.all(this.audioPromises)

      this.audioPromises = []

      tutorialIntroductionPause.resolve()

      let prevSteps: Step[] = []

      store.subscribeToStateChanges(async store => {
        if (store.state) {
          const { turnCount, currentPlayer } = store.state.state
          if (turnCount !== undefined) {
            getTutorial().update(turnCount, currentPlayer)

            // Turn change
            if (getTutorial().stepIdx === -1) {
              this.unloadAudioFromSteps(prevSteps)
              prevSteps = getTutorial().steps.slice()
              await this.preloadAudioFromSteps(getTutorial().steps)

              // Start the turn
              getTutorial().nextStep()

              this.syncTutorial()
            }
          }
        }
      })

      const tut = getTutorial()
      getTutorial().onChange(this.handleTutorialChange)

      // Strictly for receiving committed actions
      store.subscribeToTutorialChange(this.handleCommitAction)

      // Card selection messages
      if (
        !(
          typeof tut.config.setup === 'object' && tut.config.setup.skipMulligan
        ) &&
        tut.config.cardSelection
      ) {
        await this.preloadAudioFromSteps(tut.config.cardSelection)
        await this.playMessages(tut.config.cardSelection)
      } else {
        // Start tutorial
        const turns = tut.config.turns
        if (turns) {
          await this.preloadAudioFromSteps(turns[0].player)
        }
        if (tut.stepIdx === -1) {
          tut.nextStep()
        }
      }

      // Send initial sync to trigger first state change
      this.syncTutorial()

      matchEnded().then(async () => {
        this.clearInactiveTimeout()

        this.unloadAudioFromSteps(prevSteps)
        await this.playMatchEndMessages()
        tutorialEndPause.resolve()
      })
    }
  }

  async preloadAudioFromMessage(message: MessageStep) {
    if (message.key && !this.audioAssets.has(message.key)) {
      const audioUrl = `game/audio/tutorial/${message.key}.mp3`
      try {
        const audio = (await getAssetsManager().load('sound', audioUrl)) as Howl
        await new Promise((resolve, reject) => {
          audio.on('load', resolve)
          audio.on('loaderror', reject)
        })
        this.audioAssets.set(message.key, audio)
        sfxVolume.listen(volume => audio.volume(volume))
      } catch (err) {
        console.warn(`Could not load audio for ${audioUrl}`)
      }
    }
  }

  async preloadAudioFromSteps(steps: Step | Step[] | undefined) {
    if (steps) {
      const promises = asArray(steps).reduce<Array<Promise<void>>>(
        (acc, step) => {
          switch (step.type) {
            case 'message': {
              if (step.key) {
                acc.push(this.preloadAudioFromMessage(step))
              }
              break
            }
            case 'action': {
              acc.concat(this.preloadAudioFromSteps(step.successMessage))
              acc.concat(this.preloadAudioFromSteps(step.errorMessage))

              const playerActionSteps = ([] as PlayerActionStep[]).concat(
                step.actions
              )

              for (const playerActionStep of playerActionSteps) {
                if (playerActionStep.options) {
                  acc.concat(
                    this.preloadAudioFromSteps(
                      playerActionStep.options.successMessage
                    )
                  )
                  acc.concat(
                    this.preloadAudioFromSteps(
                      playerActionStep.options.errorMessage
                    )
                  )
                }
              }

              break
            }
          }

          return acc
        },
        []
      )
      await Promise.all(promises)
    }
  }

  unloadAudioFromSteps(steps: Step | Step[] | undefined) {
    if (steps) {
      asArray(steps).forEach(step => {
        switch (step.type) {
          case 'message': {
            if (step.key) {
              this.unloadAudioFromMessage(step)
            }
            break
          }
          case 'action': {
            this.unloadAudioFromSteps(step.successMessage)
            this.unloadAudioFromSteps(step.errorMessage)

            const playerActionSteps = ([] as PlayerActionStep[]).concat(
              step.actions
            )

            for (const playerActionStep of playerActionSteps) {
              if (playerActionStep.options) {
                this.unloadAudioFromSteps(
                  playerActionStep.options.successMessage
                )
                this.unloadAudioFromSteps(playerActionStep.options.errorMessage)
              }
            }

            break
          }
        }
      })
    }
  }

  unloadAudioFromMessage(message: MessageStep) {
    if (message.key && this.audioAssets.has(message.key)) {
      const audio = this.audioAssets.get(message.key)!
      audio.unload()
    }
  }

  syncTutorial() {
    store.syncTutorial(
      getTutorial().player,
      getTutorial().turnCount,
      getTutorial().stepIdx,
      getTutorial().actionStepIdx
    )
  }

  async animateHelperCubeToPosition(
    target: BaseTarget,
    duration: number = 400
  ) {
    if (this.currentHelperCubePositionTarget !== target) {
      this.currentHelperCubePositionTarget = target

      updateTargetPosition(target, helperCubeTargetPosition)
      helperCubeTargetPosition

      // project into screen space
      helperCubeTargetPosition.project(cameraShaker.camera)
      // project back into world space, but at a fixed offset from the camera
      helperCubeTargetPosition.setZ(0.7)
      helperCubeTargetPosition.unproject(cameraShaker.camera)

      await simpleTweener.to({
        description: 'move helper cube',
        target: this.cubeContainer.position,
        propertyGoals: {
          x: helperCubeTargetPosition.x,
          y: helperCubeTargetPosition.y,
          z: helperCubeTargetPosition.z
        },
        easing: Easing.Custom.RoundedOutHard,
        duration
      }).finished
    }
  }

  async showHelperCube(duration: number = 1_000) {
    this.isShowingCube = true

    await simpleTweener.to({
      description: 'show helper cube',
      target: this.cube.scale,
      propertyGoals: {
        x: CUBE_SCALE,
        y: CUBE_SCALE,
        z: CUBE_SCALE
      },
      duration,
      easing: Easing.Elastic.Out
    }).finished
  }

  async hideHelperCube(duration: number = 100) {
    this.isShowingCube = false

    await simpleTweener.to({
      description: 'hide helper cube',
      target: this.cube.scale,
      propertyGoals: {
        x: 0.00001,
        y: 0.00001,
        z: 0.00001
      },
      easing: Easing.Exponential.Out,
      duration
    }).finished
  }

  onHighlight(listener: HighlightListener) {
    this.highlightListeners.add(listener)

    return () => {
      this.highlightListeners.delete(listener)
    }
  }

  setHighlights(highlight: BaseTarget | BaseTarget[]) {
    if (!inputProvider.isPressed) {
      const targets = asArray(highlight)

      this.highlightListeners.forEach(listener => listener(targets))
    }
  }

  clearHighlights() {
    this.highlightListeners.forEach(listener => listener([]))
  }

  async playIntroductionMessages() {
    const tut = getTutorial()
    if (tut.config.introduction) {
      await this.preloadAudioFromSteps(tut.config.introduction)
      await this.playMessages(tut.config.introduction)
      this.unloadAudioFromSteps(tut.config.introduction)
    }
  }

  async playMatchEndMessages() {
    const endType = await storeHelper.getMatchEndType()
    const num = Number.parseInt(queryParams.tutorialLevel ?? '', 10)
    if (!Number.isNaN(num)) {
      if (endType === 'victory') {
        const jwt = window.localStorage.getItem(SKYWEAVER_JWT_KEY)

        if (jwt) {
          const result = await apiClient.userStorageFetch({
            key: UserStorageKeys.TUTORIAL_PROGRESS
          })

          const tutorialsThatHaveBeenCompleted = result.object
            ? result.object.map((n: string) => Number.parseInt(n, 10))
            : undefined
          const { tutorialLevel } = queryParams

          trackTutorialEnd(num, true)

          if (
            !tutorialsThatHaveBeenCompleted ||
            !tutorialsThatHaveBeenCompleted.includes(tutorialLevel)
          ) {
            const object = tutorialsThatHaveBeenCompleted
              ? [...tutorialsThatHaveBeenCompleted, tutorialLevel]
              : [tutorialLevel]
            await apiClient.userStorageSave({
              key: UserStorageKeys.TUTORIAL_PROGRESS,
              object: object.map(n => Number.parseInt(n, 10))
            })
          }
        }
      } else {
        trackTutorialEnd(num, false)
      }
    }

    const steps =
      getTutorial().config[endType === 'victory' ? 'victory' : 'defeat']

    if (steps) {
      if (endType === 'victory') {
        steps[0].sentiment = 'happy'
      }

      await this.preloadAudioFromSteps(steps)
      await this.playMessages(steps)
      this.unloadAudioFromSteps(steps)
    }
  }

  async playMessage(message: MessageStep) {
    const container = globalAccess.ui!.getContainer('tutorial')
    if (!this.finishedPlayingMessages) {
      this.finishedPlayingMessages = createResolvable()
    }

    this.isPlayingMessage = true
    this.currentMessage = message

    message.text = i18n.t(message.text as TFuncKey<'game'>)

    if (typeof message.beforeDelay === 'number') {
      await delayPromise(message.beforeDelay)
    }

    const isHelperCubeSource = !message.source

    // Animate cube to position target
    await this.animateHelperCubeToPosition(
      message.position || Target.Home,
      this.isShowingCube ? 400 : 0
    )

    if (isHelperCubeSource && !this.isShowingCube) {
      await this.showHelperCube()
    }

    // Explicit highlights - ie. Highlights specified by message, not inactive timer
    if (message.highlight) {
      this.setHighlights(message.highlight)
    } else {
      // No highlights in this message - clear them
      this.clearHighlights()
    }

    // show hovered card popup
    if (message.showPopup) {
      const entity = getTargetEntity(
        'direction' in message.showPopup
          ? message.showPopup.target
          : message.showPopup
      )
      if (entity) {
        const dir =
          'direction' in message.showPopup
            ? message.showPopup.direction
            : undefined
        ;(async () => {
          await waitForNextFrame()
          if (entity.has('isAnimating')) {
            await entity.get('isAnimating').finishedFull
          }
          if (entity.has('zone')) {
            await entity.get('zone').current.seat.animation?.finished
          }
          setHoveredCardAsync(entity, entity ? 0 : 500, dir, true)
        })()
      }
    }

    if (this.speechBubble) {
      removeFromParent(this.speechBubble)
    }

    let audioDuration = 0
    if (message.key && this.audioAssets.has(message.key)) {
      const audio = this.audioAssets.get(message.key)!
      this.currentAudio = audio

      switch (audio.state()) {
        case 'loading':
          await new Promise(resolve => {
            audio.on('load', resolve)
          })
          break

        case 'unloaded':
          // Reload unloaded audio
          audio.load()
          break
      }

      audio.once('end', () => {
        audio.unload()
        this.currentAudio = undefined
      })

      audioDuration = audio.duration() * 1000
      audio.play()
    }

    console.log(
      `%c${String.fromCodePoint(0x1f44b)} “${message.text}”`,
      'color: blue; font-style: italic;'
    )

    this.glow.visible = this.isShowingCube && isHelperCubeSource // Only show glow for Helper Bot message

    const speechBubbleTarget = message.position || Target.Home
    const pos = this.speechBubbleTargetHelper.get('transform').position

    await container.ready
    updateTargetPosition(speechBubbleTarget, pos)
    const pin = GamePinCushionComponent.getPin(this.speechBubbleTargetHelper)

    const animationCharactersPerSecond = 30
    if (message.source instanceof FieldTarget && store.state && store.secret) {
      const targetEntity = getCardCache().getEntity(
        message.source.getInstanceID(store.state, store.secret)
      )
      if (targetEntity) {
        world.getSystem(EmoteSystem).speakFromEntity(targetEntity, message.text)
      } else {
        this.speechBubble = await container.showSpeechBubble(
          message,
          pin,
          animationCharactersPerSecond
        )
      }
    } else {
      this.speechBubble = await container.showSpeechBubble(
        message,
        pin,
        animationCharactersPerSecond
      )
    }

    let defaultDuration = 3500

    const shouldPlayStandardLoop = message.sentiment !== 'happy'
    if (shouldPlayStandardLoop) {
      const loopDuration =
        (message.text.length * 1000) / animationCharactersPerSecond

      this.playSoundLoop = true

      delayPromise(loopDuration).then(() => {
        this.playSoundLoop = false
      })
      defaultDuration += loopDuration
    } else {
      playSound('audioFxTutorial', 'CubeVictory')
    }

    await new Promise<void>(resolve => {
      const listener = (v: Boolean) => {
        if (v) {
          stopListeningToProperty(this, 'skipCurrentMessage', listener)
          resolve()
        }
      }
      listenToProperty(this, 'skipCurrentMessage', listener)
      const finish = () => {
        stopListeningToProperty(this, 'skipCurrentMessage', listener)
        resolve()
      }

      if (typeof message.duration === 'number') {
        delayPromise(message.duration).then(finish)
      } else if (audioDuration) {
        delayPromise(audioDuration).then(finish)
      } else {
        delayPromise(defaultDuration).then(finish)
      }
    })

    // hide hovered card popup
    if (message.showPopup) {
      setHoveredCardAsync(undefined, 0.5, undefined, true)
    }

    this.glow.visible = false

    if (this.speechBubble) {
      await container.closeSpeechBubble(this.speechBubble)
    }
    if (shouldPlayStandardLoop) {
      this.playSoundLoop = false
    }
    GamePinCushionComponent.releasePin(this.speechBubbleTargetHelper)

    await new Promise<void>(resolve => {
      const listener = (v: Boolean) => {
        if (v) {
          stopListeningToProperty(this, 'skipCurrentMessage', listener)
          resolve()
        }
      }
      listenToProperty(this, 'skipCurrentMessage', listener)
      const finish = () => {
        stopListeningToProperty(this, 'skipCurrentMessage', listener)
        resolve()
      }
      if (typeof message.afterDelay === 'number') {
        delayPromise(message.afterDelay).then(finish)
      } else {
        finish()
      }
    })

    this.skipCurrentMessage = false

    if (this.messageQueue.length) {
      const message = this.messageQueue.shift()!
      setTimeout(() => {
        this.playMessage(message)
      }, 1)
    } else {
      // All messages have finished playing
      this.isPlayingMessage = false
      this.currentMessage = undefined

      if (this.finishedPlayingMessages) {
        this.finishedPlayingMessages.resolve()
        this.finishedPlayingMessages = undefined
      }

      setTimeout(() => {
        if (!this.isPlayingMessage) {
          this.animateHelperCubeToPosition(Target.Home)
        }
      }, 1000)
    }
  }

  startInactiveTimeout(
    turnCount: number,
    errorMessages: MessageStep[],
    highlights: BaseTarget[]
  ) {
    this.clearInactiveTimeout()

    // Check for inactive errors and highlights
    if (getTutorial().turnCount === turnCount) {
      if (errorMessages.length || highlights.length) {
        this.inactivePlayerTimeout = setTimeout(() => {
          if (getTutorial().turnCount === turnCount) {
            if (errorMessages.length) {
              errorMessages.forEach(this.handleMessage)
            }

            if (highlights.length) {
              this.setHighlights(highlights)
            }

            playSound('audioFxTutorial', 'CubeError')
          }
        }, INACTIVE_TIMEOUT)
      }
    }
  }

  fastForward() {
    if (this.isPlayingMessage) {
      this.skipCurrentMessage = true
    }
  }

  async playMessages(messages: MessageStep | MessageStep[]) {
    for (const message of asArray(messages)) {
      this.handleMessage(message)
    }
    await this.finishedPlayingMessages
  }

  clearInactiveTimeout() {
    if (this.inactivePlayerTimeout) {
      clearTimeout(this.inactivePlayerTimeout)
      this.inactivePlayerTimeout = undefined
    }
  }

  handleTutorialChange = async () => {
    const { step, stepIdx, turnCount } = getTutorial()

    if (step) {
      this.syncTutorial()
      switch (step.type) {
        case 'message':
          this.handleMessage(step)

          await this.finishedPlayingMessages

          // Move to next step if tutorial hasnt advanced
          if (
            turnCount === getTutorial().turnCount &&
            stepIdx === getTutorial().stepIdx
          ) {
            getTutorial().nextStep()
          }
          break
        case 'action':
          this.handleAction(step)
          break
      }
    }
  }

  handleCommitAction = async (ev: MessageTutorialChange) => {
    const { actionType, actionIdx, stepIdx } = ev

    // Play messages between current step and action step
    const messagesBetween = getTutorial()
      .steps.slice(getTutorial().stepIdx + 1, stepIdx)
      .filter(m => m.type === 'message') as MessageStep[]

    // Update tutorial step to the committed action step
    getTutorial().stepIdx = stepIdx

    await this.playMessages(messagesBetween)

    const { actionStep } = getTutorial()

    // Action committed
    const playerActionStep =
      actionType === 'scripted'
        ? getTutorial().actions[actionIdx]
        : getTutorial().conditions[actionIdx]

    if (playerActionStep) {
      if (actionType === 'scripted') {
        // Remove the playerActionStep
        getTutorial().actions.splice(actionIdx, 1)
      } else {
        const step = getTutorial().conditions.splice(actionIdx, 1)[0]!
        // remove all actions with the same conditionKey
        if (step.conditionKey) {
          const indexes = getTutorial().conditions.reduce<number[]>(
            (indexes, cond, i) => {
              if (cond.conditionKey === step.conditionKey) {
                indexes.push(i)
              }
              return indexes
            },
            []
          )
          while (indexes.length) {
            getTutorial().conditions.splice(indexes.pop()!, 1)
          }
        }
      }

      // Clear message queue
      this.messageQueue.length = 0

      // Clear highlights
      this.clearHighlights()

      // Clear inactivePlayerTimeout
      this.clearInactiveTimeout()

      // If action is played queue success messages
      let successMessages: MessageStep[] = []

      if (playerActionStep.options?.successMessage) {
        successMessages = asArray(playerActionStep.options.successMessage)
      }

      // Last action - should show succcess for entire step
      if (
        actionType === 'scripted' &&
        actionStep?.successMessage &&
        getTutorial().actions.length === 0
      ) {
        successMessages = asArray(actionStep.successMessage)
      }

      // Clear current playing message
      if (successMessages.length && this.isPlayingMessage) {
        // XXX this causes issues
        //this.isPlayingMessage = false
        //this.finishedPlayingMessages?.resolve()

        // Hide the glow
        this.glow.visible = false

        if (this.currentAudio) {
          this.currentAudio.fade(audioLevelCurve(sfxVolume.value), 0, 100)
        }

        if (this.speechBubble) {
          this.container.remove(this.speechBubble)
        }
      }

      for (const message of successMessages) {
        this.handleMessage(message)
      }

      await this.finishedPlayingMessages

      if (actionType === 'scripted') {
        if (getTutorial().hasRequiredActions()) {
          this.handleTutorialChange()
        } else {
          getTutorial().nextStep()
        }
      }
    } else {
      console.warn('Tutorial out of sync. could not find actionIdx')
    }
  }
  tutMessageCounter: number = 0
  handleMessage = (step: MessageStep) => {
    let skipMessage = false
    if (
      queryParams.skippedTutorialMessages &&
      this.tutMessageCounter < queryParams.skippedTutorialMessages
    ) {
      skipMessage = true
      this.tutMessageCounter += 1
    }
    if (!skipMessage) {
      if (this.isPlayingMessage || !this.isStarted) {
        this.messageQueue.push(step)
      } else {
        this.playMessage(step)
      }
    }
  }

  handleAction = async (step: ActionStep) => {
    const { turnCount, player, actions } = getTutorial()

    if (actions.length) {
      if (player === 0) {
        // Take the first action that specifies an error message or highlight
        // They all should have at least a highlight as the action helpers add these automatically
        const action = actions.filter(
          action =>
            !!action.options?.errorMessage || !!action.options?.highlight
        )[0]

        if (action) {
          let highlights: BaseTarget[] = []
          let errorMessages: MessageStep[] = []

          if (action.options?.highlight) {
            highlights = asArray(action.options.highlight)
          }

          if (action.options?.errorMessage) {
            errorMessages = asArray(action.options.errorMessage)
          } else if (step.errorMessage) {
            errorMessages = asArray(step.errorMessage)
          }

          // // Last action - should show error for entire step
          // if (this.tutorial.actions.length === 1 && step.errorMessage) {
          //   errorMessages = asArray(step.errorMessage)
          // }

          if (errorMessages.length) {
            // Add highlight to error messages
            if (highlights.length) {
              errorMessages.forEach(
                errorMessage => (errorMessage.highlight = highlights)
              )
            }
          }

          await this.finishedPlayingMessages

          if (!store.isGameOver) {
            this.startInactiveTimeout(turnCount, errorMessages, highlights)
          }
        }
      }
    }
  }
}

export default HelperCube
