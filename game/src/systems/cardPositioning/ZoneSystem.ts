import device from '@opensky/shared/device'
import { renderMetrics } from '@opensky/shared/renderMetrics'
import { getFromArrayWrapped } from '@opensky/shared/utils/arrayUtils'
import { getUrlFloat } from '@opensky/shared/utils/location'
import { clamp01, lerp } from '@opensky/shared/utils/math'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { isHero } from '@skyweaver/state-metadata'
import { Entity, EntityManager, System } from 'gg'
import { Camera, Euler, Quaternion, Scene, Vector2, Vector3 } from 'three'

import { Components } from '~/components'
import ArrowComponent from '~/components/ArrowComponent'
import BookmarkComponent from '~/components/BookmarkComponent'
import { Seat } from '~/components/CardZoneComponent'
import FlippedComponent from '~/components/FlippedComponent'
import InHandComponent from '~/components/InHandComponent'
import InspectingComponent from '~/components/InspectingComponent'
import IsRevealedComponent from '~/components/IsRevealedComponent'
import PlayerComponent from '~/components/PlayerComponent'
import TransformComponent from '~/components/TransformComponent'
import ZoneComponent from '~/components/ZoneComponent'
import {
  ARENA_ANGLE,
  DECK_SPACING,
  elementColors,
  USE_ALTERNATIVE_MOBILE_DECK_UI
} from '~/constants'
import { getDeck } from '~/factories/DeckFactory'
import { changeFoilContext } from '~/foils/foilHelpers'
import { foilContextFromStatus } from '~/foils/FoilKitTypeHelpers'
import { ArcHelper } from '~/helpers/ArcHelper'
import { startGraveyardElementalSoulsEffect } from '~/helpers/graveyardElementalSoulsEffect'
import { cameraParallaxHelper } from '~/helpers/parallaxHelpers'
import { ObjPosHelper, PositionHelper } from '~/helpers/PositionHelpers'
import worldPositionCacheManager from '~/helpers/worldPositionCacheManager'
import {
  miscCollections,
  ownedZoneCollections,
  zoneCollections
} from '~/helpers/zoneCollections'
import queryParams from '~/queryParams'
import {
  getDropTarget,
  matchDropTargetToTransform
} from '~/scenes/arena/dropTargetsLib'
import { actionHistorySidebarOpenWidthAnimated } from '~/scenes/ui/components/ActionHistorySidebar/actionHistorySidebarOpenWidth'
import {
  cameraHomePositionBlend,
  useTestGraveyardElementParticles
} from '~/tempDesignOptions'
import { CardStatus, OwnedCardStatus } from '~/types'
import {
  bigHandMode,
  heroCenterMode,
  scrollingCardSelection
} from '~/userSettings'
import {
  clipToWorld,
  get2DPositionAtDepth,
  getPixelOnGroundPlane
} from '~/utils/camera'
import { cameraShaker } from '~/utils/cameraShaker'
import { globalAccess, onGlobalUiAccessReady } from '~/utils/globalAccess'
import { NOOP } from '~/utils/jsUtils'
import { getQuatFromEuler, getTempQuatFromEuler } from '~/utils/threeMathUtils'
import {
  ReadonlyTrackableCollection,
  TrackableCollection
} from '~/utils/TrackableCollection'
import { cloneTransform, copyTransform } from '~/utils/transformUtils'

import { Easing } from '../animation/Easing'
import {
  animateTransformToTarget,
  TargetTransform
} from '../animation/transform'
import { getZoneAnimationComponent } from '../animation/zoneAnimationLib'
import {
  isThisSeatRelevant,
  isTransformAnimating,
  moveSeat
} from '../animation/zoneSeatUtils'
import inputProvider from '../input/input'
import UpdateManager from '../UpdateManager'
import DeckController from './DeckController'
import {
  autoManageCardBackFullness,
  autoManageFrontFacingVisibility,
  setFrontFacingVisibility
} from './ecsUtils'
import {
  opponentHeroAbilityHelper,
  playerHeroAbilityHelper
} from './heroAbilityPositionHelpers'
import ZoneSeatController, { sortSeatsByOrder } from './ZoneSeatController'

const HERO_ABILITY_PRESCALE = device.isMobile ? 0.85 : 1

const playerHeroAbilityUiPivotClipSpaceCoord = new Vector2()
const playerHeroAbilityStagingUiPivotClipSpaceCoord = new Vector2()
let playerHeroAbilityScale = HERO_ABILITY_PRESCALE
const opponentHeroAbilityUiPivotClipSpaceCoord = new Vector2()
let opponentHeroAbilityScale = HERO_ABILITY_PRESCALE
class ZoneManager {
  seatController: ZoneSeatController
  name: OwnedCardStatus
  constructor(
    public positionHelper: PositionHelper,
    public cardsInZone: ReadonlyTrackableCollection<Entity<Components>>,
    makeZoneSeatController: (
      cardsInZone: ReadonlyTrackableCollection<Entity<Components>>
    ) => ZoneSeatController
  ) {
    const seatController = makeZoneSeatController(cardsInZone)

    cardsInZone.listenForAdd(entity => {
      entity.getComponent('order')!.onChange = () => {
        seatController.requestSort()
        ZoneSystem.dirtyZones.add(this.name)
      }
    })
    cardsInZone.listenForRemove(entity => {
      if (entity.has('order')) {
        entity.getComponent('order')!.onChange = undefined
      }
    })

    this.seatController = seatController
    this.cardsInZone = cardsInZone
  }

  markAllEntitiesDirty() {
    for (const entity of this.cardsInZone.items) {
      this.seatController.markEntitySeatDirty(entity)
    }
    this.seatController.requestMovement()
    ZoneSystem.dirtyZones.add(this.name)
  }
}

const originPosHelper = new ObjPosHelper()
originPosHelper.position.y = -0.5

function generic() {
  return new ZoneManager(
    originPosHelper,
    miscCollections.generic,
    cards => new ZoneSeatController('generic', cards)
  )
}

function genericStayWhereYouAre() {
  return new ZoneManager(
    originPosHelper,
    miscCollections.genericStayWhereYouAre,
    cards =>
      new ZoneSeatController(
        'genericStayWhereYouAre',
        cards,
        undefined,
        seat => {
          return seat.entity.has('transform')
            ? seat.entity.get('transform')
            : seat
        }
      )
  )
}

function attachmentsZone(
  items: ReadonlyTrackableCollection<Entity<Components>>
) {
  return new ZoneManager(
    originPosHelper,
    items,
    cards =>
      new ZoneSeatController(
        'attachments',
        cards,
        undefined,
        seat => {
          if (
            seat.entity.has('attachedTo') &&
            seat.entity.get('attachedTo').entity.has('hostingAttachment')
          ) {
            seat.entity
              .get('attachedTo')
              .entity.get('hostingAttachment').transform = seat
          }

          return seat
        },
        NOOP
      )
  )
}
const __fakeMinCardsForFieldSpacing = heroCenterMode.value ? 7 : 6.5
const __angles = new Euler(0, 0, 0)
const __prescale = 0.9
const __unitScale = new Vector3(1, 1, 1).multiplyScalar(__prescale * 1.4)
const __heroScale = new Vector3(1, 1, 1).multiplyScalar(__prescale * 1.6)

class FieldZoneManager extends ZoneManager {
  private _seatCount = 0
  private _seatOffset = 0
  constructor(
    arcHelper: ArcHelper,
    items: ReadonlyTrackableCollection<Entity<Components>>
  ) {
    super(
      arcHelper,
      items,
      cards =>
        new ZoneSeatController(
          'field',
          cards,
          () => {
            this._seatCount = this.cardsInZone.items.length
            this._seatOffset = Math.max(
              0,
              (__fakeMinCardsForFieldSpacing - this._seatCount) * 0.5
            )
          },
          (seat, i) => {
            const ratio =
              (i + 0.5 + this._seatOffset) /
              Math.max(__fakeMinCardsForFieldSpacing, this._seatCount)
            const position = arcHelper.sample(ratio).clone()
            const cardIsHero = seat.entity.has('cardInstance')
              ? isHero(seat.entity.get('cardInstance'))
              : false
            if (cardIsHero) {
              position.y += 0.0075
            }
            setFrontFacingVisibility(seat.entity, true)
            const tiltToCamera = Math.PI * 0.3
            __angles.set(tiltToCamera, 0, 0)
            const quaternion = new Quaternion().setFromEuler(__angles)
            return {
              position,
              quaternion,
              scale: cardIsHero ? __heroScale : __unitScale
            }
          },
          (seat, target) => {
            moveSeat(seat, target, 1000)
          }
        )
    )
  }
}

class CenteredHeroFieldZoneManager extends ZoneManager {
  private _heroIndex: number = 0
  private _seatCount: number = 0
  constructor(
    arcHelper: ArcHelper,
    items: ReadonlyTrackableCollection<Entity<Components>>
  ) {
    super(
      arcHelper,
      items,
      cards =>
        new ZoneSeatController(
          'field',
          cards,
          () => {
            this._seatCount = this.cardsInZone.items.length
            this._heroIndex = this.seatController.seats.findIndex(s =>
              s.entity.has('hero')
            )
          },
          (seat, i) => {
            const unitsToLeftOfHero = this._heroIndex
            const unitsToRightOfHero = this._seatCount - this._heroIndex - 1

            const heroOffset =
              Math.max(0, unitsToLeftOfHero - 3) -
              Math.max(0, unitsToRightOfHero - 3)

            const oneUnitSize = 1 / __fakeMinCardsForFieldSpacing

            const offset =
              0.5 + (heroOffset + (i - this._heroIndex)) * oneUnitSize

            const position = arcHelper.sample(offset).clone()
            const cardIsHero = seat.entity.has('cardInstance')
              ? isHero(seat.entity.get('cardInstance'))
              : false
            if (cardIsHero) {
              position.y += 0.0075
            }
            setFrontFacingVisibility(seat.entity, true)
            const tiltToCamera = Math.PI * 0.3
            __angles.set(tiltToCamera, 0, 0)
            const quaternion = new Quaternion().setFromEuler(__angles)
            return {
              position,
              quaternion,
              scale: cardIsHero ? __heroScale : __unitScale
            }
          },
          (seat, target) => {
            moveSeat(seat, target, 1000)
          }
        )
    )
  }
}
const __scale = 0.245 * __prescale
const playerFieldHelper = new ArcHelper()
const opponentFieldHelper = new ArcHelper()
const __fanOutStrength = 0.2
const __overlapTilt = Math.PI * -0.05

const playerStagingHelper = new ObjPosHelper()
const opponentStagingHelper = new ObjPosHelper()
export const fakeMinCardsInHandForSpacing = 7

const playerHandHelper = new ArcHelper()
const opponentHandHelper = new ArcHelper()

const playerCardSelectionHelper = new ObjPosHelper()
const opponentCardSelectionHelper = new ObjPosHelper()

const draggingHelper = new ObjPosHelper()

type EnlargeState = 'normal' | 'optimistic' | 'optimistic_ready'
class HandZoneManager extends ZoneManager {
  private _seatCount = 0
  private _seatOffset = 0
  private _tiltToCamera = Math.PI * 0.25
  private _enlargeState: EnlargeState = 'normal'

  set isEnlarged(val: EnlargeState) {
    this._enlargeState = val
    this.markAllEntitiesDirty()
  }
  constructor(
    public helper: ArcHelper,
    items: ReadonlyTrackableCollection<Entity<Components>>,
    inspectedHandCards: ReadonlyTrackableCollection<Entity<Components>>,
    revealedHandCards: ReadonlyTrackableCollection<Entity<Components>>,
    unrevealedHandCards: ReadonlyTrackableCollection<Entity<Components>>,
    isOpponentHand: boolean
  ) {
    super(helper, items, cards => {
      cards.listenForRemove(e => e.remove('inHand'))
      return new ZoneSeatController(
        'hand',
        cards,
        () => {
          this._seatCount = this.cardsInZone.items.length
          this._seatOffset = Math.max(
            0,
            (fakeMinCardsInHandForSpacing - this._seatCount) * 0.5
          )
        },
        (seat, i) => {
          const ratio =
            (i + 0.5 + this._seatOffset) /
            Math.max(fakeMinCardsInHandForSpacing, this._seatCount)
          const position = helper.sample(ratio).clone()
          const scale = helper.scale.clone()
          const fanOut = Math.PI * (__fanOutStrength * -(ratio - 0.5))
          const isRevealed = seat.entity.has('isRevealed')

          const tiltDirection = isRevealed ? 1 : -1

          const angles = isOpponentHand
            ? new Euler(
                this._tiltToCamera,
                (bigHandMode.value ? fanOut * 0.25 : fanOut) * -tiltDirection +
                  Math.PI,
                __overlapTilt * tiltDirection
              )
            : new Euler(
                this._tiltToCamera,
                bigHandMode.value ? fanOut * 0.25 : fanOut,
                __overlapTilt
              )

          const hasInstance = seat.entity.has('cardInstance')
          autoManageFrontFacingVisibility(
            seat.entity,
            hasInstance || isRevealed,
            1000,
            ent => unrevealedHandCards.items.includes(ent)
          )

          autoManageCardBackFullness(seat.entity, true, true, 1000, ent =>
            this.cardsInZone.items.includes(ent)
          )

          if (isOpponentHand) {
            // Flip cards in opponent's hand backwards, but upside-down
            angles.x += Math.PI * 1.25
            if (isRevealed) {
              // And flip them back, but still upside down, if they're revealed
              angles.x += Math.PI
            }
          } else if (!hasInstance) {
            angles.z += Math.PI
          }

          const quaternion = new Quaternion().setFromEuler(angles)
          if (
            seat.entity.has('inspecting') &&
            this._enlargeState === 'normal'
          ) {
            position.add(new Vector3(0, 0, -0.015).applyQuaternion(quaternion))
          }

          if (this._enlargeState === 'optimistic_ready') {
            position.z *= 1.3
            position.y += 0.14
          } else if (this._enlargeState === 'optimistic') {
            position.z *= 1.2
            position.y += 0.07
          }
          if (device.isMobile) {
            position.z -= 0.0026
          }

          if (isOpponentHand && !isRevealed) {
            scale.y *= 0.05
          }
          return {
            position,
            quaternion,
            scale
          }
        },
        (seat, transform) => {
          moveSeat(seat, transform)

          // We defer adding the InHand component until the card reaches the hand visually
          // to prevent the attachments from snapping to their in-hand position early
          const card = seat.entity
          if (card.has('isAnimating')) {
            card.get('isAnimating').finishedFull.then(() => {
              if (cards.items.includes(card)) {
                card.toggle(InHandComponent, true)
              }
            })
          } else {
            if (cards.items.includes(card)) {
              card.toggle(InHandComponent, true)
            }
          }
        }
      )
    })

    if (isOpponentHand) {
      this._tiltToCamera -= Math.PI * 0.2
    }

    const makeCardDirty = (entity: Entity<Components>) => {
      this.seatController.markEntitySeatDirty(entity)
      this.seatController.requestMovement()
      ZoneSystem.dirtyZones.add(this.name)
    }

    inspectedHandCards.listenForAdd(makeCardDirty)
    inspectedHandCards.listenForRemove(makeCardDirty)

    revealedHandCards.listenForAdd(makeCardDirty)
    revealedHandCards.listenForRemove(makeCardDirty)
  }
}

class StagingZoneManager extends ZoneManager {
  constructor(
    helper: ObjPosHelper,
    items: ReadonlyTrackableCollection<Entity<Components>>
  ) {
    super(
      helper,
      items,
      cards =>
        new ZoneSeatController(
          'staging',
          cards,
          undefined,
          () => helper,
          (seat, transform) => {
            setFrontFacingVisibility(seat.entity, true)
            moveSeat(seat, transform, 200)
          }
        )
    )
  }
}

const __rewardScale = getUrlFloat('rewardScale', 1, 0.1, 1)
const __rewardHeroScale = getUrlFloat('rewardScale', 0.7, 0.1, 1)
const __fakeMinCardsForRewardSpacing = 4
class HeroRewardsZoneManager extends ZoneManager {
  private _count = 0
  private _offset = 0
  constructor(
    helper: ObjPosHelper,
    items: ReadonlyTrackableCollection<Entity<Components>>
  ) {
    super(
      helper,
      items,
      cards =>
        new ZoneSeatController(
          'heroRewards',
          cards,
          () => {
            this._count = this.seatController.seats.length
            this._offset = Math.max(
              0,
              (__fakeMinCardsForRewardSpacing - this._count) * 0.5
            )
          },
          (seat, i) => {
            const ratio =
              (i + 0.5 + this._offset) /
              Math.max(__fakeMinCardsForRewardSpacing, this._count)
            const centeredRatio = -(ratio - 0.5)
            const __vec3 = new Vector3(
              0,
              device.isMobile ? -0.25 : -0.08,
              0.943
            ).unproject(cameraShaker.camera)
            const position =
              this._count > 4
                ? new Vector3(centeredRatio * 0.21, 0, __flipCS(i) * 0.038)
                : __vec3
            __vec3.x += centeredRatio * -0.35

            // position
            //   .multiplyScalar(__rewardScale)
            //   .applyMatrix4(helper.matrixWorld)

            const angleStrength = lerp(
              1.5,
              0,
              Math.min(1, Math.max(0, this._count - 2) / 6)
            )
            const quaternion = getTempQuatFromEuler(
              Math.PI / 4 + 0.2,
              centeredRatio * angleStrength,
              0
            ).clone()
            // const quaternion = helper.quaternion
            //   .clone()
            //   .premultiply(
            //     getTempQuatFromEuler(
            //       Math.PI / 2,
            //       centeredRatio * angleStrength ,
            //       Math.PI
            //     )
            //   )
            // if (seat.entity.has('flipped')) {
            //   quaternion.multiply(getTempQuatFromEuler(0, 0, Math.PI))
            // }

            return {
              position,
              quaternion,
              scale: helper.scale.clone().multiplyScalar(__rewardHeroScale)
            }
          },
          (seat, target) => {
            moveSeat(seat, target)
          }
        )
    )
  }
}
const __tempVec = new Vector3()
class HeroAbilityZoneManager extends ZoneManager {
  constructor(
    public helper: ObjPosHelper,
    items: ReadonlyTrackableCollection<Entity<Components>>,
    private _offsetUp = 0
  ) {
    super(helper, items, cards => {
      cards.listenForRemove(e => e.remove('inHand'))
      return new ZoneSeatController(
        'heroAbility',
        cards,
        NOOP,
        (seat, i) => {
          const position = new Vector3(0, DECK_SPACING * 3 * i, 0).applyMatrix4(
            helper.matrixWorld
          )
          const quaternion = helper.quaternion.clone()
          quaternion.multiply(__flipX)
          const scale = helper.scale.clone()
          __tempVec
            .set(0, 0, this._offsetUp)
            .applyQuaternion(quaternion)
            .multiply(scale)
          position.add(__tempVec)
          const isRevealed = seat.entity.has('isRevealed')

          const hasInstance = seat.entity.has('cardInstance')
          autoManageFrontFacingVisibility(
            seat.entity,
            hasInstance || isRevealed,
            1000,
            _ent => true
          )

          autoManageCardBackFullness(seat.entity, true, true, 1000, ent =>
            this.cardsInZone.items.includes(ent)
          )

          return {
            position,
            quaternion,
            scale
          }
        },
        (seat, transform) => {
          moveSeat(seat, transform, 0)

          // We defer adding the InHand component until the card reaches the hand visually
          // to prevent the attachments from snapping to their in-hand position early
          const card = seat.entity
          if (card.has('isAnimating')) {
            card.get('isAnimating').finishedFull.then(() => {
              if (cards.items.includes(card)) {
                card.toggle(InHandComponent, true)
              }
            })
          } else {
            if (cards.items.includes(card)) {
              card.toggle(InHandComponent, true)
            }
          }
        }
      )
    })
  }
}
class DualPrismHeroRewardsZoneManager extends ZoneManager {
  private _count = 0
  private _offset = 0
  constructor(
    helper: ObjPosHelper,
    items: ReadonlyTrackableCollection<Entity<Components>>
  ) {
    super(
      helper,
      items,
      cards =>
        new ZoneSeatController(
          'heroRewards',
          cards,
          () => {
            this._count = this.seatController.seats.length
            this._offset = Math.max(
              0,
              (__fakeMinCardsForRewardSpacing - this._count) * 0.5
            )
          },
          (seat, i) => {
            const ratio =
              (i + 0.5 + this._offset) /
              Math.max(__fakeMinCardsForRewardSpacing, this._count)
            const centeredRatio = -(ratio - 0.5)
            const __vec3 = new Vector3(
              0,
              device.isMobile ? -0.25 : -0.08,
              0.945
            ).unproject(cameraShaker.camera)
            const orderXOffset = 0.06
            const position =
              this._count > 4
                ? new Vector3(centeredRatio * 0.21, 0, __flipCS(i) * 0.038)
                : __vec3
            __vec3.x += -0.06 + orderXOffset * i
            __vec3.y += 0.01 * __flipCS(i)
            __vec3.z += 0.01 * __flipCS(i)
            // position
            //   .multiplyScalar(__rewardScale)
            //   .applyMatrix4(helper.matrixWorld)

            const angleStrength = lerp(
              1.5,
              0,
              Math.min(1, Math.max(0, this._count - 2) / 6)
            )

            const quaternion = getTempQuatFromEuler(
              Math.PI / 4 + 0.1,
              centeredRatio * angleStrength * 0.5,
              0
            ).clone()

            return {
              position,
              quaternion,
              scale: helper.scale.clone().multiplyScalar(__rewardHeroScale)
            }
          },
          (seat, target) => {
            moveSeat(seat, target)
          }
        )
    )
  }
}
class ConquestRewardsZoneManager extends ZoneManager {
  private _count = 0
  private _offset = 0
  constructor(
    helper: ObjPosHelper,
    items: ReadonlyTrackableCollection<Entity<Components>>,
    xSpacing = 0.25
  ) {
    super(
      helper,
      items,
      cards =>
        new ZoneSeatController(
          'conquestRewards',
          cards,
          () => {
            this._count = this.seatController.seats.length
            this._offset = Math.max(
              0,
              (__fakeMinCardsForRewardSpacing - this._count) * 0.5
            )
          },
          (seat, i) => {
            const ratio =
              (i + 0.5 + this._offset) /
              Math.max(__fakeMinCardsForRewardSpacing, this._count)
            const centeredRatio = -(ratio - 0.5)
            const position =
              this._count > 4
                ? new Vector3(centeredRatio * 0.21, 0, __flipCS(i) * 0.038)
                : new Vector3(
                    centeredRatio * xSpacing,
                    centeredRatio * 0.05,
                    centeredRatio * -0.04
                  )

            position
              .multiplyScalar(__rewardScale)
              .applyMatrix4(helper.matrixWorld)

            const angleStrength = lerp(
              1.5,
              0,
              Math.min(1, Math.max(0, this._count - 2) / 6)
            )

            const quaternion = helper.quaternion
              .clone()
              .premultiply(
                getTempQuatFromEuler(
                  0.2,
                  centeredRatio * angleStrength,
                  centeredRatio * angleStrength,
                  'XYZ'
                )
              )
            if (seat.entity.has('flipped')) {
              quaternion.multiply(getTempQuatFromEuler(0, 0, Math.PI))
            }

            return {
              position,
              quaternion,
              scale: helper.scale.clone().multiplyScalar(__rewardScale)
            }
          },
          (seat, target) => {
            moveSeat(seat, target)
          }
        )
    )
    FlippedComponent.entities.listenForAdd(e => {
      this.seatController.markEntitySeatDirty(e)
      ZoneSystem.dirtyZones.add(this.name)
    })
  }
}

class ConquestPotentialRewardsZoneManager extends ConquestRewardsZoneManager {
  constructor(
    helper: ObjPosHelper,
    items: ReadonlyTrackableCollection<Entity<Components>>
  ) {
    super(helper, items, 0.1)
  }
}

class DisabledRewardsZoneManager extends ZoneManager {
  constructor(
    helper: ObjPosHelper,
    items: ReadonlyTrackableCollection<Entity<Components>>
  ) {
    super(
      helper,
      items,
      cards =>
        new ZoneSeatController(
          'disabledRewards',
          cards,
          undefined,
          () => helper,
          (seat, target) => {
            moveSeat(seat, target)
          }
        )
    )
  }
}

class RewardsZoneManager extends ZoneManager {
  private _count = 0
  private _offset = 0
  constructor(
    helper: ObjPosHelper,
    items: ReadonlyTrackableCollection<Entity<Components>>
  ) {
    super(
      helper,
      items,
      cards =>
        new ZoneSeatController(
          'rewards',
          cards,
          () => {
            this._count = this.seatController.seats.length
            this._offset = Math.max(
              0,
              (__fakeMinCardsForRewardSpacing - this._count) * 0.5
            )
          },
          (seat, i) => {
            const ratio =
              1 -
              (i + 0.5 + this._offset) /
                Math.max(__fakeMinCardsForRewardSpacing, this._count)
            const centeredRatio = -(ratio - 0.5)
            const defaultVec = new Vector3(-centeredRatio * 0.24, 0.025, 0.004)

            const seatVecs = [
              defaultVec,
              defaultVec
                .clone()
                .add(
                  new Vector3(centeredRatio * 0.04, -0.003 * __flipCS(i), 0)
                ),
              defaultVec
                .clone()
                .add(
                  new Vector3(centeredRatio * 0.04, 0, -0.003 * __flipCS(i))
                ),
              defaultVec
                .clone()
                .add(
                  new Vector3(centeredRatio * 0.0, 0, -0.003 * __flipEnds(i, 4))
                ),
              new Vector3(-centeredRatio * 0.14, 0, 0.016 + __flipCS(i) * 0.04),
              new Vector3((ratio - 0.5) * 0.17, 0, 0.016 + __flipCS(i) * 0.038)
            ]

            // const position =
            //   this._count > 4
            //     ? new Vector3((ratio - 0.5) * 0.21, 0, __flipCS(i) * 0.038)
            //     : seatVecs[items.length - 1].clone()
            if (this._count === 5 || this._count === 6) {
              helper.scale.setScalar(device.isMobile ? 0.87 : 1)
              helper.updateMatrixWorld()
            } else {
              helper.scale.setScalar(
                device.isMobile ? (this._count === 4 ? 1.28 : 1.35) : 1.4
              )
              helper.updateMatrixWorld()
            }
            const position = seatVecs[this._count - 1].clone()
            position.applyMatrix4(helper.matrixWorld)
            const angleStrength = lerp(
              1.5,
              0,
              Math.min(1, Math.max(0, this._count - 2) / 6)
            )
            const tilt =
              this._count === 5 || this._count === 6
                ? 0
                : -centeredRatio * angleStrength
            const quaternion = helper.quaternion
              .clone()
              .premultiply(getTempQuatFromEuler(0, tilt, 0))
            quaternion.multiply(getTempQuatFromEuler(-0.0, -0.0, 0))
            if (seat.entity.has('flipped')) {
              quaternion.multiply(getTempQuatFromEuler(0, 0, Math.PI))
            }

            return {
              position,
              quaternion,
              scale: helper.scale
            }
          },
          (seat, target) => {
            moveSeat(seat, target)
          }
        )
    )
    FlippedComponent.entities.listenForAdd(e => {
      this.seatController.markEntitySeatDirty(e)
      ZoneSystem.dirtyZones.add(this.name)
    })
  }
}

const __flipX = getQuatFromEuler(Math.PI, 0, 0)
const __flipY = getQuatFromEuler(0, Math.PI, 0)
const __flipZ = getQuatFromEuler(0, 0, Math.PI)

class CastingZoneManager extends ZoneManager {
  constructor(
    helper: ObjPosHelper,
    items: ReadonlyTrackableCollection<Entity<Components>>
  ) {
    super(
      helper,
      items,
      cards =>
        new ZoneSeatController(
          'casting',
          cards,
          undefined,
          (seat, i) => {
            // If you play a single unit & there's nothing else in the stack, keep it where it is
            // Comment/Fix this when we add units with choose effects, since they need to go to casting zone
            const entity = seat.entity
            if (
              i === 0 &&
              cards.length === 1 &&
              entity.has('transform') &&
              entity.has('cardInstance') &&
              entity.get('cardInstance').state.view.type === 'unit'
            ) {
              return cloneTransform(entity.get('transform'))
            }
            const position = new Vector3(
              0,
              DECK_SPACING * 3 * i,
              0
            ).applyMatrix4(helper.matrixWorld)
            const quaternion = helper.quaternion.clone()
            quaternion.multiply(__flipX)

            setFrontFacingVisibility(seat.entity, true)

            return {
              position,
              quaternion,
              scale: helper.scale
            }
          },
          (seat, transform) => {
            moveSeat(seat, transform, 500)
          },
          (a, b) => {
            const aIsActuallyCasting =
              a.entity.get('zone').stateZone === 'Casting'
            const bIsActuallyCasting =
              b.entity.get('zone').stateZone === 'Casting'
            return (
              (aIsActuallyCasting ? -1 : 1) * a.entity.get('order') -
              (bIsActuallyCasting ? -1 : 1) * b.entity.get('order')
            )
          }
        )
    )
  }
}

class ConjuringZoneManager extends ZoneManager {
  private _seatCount: number
  private _seatOffset: number
  constructor(
    arcHelper: ArcHelper,
    items: ReadonlyTrackableCollection<Entity<Components>>
  ) {
    super(
      arcHelper,
      items,
      cards =>
        new ZoneSeatController(
          'conjuring',
          cards,
          () => {
            this._seatCount = this.cardsInZone.items.length
            this._seatOffset = Math.max(
              0,
              (__fakeMinCardsForFieldSpacing - this._seatCount) * 0.5
            )
          },
          (seat, i) => {
            if (seat.entity.has('specialConjure')) {
              return seat.entity.get('transform')
            }

            const ratio =
              (i + 0.5 + this._seatOffset) /
              Math.max(__fakeMinCardsForFieldSpacing, this._seatCount)
            const position = arcHelper.sample(ratio).clone()

            const tiltToCamera = Math.PI * 0.3
            __angles.set(tiltToCamera, 0, 0)
            const quaternion = new Quaternion().setFromEuler(__angles)
            position.z += (i / __fakeMinCardsForFieldSpacing) * -0.02
            const facesForwards = seat.entity.has('cardInstance')
            setFrontFacingVisibility(seat.entity, facesForwards)
            if (!facesForwards) {
              // position.y += 0.01
              // position.z -= 0.03
              position.z -= 0.0005
              quaternion.multiply(__flipZ)
            }
            return {
              position,
              quaternion,
              scale: __unitScale
            }
          },
          (seat, transform) => {
            moveSeat(seat, transform, 500)
          }
        )
    )
  }
}

class DraftingZoneManager extends ZoneManager {
  constructor(
    arcHelper: ArcHelper,
    items: ReadonlyTrackableCollection<Entity<Components>>
  ) {
    super(
      arcHelper,
      items,
      cards =>
        new ZoneSeatController(
          'drafting',
          cards,
          () => {
            //
          },
          () => {
            return arcHelper
            //
          },
          () => {
            //
          }
        )
    )
  }
}

class DeckZoneManager extends ZoneManager {
  entity: Entity<Components>
  constructor(
    cardStatus: CardStatus,
    items: ReadonlyTrackableCollection<Entity<Components>>,
    owner: 'Player' | 'Opponent',
    faceUp: boolean
  ) {
    const { transformObj: helper, entity } = getDeck(cardStatus, owner)

    if (faceUp && useTestGraveyardElementParticles.value) {
      const emitterLineShapeAssembly = startGraveyardElementalSoulsEffect(
        helper,
        (i, color) => {
          const ent = getFromArrayWrapped(items.items, i)
          if (items.items.length > 0 && ent.has('cardInstance')) {
            const element = ent.get('cardInstance').state.view.element
            // color.setHSL(Math.random() * 0.2, 1, 0.7)
            color.copy(elementColors[element])
          }
        }
      )
      function updateFlowRate() {
        for (const assembly of emitterLineShapeAssembly.assemblies) {
          for (const emitter of assembly.boundEmitters) {
            emitter.particlesPerMeter = clamp01(items.length / 10)
          }
        }
      }
      items.listenForChange(updateFlowRate)
      updateFlowRate()
    }

    const makeSeatTransform = (seat: Seat, i: number) => {
      const groundLine = Math.max(0, this.cardsInZone.items.length - 8)
      const iGrounded = i - groundLine

      const position = new Vector3(
        0,
        DECK_SPACING * -iGrounded,
        0
      ).applyMatrix4(helper.matrixWorld)
      const quaternion = helper.quaternion.clone()
      if (faceUp) {
        quaternion.multiply(__flipX)
      } else {
        quaternion.multiply(__flipY)
      }

      const showFront =
        cardStatus === 'Graveyard' && this.seatController.isLastSeat(seat)
      autoManageFrontFacingVisibility(
        seat.entity,
        showFront,
        1000,
        cardStatus === 'Graveyard'
          ? ent =>
              this.cardsInZone.items.includes(ent) &&
              !this.seatController.isLastSeat(seat)
          : ent => this.cardsInZone.items.includes(ent)
      )

      const shouldHaveFullness =
        cardStatus === 'Deck' && this.seatController.isLastSeat(seat)

      autoManageCardBackFullness(
        seat.entity,
        shouldHaveFullness,
        false,
        1000,
        cardStatus === 'Deck'
          ? ent =>
              this.cardsInZone.items.includes(ent) &&
              !this.seatController.isLastSeat(seat)
          : ent => this.cardsInZone.items.includes(ent)
      )

      return {
        position,
        quaternion,
        scale: helper.scale.clone()
      }
    }
    super(
      helper,
      items,
      cards =>
        new ZoneSeatController(
          owner + ' ' + cardStatus,
          cards,
          undefined,
          makeSeatTransform,
          (seat, transform) => {
            moveSeat(seat, transform, 200)
          },
          faceUp ? sortSeatsByOrder : sortSeatsByOrder
        )
    )
    new DeckController(this.cardsInZone, this.seatController, entity)
    if (cardStatus === 'Deck') {
      this.cardsInZone.listenForRemove(item => {
        if (!item.has('zone')) {
          return
        }
        const prevSeat = item.get('zone').previous.seat
        copyTransform(
          prevSeat,
          makeSeatTransform(prevSeat, this.cardsInZone.length - 1)
        )
      })
    }
  }
}

const __flippedQuat = getQuatFromEuler(Math.PI, Math.PI, Math.PI)
const __unflippedQuat = getQuatFromEuler(0, 0, Math.PI)
const __fakeMinCardsForCardSelectionSpacing = 4
function __flipCS(v: number) {
  return v % 2 === 0 ? -1 : 1
}
function __flipEnds(v: number, l: number) {
  return v === 0 || v === l - 1 ? -1 : 1
}

const s = 0.8
const __draggingScale = new Vector3(s, s, s)
const __draggedWorldPositionDelta = new Vector3()
const __faceUp = getQuatFromEuler(0.25 * Math.PI, 0, 0)
const DRAG_HEIGHT = 0.18
const DRAG_HEIGHT_ARROW_OFFSET = 0.02
const DRAG_HEIGHT_ARROW_MAX = 0.1
const __lerpRate = 0.15
const __idealFrameDuration = 1 / 60

class DraggingZoneManager extends ZoneManager {
  private _dragPosition = new Vector2()
  private _cameraWorldPos: Vector3
  private _camera: Camera
  initInput(camera: Camera) {
    if (this._camera) {
      console.error('already inited')
      return
    }
    this._camera = camera
    this._cameraWorldPos = worldPositionCacheManager.register(this._camera)
    const dragUpdater = {
      update: (dt: number) => {
        __draggedWorldPositionDelta.copy(this._draggedWorldPosition)

        if (ArrowComponent.entities.items.length > 0) {
          let eHeight = 0.05
          const e = ArrowComponent.entities.items[0]
          if (e.has('transform')) {
            eHeight = e.get('transform').position.y
          }
          this._draggedWorldPosition.copy(
            this._getPixelOnGroundPlane(
              this._dragPosition.x,
              this._dragPosition.y,
              Math.min(
                eHeight + DRAG_HEIGHT_ARROW_OFFSET,
                DRAG_HEIGHT_ARROW_MAX
              )
            )
          )
        } else {
          this._draggedWorldPosition.copy(
            this._getPixelOnGroundPlane(
              this._dragPosition.x,
              Easing.Custom.AvoidEdges(
                this._dragPosition.y / renderMetrics.height
              ) * renderMetrics.height,
              DRAG_HEIGHT
            )
          )
        }
        __draggedWorldPositionDelta
          .sub(this._draggedWorldPosition)
          .multiplyScalar(-20)
        const lerpAmt = 1 - Math.pow(1 - __lerpRate, dt / __idealFrameDuration)
        this._dampenedDelta
          .add(__draggedWorldPositionDelta)
          .clampLength(0, 0.5)
          .multiplyScalar(1 - lerpAmt)

        this._dragEuler.x = this._dampenedDelta.z
        this._dragEuler.z = -this._dampenedDelta.x
        if (ArrowComponent.entities.items.length > 0) {
          for (const arrowEnt of ArrowComponent.entities.items) {
            arrowEnt.get('arrow').position.copy(this._draggedWorldPosition)
          }
        }

        if (this.cardsInZone.items.length > 0) {
          this.seatController.forAllSeats(seat => (seat.needsToMove = true))
          this.seatController.requestMovement()
          ZoneSystem.dirtyZones.add(this.name)
        }
      }
    }
    const dragListener = (x: number, y: number) => {
      this._dragPosition.set(x, y)
    }
    let draggingActive = false
    inputProvider.onMove.addListener(dragListener)
    this.cardsInZone.listenForAdd(ent => {
      setFrontFacingVisibility(ent, true)
    })
    this.entitiesThatNeedDragging.listenForAdd(() => {
      if (this.entitiesThatNeedDragging.length > 0 && !draggingActive) {
        draggingActive = true
        UpdateManager.register(dragUpdater)
      }
      dragUpdater.update(1)
    })
    this.entitiesThatNeedDragging.listenForRemove(() => {
      if (this.entitiesThatNeedDragging.length === 0 && draggingActive) {
        draggingActive = false
        UpdateManager.unregister(dragUpdater)
      }
    })
  }
  private _getPixelOnGroundPlane(x: number, y: number, depth: number = 0) {
    return getPixelOnGroundPlane(
      this._camera,
      this._cameraWorldPos,
      x,
      y,
      depth
    )
  }

  private _draggedWorldPosition = new Vector3()
  private _dragEuler = new Euler(0, 0, 0, 'ZXY')
  private _dampenedDelta = new Vector3()
  constructor(
    items: ReadonlyTrackableCollection<Entity<Components>>,
    private entitiesThatNeedDragging: ReadonlyTrackableCollection<
      Entity<Components>
    >
  ) {
    super(
      new ObjPosHelper(),
      items,
      cards =>
        new ZoneSeatController(
          'dragging',
          cards,
          undefined,
          seat => {
            if (!seat.entity.has('dragging')) {
              return
            }
            const entity = seat.entity
            const dragging = entity.get('dragging')

            const position = this._draggedWorldPosition.clone()
            position.sub(dragging.dragOffset)

            return {
              position,
              quaternion: new Quaternion()
                .setFromEuler(this._dragEuler)
                .premultiply(__faceUp),
              scale: __draggingScale
            }
          },
          (seat, transform) => {
            copyTransform(seat, transform)
            if (!seat.entity.has('isAnimating')) {
              copyTransform(seat.entity.get('transform'), seat)
            }
          }
        )
    )
  }
}

const cardSelectionTransforms: TargetTransform[] = []
class CardSelectionZoneManager extends ZoneManager {
  private _seatCount = 0
  private _seatOffset = 0
  private _flipped = false
  transforms: TargetTransform[] = []
  get flipped() {
    return this._flipped
  }
  set flipped(value) {
    this._flipped = value
    this.seatController.forAllSeats(seat => {
      setFrontFacingVisibility(seat.entity, true)
      seat.needsToMove = true
    })
    this.seatController.requestMovement()
    ZoneSystem.dirtyZones.add(this.name)
  }
  constructor(
    helper: ObjPosHelper,
    items: ReadonlyTrackableCollection<Entity<Components>>,
    isOpponent = false
  ) {
    super(
      helper,
      items,
      cards =>
        new ZoneSeatController(
          'card selection',
          cards,
          () => {
            this._seatCount = this.seatController.seats.length
            this._seatOffset = Math.max(
              0,
              (__fakeMinCardsForCardSelectionSpacing - this._seatCount) * 0.5
            )
          },
          (seat, i) => {
            if (this._seatCount === 2 && !isOpponent) {
              const ratio =
                (i + 0.5 + this._seatOffset) /
                Math.max(__fakeMinCardsForCardSelectionSpacing, this._seatCount)
              const position = new Vector3(
                (ratio - 0.5) * 0.58,
                seat.entity.has('bookmark') ? 0.05 : 0.025,
                0
              )
              position.applyMatrix4(helper.matrixWorld)

              const quaternion = helper.quaternion.clone()
              quaternion.multiply(
                this._flipped ? __flippedQuat : __unflippedQuat
              )
              setFrontFacingVisibility(seat.entity, !isOpponent && this.flipped)

              return {
                position,
                quaternion,
                scale: helper.scale
              }
            }
            if (isOpponent || !scrollingCardSelection.value) {
              const ratio =
                (i + 0.5 + this._seatOffset) /
                Math.max(__fakeMinCardsForCardSelectionSpacing, this._seatCount)
              const position =
                this._seatCount > 4
                  ? new Vector3(
                      (ratio - 0.5) * 0.21,
                      (seat.entity.has('bookmark') ? 0.025 : 0) +
                        __flipCS(i + 1) * 0.00025,
                      __flipCS(i) * 0.038 + 0.005
                    )
                  : new Vector3(
                      (ratio - 0.5) * 0.24,
                      seat.entity.has('bookmark') ? 0.05 : 0.025,
                      0
                    )
              position.applyMatrix4(helper.matrixWorld)

              const quaternion = helper.quaternion.clone()
              quaternion.multiply(
                this._flipped ? __flippedQuat : __unflippedQuat
              )
              setFrontFacingVisibility(seat.entity, !isOpponent && this.flipped)

              return {
                position,
                quaternion,
                scale: helper.scale
              }
            }
            if (cardSelectionTransforms.length <= i) {
              cardSelectionTransforms.push({
                position: new Vector3(),
                quaternion: new Quaternion(),
                scale: new Vector3()
              })
            }

            const transform = cardSelectionTransforms[i]
            const container = globalAccess.ui?.getContainer('cardSelection')
            if (!container?.active) {
              transform.position.set(0, 0, -99999)
              return transform
            }
            const scrollviewItem = container.scrollView?.items?.[i]
            if (!scrollviewItem) {
              return
            }
            transform.position.copy(
              get2DPositionAtDepth(
                cameraShaker.camera,
                cameraShaker.cameraWorldPos,
                scrollviewItem.matrixWorld.clipSpacePosX +
                  scrollviewItem.matrixWorld.clipSpaceSizeX / 2,
                scrollviewItem.matrixWorld.clipSpacePosY -
                  scrollviewItem.matrixWorld.clipSpaceSizeY / 2,
                0.23
              )
            )

            const quaternion = transform.quaternion.copy(helper.quaternion)
            quaternion.multiply(__flippedQuat)

            transform.scale.copy(helper.scale).multiplyScalar(1.2)

            return transform
          },
          (seat, target) => {
            if (scrollingCardSelection.value) {
              return moveSeat(seat, target)
            }
            if (!target) {
              return
            }
            const entTransform = seat.entity.get('transform')
            if (seat.isNew) {
              copyTransform(seat, target)
            }
            seat.animation = animateTransformToTarget(
              seat,
              target,
              seat.isNew ? 0 : 200,
              Easing.Cubic.Out,
              () => {
                if (
                  !isTransformAnimating(seat.entity) &&
                  isThisSeatRelevant(seat.entity, seat)
                ) {
                  copyTransform(entTransform, seat)
                }
              }
            )
            seat.isNew = false
          },
          sortSeatsByOrder
        )
    )
    const onBookmarkChange = (entity: Entity<Components>) => {
      if (this.cardsInZone.items.includes(entity)) {
        this.seatController.markEntitySeatDirty(entity)
        this.seatController.requestMovement()
        ZoneSystem.dirtyZones.add(this.name)
      }
    }

    BookmarkComponent.entities.listenForAdd(onBookmarkChange)
    BookmarkComponent.entities.listenForRemove(onBookmarkChange)
  }
}

const disabledRewardsHelper = new ObjPosHelper()
const conquestRewardsHelper = new ObjPosHelper()
const playerHeroAbilityStagingHelper = new ObjPosHelper()
const opponentHeroAbilityStagingHelper = new ObjPosHelper()
const rewardsHelper = new ObjPosHelper()
const playerCastingAreaHelper = new ObjPosHelper()
const opponentCastingAreaHelper = new ObjPosHelper()

const sharedConjuringHelper = new ArcHelper()

const __entitiesThatNeedAnimations: Entity<Components>[] = []

const conjuringZoneEntities = TransformComponent.entities.intersect(
  zoneCollections.Conjuring
)
const draftingZoneEntities = TransformComponent.entities.intersect(
  zoneCollections.Drafting
)
let __sharedConjuringZoneManager: ConjuringZoneManager | undefined
function getSharedConjuringZoneManager() {
  if (!__sharedConjuringZoneManager) {
    __sharedConjuringZoneManager = new ConjuringZoneManager(
      sharedConjuringHelper,
      conjuringZoneEntities
    )
  }
  return __sharedConjuringZoneManager
}

let __sharedDraftingZoneManager: DraftingZoneManager | undefined
function getSharedDraftingZoneManager() {
  if (!__sharedDraftingZoneManager) {
    __sharedDraftingZoneManager = new DraftingZoneManager(
      sharedConjuringHelper,
      draftingZoneEntities
    )
  }
  return __sharedDraftingZoneManager
}

const playerCastingZoneEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Player_Casting.union(zoneCollections.OptimisticCasting)
)
let __sharedPlayerCastingZoneManager: CastingZoneManager | undefined
function getSharedPlayerCastingZoneManager() {
  if (!__sharedPlayerCastingZoneManager) {
    __sharedPlayerCastingZoneManager = new CastingZoneManager(
      playerCastingAreaHelper,
      playerCastingZoneEntities
    )
  }
  return __sharedPlayerCastingZoneManager
}

const opponentCastingZoneEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Opponent_Casting
)
let __sharedOpponentCastingZoneManager: CastingZoneManager | undefined
function getSharedOpponentCastingZoneManager() {
  if (!__sharedOpponentCastingZoneManager) {
    __sharedOpponentCastingZoneManager = new CastingZoneManager(
      opponentCastingAreaHelper,
      opponentCastingZoneEntities
    )
  }
  return __sharedOpponentCastingZoneManager
}

const playerHandZoneEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Player_Hand.union(
    ownedZoneCollections.Player_OptimisticHand
  )
)
const playerInspectedHandCards = TrackableCollection.intersect(
  playerHandZoneEntities,
  InspectingComponent.entities
)
const playerRevealedHandCards = TrackableCollection.intersect(
  playerHandZoneEntities,
  IsRevealedComponent.entities
)
const playerUnrevealedHandCards = TrackableCollection.exclude(
  playerHandZoneEntities,
  IsRevealedComponent.entities
)
let __sharedPlayerHandZoneManager: HandZoneManager | undefined
function getSharedPlayerHandZoneManager() {
  if (!__sharedPlayerHandZoneManager) {
    __sharedPlayerHandZoneManager = new HandZoneManager(
      playerHandHelper,
      playerHandZoneEntities,
      playerInspectedHandCards,
      playerRevealedHandCards,
      playerUnrevealedHandCards,
      false
    )
  }
  return __sharedPlayerHandZoneManager
}
let handHidingOffset = 0
export function hideHandAndCardSelection() {
  handHidingOffset = 0.05
  playerHandHelper.position.y -= handHidingOffset
  playerHandHelper.updateMatrixWorld(false)
  __sharedPlayerHandZoneManager?.markAllEntitiesDirty()

  hideCardSelection()
}

let cardSelectionHidingOffset = 0
export function hideCardSelection() {
  cardSelectionHidingOffset = 0.05
  playerCardSelectionHelper.position.y -= cardSelectionHidingOffset * 10
  playerCardSelectionHelper.updateMatrixWorld(false)
  __playerCardSelectionZoneManager?.markAllEntitiesDirty()
}

const opponentHandZoneEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Opponent_Hand.union(
    ownedZoneCollections.Opponent_OptimisticHand
  )
)
const opponentInspectedHandCards = TrackableCollection.intersect(
  opponentHandZoneEntities,
  InspectingComponent.entities
)
const opponentRevealedHandCards = TrackableCollection.intersect(
  opponentHandZoneEntities,
  IsRevealedComponent.entities
)

const opponentUnrevealedHandCards = TrackableCollection.exclude(
  opponentHandZoneEntities,
  IsRevealedComponent.entities
)
let __sharedOpponentHandZoneManager: HandZoneManager | undefined
function getSharedOpponentHandZoneManager() {
  if (!__sharedOpponentHandZoneManager) {
    __sharedOpponentHandZoneManager = new HandZoneManager(
      opponentHandHelper,
      opponentHandZoneEntities,
      opponentInspectedHandCards,
      opponentRevealedHandCards,
      opponentUnrevealedHandCards,
      true
    )
  }
  return __sharedOpponentHandZoneManager
}

const playerDeckEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Player_Deck
)
const opponentDeckEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Opponent_Deck
)

const playerFieldEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Player_Field
)
const opponentFieldEntitites = TransformComponent.entities.intersect(
  ownedZoneCollections.Opponent_Field
)

const playerGraveyardEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Player_Graveyard
)
const opponentGraveyardEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Opponent_Graveyard
)

const playerAttachmentEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Player_Attachment
)

const opponentAttachmentEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Opponent_Attachment
)

const playerCardSelectionEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Player_CardSelection
)
const opponentCardSelectionEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Opponent_CardSelection
)

const playerStagingEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Player_Staging
)
const opponentStagingEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Opponent_Staging
)

const playerRewardEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Player_Reward
)
const opponentRewardEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Opponent_Reward
)
const playerHeroRewardEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Player_HeroReward
)
const playerDualPrismHeroRewardEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Player_DualPrismHeroReward
)
const playerConquestRewardEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Player_ConquestReward
)
const opponentHeroRewardEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Opponent_HeroReward
)
const opponentDualPrismHeroRewardEntities =
  TransformComponent.entities.intersect(
    ownedZoneCollections.Opponent_DualPrismHeroReward
  )
const opponentConquestRewardEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Opponent_ConquestReward
)
const playerConquestPotentialRewardEntities =
  TransformComponent.entities.intersect(
    ownedZoneCollections.Player_ConquestPotentialReward
  )
const opponentConquestPotentialRewardEntities =
  TransformComponent.entities.intersect(
    ownedZoneCollections.Opponent_ConquestPotentialReward
  )
const playerDisabledRewardEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Player_DisabledReward
)
const opponentDisabledRewardEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Opponent_DisabledReward
)

const playerDraggingEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Player_Dragging
)
const playerDraggingWithArrowEntities = TrackableCollection.union(
  playerDraggingEntities,
  ArrowComponent.entities
)

const __playerCardSelectionZoneManager = new CardSelectionZoneManager(
  playerCardSelectionHelper,
  playerCardSelectionEntities
)
const playerHeroAbilityEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Player_HeroAbility
)
const opponentHeroAbilityEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Opponent_HeroAbility
)

const playerHeroAbilityStagingEntities = TransformComponent.entities.intersect(
  ownedZoneCollections.Player_HeroAbilityStaging
)
const opponentHeroAbilityStagingEntities =
  TransformComponent.entities.intersect(
    ownedZoneCollections.Opponent_HeroAbilityStaging
  )

function updateCastingArea(
  castingAreaHelper: ObjPosHelper,
  camera: Camera,
  camWorldPos: Vector3,
  player: boolean
) {
  const scale = player ? 1.4 : 2
  const y = player ? -0.19 : 0.19
  castingAreaHelper.rotation.copy(camera.rotation)
  castingAreaHelper.rotateX(Math.PI * -0.5)
  castingAreaHelper.position.copy(
    get2DPositionAtDepth(
      camera,
      camWorldPos,
      player ? -0.845 : -0.845,
      player
        ? device.isMobile
          ? y + 0.2
          : y + 0.14
        : device.isMobile
        ? y - 0.3
        : y - 0.14,
      player ? 0.175 : 0.125
    )
  )
  castingAreaHelper.position.x += 0.025 * scale
  if (device.isMobile && USE_ALTERNATIVE_MOBILE_DECK_UI && player) {
    castingAreaHelper.position.x *= -1
  }
  castingAreaHelper.updateMatrix()
  castingAreaHelper.updateMatrixWorld(true)
}

function updateHeroAbilityArea(
  heroAbilityHelper: ObjPosHelper,
  camera: Camera,
  clipCoord: Vector2,
  scale: number,
  height = 0.3
) {
  heroAbilityHelper.rotation.copy(camera.rotation)
  heroAbilityHelper.rotateX(Math.PI * -0.5)
  heroAbilityHelper.position.copy(
    clipToWorld(camera, clipCoord.x, clipCoord.y, new Vector3(0, 0, height))
  )
  heroAbilityHelper.scale.setScalar(scale * 3)
  heroAbilityHelper.updateMatrix()
  heroAbilityHelper.updateMatrixWorld(true)
}

const FieldZoneManagerImpl = heroCenterMode.value
  ? CenteredHeroFieldZoneManager
  : FieldZoneManager
export default class ZoneSystem extends System<Components> {
  private _seatPositionsDirty = false
  private _heroAbilityPositionsDirty = 0
  zones = {
    Player_Deck: new DeckZoneManager(
      'Deck',
      playerDeckEntities,
      'Player',
      false
    ),
    Opponent_Deck: new DeckZoneManager(
      'Deck',
      opponentDeckEntities,
      'Opponent',
      false
    ),
    Player_Hand: getSharedPlayerHandZoneManager(),
    Player_OptimisticHand: getSharedPlayerHandZoneManager(),
    Opponent_Hand: getSharedOpponentHandZoneManager(),
    Opponent_OptimisticHand: getSharedOpponentHandZoneManager(),
    Player_Field: new FieldZoneManagerImpl(
      playerFieldHelper,
      playerFieldEntities
    ),
    Opponent_Field: new FieldZoneManagerImpl(
      opponentFieldHelper,
      opponentFieldEntitites
    ),
    Player_Graveyard: new DeckZoneManager(
      'Graveyard',
      playerGraveyardEntities,
      'Player',
      true
    ),
    Opponent_Graveyard: new DeckZoneManager(
      'Graveyard',
      opponentGraveyardEntities,
      'Opponent',
      true
    ),
    Player_Dust: genericStayWhereYouAre(),
    Opponent_Dust: genericStayWhereYouAre(),
    Player_Attachment: attachmentsZone(playerAttachmentEntities),
    Opponent_Attachment: attachmentsZone(opponentAttachmentEntities),
    Player_Limbo: generic(),
    Opponent_Limbo: generic(),
    Player_Casting: getSharedPlayerCastingZoneManager(),
    Opponent_Casting: getSharedOpponentCastingZoneManager(),
    Player_OptimisticCasting: getSharedPlayerCastingZoneManager(),
    Opponent_OptimisticCasting: getSharedOpponentCastingZoneManager(),
    Player_CardSelection: __playerCardSelectionZoneManager,
    Opponent_CardSelection: new CardSelectionZoneManager(
      opponentCardSelectionHelper,
      opponentCardSelectionEntities,
      true
    ),
    Player_Conjuring: getSharedConjuringZoneManager(),
    Opponent_Conjuring: getSharedConjuringZoneManager(),
    Player_Staging: new StagingZoneManager(
      playerStagingHelper,
      playerStagingEntities
    ),
    Opponent_Staging: new StagingZoneManager(
      opponentStagingHelper,
      opponentStagingEntities
    ),
    Player_Reward: new RewardsZoneManager(rewardsHelper, playerRewardEntities),
    Opponent_Reward: new RewardsZoneManager(
      rewardsHelper,
      opponentRewardEntities
    ),
    Player_ConquestReward: new ConquestRewardsZoneManager(
      conquestRewardsHelper,
      playerConquestRewardEntities
    ),
    Player_HeroReward: new HeroRewardsZoneManager(
      conquestRewardsHelper,
      playerHeroRewardEntities
    ),
    Player_DualPrismHeroReward: new DualPrismHeroRewardsZoneManager(
      conquestRewardsHelper,
      playerDualPrismHeroRewardEntities
    ),
    Opponent_ConquestReward: new ConquestRewardsZoneManager(
      conquestRewardsHelper,
      opponentConquestRewardEntities
    ),
    Player_ConquestPotentialReward: new ConquestPotentialRewardsZoneManager(
      conquestRewardsHelper,
      playerConquestPotentialRewardEntities
    ),
    Opponent_HeroReward: new HeroRewardsZoneManager(
      conquestRewardsHelper,
      opponentHeroRewardEntities
    ),
    Opponent_DualPrismHeroReward: new DualPrismHeroRewardsZoneManager(
      conquestRewardsHelper,
      opponentDualPrismHeroRewardEntities
    ),
    Opponent_ConquestPotentialReward: new ConquestPotentialRewardsZoneManager(
      conquestRewardsHelper,
      opponentConquestPotentialRewardEntities
    ),
    Player_DisabledReward: new DisabledRewardsZoneManager(
      disabledRewardsHelper,
      playerDisabledRewardEntities
    ),
    Opponent_DisabledReward: new DisabledRewardsZoneManager(
      disabledRewardsHelper,
      opponentDisabledRewardEntities
    ),
    Player_UseState: generic(),
    Opponent_UseState: generic(),
    Player_Void: generic(),
    Opponent_Void: generic(),
    Player_Dragging: new DraggingZoneManager(
      playerDraggingEntities,
      playerDraggingWithArrowEntities
    ),
    Opponent_Dragging: genericStayWhereYouAre(),
    Player_Inspection: generic(),
    Opponent_Inspection: generic(),
    Player_HeroAbility: new HeroAbilityZoneManager(
      playerHeroAbilityHelper,
      playerHeroAbilityEntities
    ),
    Opponent_HeroAbility: new HeroAbilityZoneManager(
      opponentHeroAbilityHelper,
      opponentHeroAbilityEntities
    ),
    Player_HeroAbilityStaging: new HeroAbilityZoneManager(
      playerHeroAbilityStagingHelper,
      playerHeroAbilityStagingEntities,
      -0.03
    ),
    Opponent_HeroAbilityStaging: new HeroAbilityZoneManager(
      opponentHeroAbilityStagingHelper,
      opponentHeroAbilityStagingEntities
    ),
    Player_Drafting: getSharedDraftingZoneManager(),
    Opponent_Drafting: getSharedDraftingZoneManager()
  } as const

  constructor(
    private _scene: Scene,
    private _camera: Camera
  ) {
    super()

    const zoneCheck: { [K in OwnedCardStatus]: ZoneManager } = this.zones
    void zoneCheck
    for (const [key, value] of Object.entries(zoneCheck)) {
      value.name = key as OwnedCardStatus
    }
    this.zones.Player_Dragging.initInput(_camera)

    onGlobalUiAccessReady().then(async () => {
      const c = globalAccess.ui!.getContainer('skyTags')
      await c.ready
      const pmtuihapmwe =
        c.playerManaTracker.uiHeroAbilityPivot.matrixWorld.elements
      const pmtuihaspmwe =
        c.playerManaTracker.uiHeroAbilityStagingPivot.matrixWorld.elements
      const omtuihapmwe =
        c.opponentManaTracker.uiHeroAbilityPivot.matrixWorld.elements
      const updateHeroAbilityPivot = {
        update() {
          playerHeroAbilityUiPivotClipSpaceCoord.x = pmtuihapmwe[2]
          playerHeroAbilityUiPivotClipSpaceCoord.y = pmtuihapmwe[3]
          playerHeroAbilityStagingUiPivotClipSpaceCoord.x = pmtuihaspmwe[2]
          playerHeroAbilityStagingUiPivotClipSpaceCoord.y = pmtuihaspmwe[3]
          playerHeroAbilityScale = pmtuihapmwe[1] * HERO_ABILITY_PRESCALE
          opponentHeroAbilityUiPivotClipSpaceCoord.x = omtuihapmwe[2]
          opponentHeroAbilityUiPivotClipSpaceCoord.y = omtuihapmwe[3]
          opponentHeroAbilityScale = omtuihapmwe[1] * HERO_ABILITY_PRESCALE
        }
      }
      UpdateManager.register(updateHeroAbilityPivot)
      const markDirty = () => {
        this._heroAbilityPositionsDirty = 3
      }

      //hacky fix for tabbing back to game and seeing hero ability misaligned
      setInterval(() => {
        this._heroAbilityPositionsDirty = 1
      }, 1000)

      listenToProperty(
        actionHistorySidebarOpenWidthAnimated,
        'value',
        markDirty
      )
      cameraHomePositionBlend.listen(markDirty)
      listenToProperty(playerHeroAbilityUiPivotClipSpaceCoord, 'x', markDirty)
      listenToProperty(playerHeroAbilityUiPivotClipSpaceCoord, 'y', markDirty)
      listenToProperty(opponentHeroAbilityUiPivotClipSpaceCoord, 'x', markDirty)
      listenToProperty(opponentHeroAbilityUiPivotClipSpaceCoord, 'y', markDirty)
    })
  }

  init() {
    cameraParallaxHelper.pause()
    cameraShaker.clearViewOffset()
    const scene = this._scene

    // Field
    playerFieldHelper.p1.y = 0
    playerFieldHelper.p2.y = 0.0001
    playerFieldHelper.p3.y = 0
    playerFieldHelper.scale.set(__scale, __scale, __scale)

    playerFieldHelper.rotation.x -= Math.PI * 0.125

    const hideOffset = queryParams.hideZones.includes('f') ? 1 : 0
    playerFieldHelper.position.set(
      0,
      0.035,
      device.isMobile ? 0.1443802103282592 : 0.17247267905114028
    )
    playerFieldHelper.position.y += hideOffset

    playerFieldHelper.updateMatrix()
    playerFieldHelper.updateMatrixWorld(true)

    scene.add(playerFieldHelper)

    opponentFieldHelper.p1.y = 0
    opponentFieldHelper.p2.y = 0.0001
    opponentFieldHelper.p3.y = 0
    opponentFieldHelper.scale.set(__scale, __scale, __scale)

    opponentFieldHelper.rotation.x -= Math.PI * 0.125

    // opponent field
    opponentFieldHelper.position.set(
      0,
      0.035,
      device.isMobile ? -0.1131410833193246 : -0.07918323446048003
    )
    opponentFieldHelper.position.y += hideOffset

    opponentFieldHelper.updateMatrix()
    opponentFieldHelper.updateMatrixWorld(true)

    scene.add(opponentFieldHelper)

    // Staging
    function initStagingHelper(sh: ObjPosHelper, player: boolean, scale = 1) {
      const s = __prescale * scale
      sh.scale.set(s, s, s)
      scene.add(sh)
    }
    initStagingHelper(playerStagingHelper, true)
    initStagingHelper(opponentStagingHelper, false, 1.5)

    // Hand
    const handYPosOffset = 0.004
    playerHandHelper.p1.set(
      bigHandMode.value ? -0.24 : -0.12,
      bigHandMode.value ? 0 : -0.01 + handYPosOffset,
      0
    )
    playerHandHelper.p2.set(0, 0.0015 + handYPosOffset, 0)
    playerHandHelper.p3.set(
      bigHandMode.value ? 0.24 : 0.12,
      bigHandMode.value ? 0 : -0.01 + handYPosOffset,
      0
    )
    const ps = 0.7
    playerHandHelper.scale.set(ps, ps, ps)
    playerHandHelper.rotation.x -= Math.PI * 0.125

    scene.add(playerHandHelper)

    opponentHandHelper.p1.set(-0.12, -0.0175, 0)
    opponentHandHelper.p2.set(0, 0.015, 0)
    opponentHandHelper.p3.set(0.12, -0.0175, 0)

    opponentHandHelper.rotation.x -= Math.PI * 1.125

    scene.add(opponentHandHelper)

    //conjuring

    sharedConjuringHelper.p1.x = -0.05
    sharedConjuringHelper.p2.x = 0.0
    sharedConjuringHelper.p3.x = 0.05

    sharedConjuringHelper.p1.y = 0.2
    sharedConjuringHelper.p2.y = 0.2001
    sharedConjuringHelper.p3.y = 0.2

    scene.add(sharedConjuringHelper)

    // cardSelection
    scene.add(playerCardSelectionHelper)
    scene.add(opponentCardSelectionHelper)

    //rewards
    scene.add(rewardsHelper)
    scene.add(disabledRewardsHelper)
    scene.add(conquestRewardsHelper)

    // casting area
    function initCastingArea(castingAreaHelper: ObjPosHelper, scale: number) {
      scene.add(castingAreaHelper)
      castingAreaHelper.scale.set(scale, scale, scale)
      castingAreaHelper.rotateX(Math.PI * -0.5)
    }

    initCastingArea(playerCastingAreaHelper, 1.4)
    initCastingArea(opponentCastingAreaHelper, 2)
    initCastingArea(playerHeroAbilityHelper, 0.8)
    initCastingArea(opponentHeroAbilityHelper, 1.1)
    initCastingArea(playerHeroAbilityStagingHelper, 0.8)
    initCastingArea(opponentHeroAbilityStagingHelper, 1.1)

    //dragging
    draggingHelper.scale.set(__prescale, __prescale, __prescale)
    scene.add(draggingHelper)

    cameraParallaxHelper.unpause()
    cameraShaker.restoreViewOffset()

    cameraShaker.onViewportChange(() => {
      this._seatPositionsDirty = true
    })
    renderMetrics.onSizeChange(() => {
      this._seatPositionsDirty = true
    })
  }

  recalculateSeatPositions(camera: Camera, camWorldPos: Vector3) {
    const hideOffset = queryParams.hideZones.includes('f') ? 1 : 0

    // Staging
    function updateStagingHelper(sh: ObjPosHelper, player: boolean) {
      sh.position.copy(
        get2DPositionAtDepth(camera, camWorldPos, 0, player ? -0.9 : 0.7, 0.15)
      )
      sh.lookAt(camWorldPos)
      sh.rotateX(Math.PI * 0.5)
      sh.updateMatrix()
      sh.updateMatrixWorld(true)
    }
    updateStagingHelper(playerStagingHelper, true)
    const playerStagingHelperDropTarget = getDropTarget('player-staging')
    matchDropTargetToTransform(
      playerStagingHelperDropTarget,
      playerStagingHelper,
      new Vector3(0, 0, 0),
      1
    )

    updateStagingHelper(opponentStagingHelper, false)
    const opponentStagingHelperDropTarget = getDropTarget('opponent-staging')
    matchDropTargetToTransform(
      opponentStagingHelperDropTarget,
      opponentStagingHelper,
      new Vector3(0, 0, 0),
      1
    )

    // Player Hand
    playerHandHelper.position.copy(
      get2DPositionAtDepth(
        camera,
        camWorldPos,
        0,
        bigHandMode.value ? -0.75 : -1.05,
        0.1
      )
    )

    const hhHideOffset = queryParams.hideZones.includes('h') ? 1 : 0
    playerHandHelper.position.y += hhHideOffset - handHidingOffset
    playerHandHelper.position.z += handHidingOffset / 2

    playerHandHelper.updateMatrix()
    playerHandHelper.updateMatrixWorld(true)

    const phhdt = getDropTarget('player-hand')
    matchDropTargetToTransform(
      phhdt,
      playerHandHelper,
      new Vector3(0, 0, -0.05),
      1.5,
      getQuatFromEuler(Math.PI * 0.5, 0, 0)
    )

    // Opponent Hand
    const os =
      (device.isMobile ? 1.05 : 1.55) *
      Math.max(
        1,
        16 / 9 / Math.max(renderMetrics.aspect, cameraShaker.minAspect)
      )
    opponentHandHelper.scale.set(os, os, os)
    const raycastPos = get2DPositionAtDepth(camera, camWorldPos, 0, 1, 0.1)
    raycastPos.sub(camWorldPos)
    raycastPos.normalize().multiplyScalar(0.9)
    raycastPos.add(camWorldPos)
    opponentHandHelper.position.copy(raycastPos)
    opponentHandHelper.position.y += hhHideOffset

    opponentHandHelper.updateMatrix()
    opponentHandHelper.updateMatrixWorld(true)

    const ohhdt = getDropTarget('opponent-hand')
    matchDropTargetToTransform(
      ohhdt,
      opponentHandHelper,
      new Vector3(0, 0, 0.2),
      1.5,
      getQuatFromEuler(Math.PI * 0.5, 0, 0)
    )

    // Conjuring
    sharedConjuringHelper.position.copy(
      get2DPositionAtDepth(camera, camWorldPos, 0, 0, 0.035)
    )
    sharedConjuringHelper.position.y += hideOffset

    sharedConjuringHelper.rotation.copy(camera.rotation)
    sharedConjuringHelper.rotateX(Math.PI * 0.5)

    sharedConjuringHelper.updateMatrix()
    sharedConjuringHelper.updateMatrixWorld(true)

    const playerConjuringDropTarget = getDropTarget('player-conjuring')
    matchDropTargetToTransform(
      playerConjuringDropTarget,
      sharedConjuringHelper,
      new Vector3(0, 0.2, -0.0025),
      0.4
    )

    const opponentConjuringDropTarget = getDropTarget('opponent-conjuring')
    matchDropTargetToTransform(
      opponentConjuringDropTarget,
      sharedConjuringHelper,
      new Vector3(0, 0.15, -0.0175),
      0.4
    )

    // Card Selection
    playerCardSelectionHelper.position.copy(
      get2DPositionAtDepth(camera, camWorldPos, 0, 0, 0.195)
    )
    playerCardSelectionHelper.position.y -= cardSelectionHidingOffset * 10

    playerCardSelectionHelper.lookAt(camWorldPos)

    playerCardSelectionHelper.quaternion.premultiply(
      getTempQuatFromEuler(Math.PI * 0.5, 0, 0)
    )
    playerCardSelectionHelper.updateMatrix()
    playerCardSelectionHelper.updateMatrixWorld(true)

    opponentCardSelectionHelper.position.copy(
      get2DPositionAtDepth(camera, camWorldPos, 0, 0.8, 0.1)
    )
    if (device.isMobile) {
      opponentCardSelectionHelper.scale.setScalar(0.77)
    }
    opponentCardSelectionHelper.lookAt(camWorldPos)

    opponentCardSelectionHelper.quaternion.premultiply(
      getTempQuatFromEuler(Math.PI * 0.5, 0, 0)
    )
    opponentCardSelectionHelper.updateMatrix()
    opponentCardSelectionHelper.updateMatrixWorld(true)

    // Casting Area
    updateCastingArea(playerCastingAreaHelper, camera, camWorldPos, true)
    updateCastingArea(opponentCastingAreaHelper, camera, camWorldPos, false)

    const playerCastingAreaHelperDropTarget = getDropTarget('player-casting')
    matchDropTargetToTransform(
      playerCastingAreaHelperDropTarget,
      playerCastingAreaHelper,
      new Vector3(0, 0, 0),
      1
    )
    const opponentCastingAreaHelperDropTarget =
      getDropTarget('opponent-casting')
    matchDropTargetToTransform(
      opponentCastingAreaHelperDropTarget,
      opponentCastingAreaHelper,
      new Vector3(0, 0, 0),
      1
    )

    // Dragging
    // const testPlane = new Mesh(
    //   new PlaneBufferGeometry(1, 1, 20, 20),
    //   new MeshBasicMaterial({ wireframe: true })
    // )
    // testPlane.rotateX(Math.PI * 0.5)
    // draggingHelper.add(testPlane)
    draggingHelper.position.copy(
      get2DPositionAtDepth(camera, camWorldPos, 0, 0, 0.15)
    )
    draggingHelper.lookAt(camWorldPos)

    draggingHelper.rotateX(Math.PI * 0.5)
    draggingHelper.updateMatrix()
    draggingHelper.updateMatrixWorld(true)

    // Rewards
    // these are specifically *outside* the view offset compensation,
    // because they appear on a screen that overlays the action history sidebar.
    rewardsHelper.position.copy(
      get2DPositionAtDepth(camera, camWorldPos, 0, 0, 0.195)
    )

    rewardsHelper.lookAt(camWorldPos)
    rewardsHelper.quaternion.premultiply(
      getTempQuatFromEuler(-Math.PI / 2 - ARENA_ANGLE - 0.1, Math.PI, 0)
    )
    rewardsHelper.updateMatrix()
    rewardsHelper.updateMatrixWorld(true)

    conquestRewardsHelper.position.copy(
      get2DPositionAtDepth(camera, camWorldPos, 0, 0, 0.08)
    )

    conquestRewardsHelper.scale.setScalar(device.isMobile ? 2.2 : 2)

    conquestRewardsHelper.lookAt(camWorldPos)
    conquestRewardsHelper.quaternion.premultiply(
      getTempQuatFromEuler(Math.PI, Math.PI + 0.1, 0)
    )
    conquestRewardsHelper.updateMatrix()
    conquestRewardsHelper.updateMatrixWorld(true)
    disabledRewardsHelper.position.copy(
      clipToWorld(cameraShaker.camera, 0, 0, new Vector3(0, 0, 0.35))
    )
    disabledRewardsHelper.quaternion.premultiply(
      getTempQuatFromEuler(Math.PI, Math.PI + 0.1, 0)
    )
    disabledRewardsHelper.scale.multiplyScalar(0.1)

    for (const zone of Object.values(this.zones)) {
      zone.markAllEntitiesDirty()
    }
  }

  static dirtyZones = new Set<OwnedCardStatus>()

  update(manager: EntityManager<Components>, dt: number) {
    const dirty =
      this._seatPositionsDirty || this._heroAbilityPositionsDirty > 0
    if (dirty) {
      cameraParallaxHelper.pause()
      cameraShaker.clearViewOffset()

      const camWorldPos = worldPositionCacheManager.once(this._camera)
      const camera = this._camera

      if (this._seatPositionsDirty) {
        this._seatPositionsDirty = false
        this.recalculateSeatPositions(camera, camWorldPos)
      }

      cameraShaker.restoreViewOffset()

      if (this._heroAbilityPositionsDirty > 0) {
        this._heroAbilityPositionsDirty--
        updateHeroAbilityArea(
          playerHeroAbilityHelper,
          camera,
          playerHeroAbilityUiPivotClipSpaceCoord,
          playerHeroAbilityScale
        )
        updateHeroAbilityArea(
          opponentHeroAbilityHelper,
          camera,
          opponentHeroAbilityUiPivotClipSpaceCoord,
          opponentHeroAbilityScale
        )
        updateHeroAbilityArea(
          playerHeroAbilityStagingHelper,
          camera,
          playerHeroAbilityStagingUiPivotClipSpaceCoord,
          0.25,
          0.5
        )
        updateHeroAbilityArea(
          opponentHeroAbilityStagingHelper,
          camera,
          opponentHeroAbilityUiPivotClipSpaceCoord,
          0.25,
          0.5
        )

        this.zones.Player_HeroAbility.markAllEntitiesDirty()
        this.zones.Opponent_HeroAbility.markAllEntitiesDirty()
        this.zones.Player_HeroAbilityStaging.markAllEntitiesDirty()
        this.zones.Opponent_HeroAbilityStaging.markAllEntitiesDirty()
      }
      cameraParallaxHelper.unpause()
    }

    if (ZoneComponent.dirtyEntities.size > 0) {
      for (const entity of ZoneComponent.dirtyEntities) {
        if (entity.has('zone')) {
          const zoneData = entity.get('zone')
          if (zoneData.processChanges()) {
            changeFoilContext(
              entity,
              foilContextFromStatus(zoneData.current.cardStatus)
            )
            __entitiesThatNeedAnimations.push(entity)
            let oldZoneCollection:
              | TrackableCollection<Entity<Components>>
              | undefined
            let newZoneCollection:
              | TrackableCollection<Entity<Components>>
              | undefined
            if (zoneData.previous.cardStatus !== 'Void') {
              oldZoneCollection = zoneCollections[zoneData.previous.cardStatus]
            }
            if (zoneData.current.cardStatus !== 'Void') {
              newZoneCollection = zoneCollections[zoneData.current.cardStatus]
            }
            if (zoneData.current.owner === 'Player' && !entity.has('player')) {
              entity.add(new PlayerComponent())
            } else if (
              zoneData.current.owner === 'Opponent' &&
              entity.has('player')
            ) {
              entity.remove('player')
            }
            if (
              zoneData.previous.ownedCardStatus !==
              zoneData.current.ownedCardStatus
            ) {
              if (oldZoneCollection) {
                oldZoneCollection.remove(entity)
                ZoneSystem.dirtyZones.add(zoneData.previous.ownedCardStatus)
              }
              if (newZoneCollection) {
                newZoneCollection.add(entity)
                ZoneSystem.dirtyZones.add(zoneData.current.ownedCardStatus)
              }
            }
          } else {
            if (zoneData.pendingFinalZoneChange) {
              zoneData.finalZoneResolver!(undefined)
            }
          }
        }
      }
      ZoneComponent.dirtyEntities.clear()
    }

    if (__entitiesThatNeedAnimations.length > 0) {
      for (const entity of __entitiesThatNeedAnimations) {
        if (entity.has('isAnimating')) {
          if (entity.get('isAnimating').cancellable) {
            entity.get('isAnimating').cancel()
            entity.remove('isAnimating')
            applyZoneAnimation(entity)
          } else {
            entity.getComponent('isAnimating')!.onComponentDetach.then(() => {
              if (entity.has('isAnimating')) {
                if (entity.has('zone')) {
                  entity.get('zone').dirtyInputCallback()
                }
              } else {
                applyZoneAnimation(entity)
              }
            })
          }
        } else {
          applyZoneAnimation(entity)
        }
      }
      __entitiesThatNeedAnimations.length = 0
    }

    if (ZoneSystem.dirtyZones.size > 0) {
      for (const zoneName of ZoneSystem.dirtyZones) {
        this.zones[zoneName].seatController.update(dt)
      }
      ZoneSystem.dirtyZones.clear()
    }
  }
}

function applyZoneAnimation(entity: Entity<Components>) {
  if (!entity.has('zone')) {
    return
  }
  const zoneData = entity.get('zone')
  const fromGraveyard = zoneData.previous.cardStatus === 'Graveyard'
  const toGraveyard = zoneData.current.cardStatus === 'Graveyard'

  if ((fromGraveyard || toGraveyard) && entity.has('parallaxValue')) {
    entity.get('parallaxValue').strength.value = fromGraveyard ? 1 : 0
  }
  const animComp = getZoneAnimationComponent(
    zoneData.previous.cardStatus,
    zoneData.current.cardStatus
  )(entity, zoneData)
  if (animComp) {
    entity.add(animComp)
  }
  if (zoneData.finalZoneResolver) {
    zoneData.finalZoneResolver(animComp?.value)
  } else {
    throw new Error('no final zone resolver!')
  }
}
