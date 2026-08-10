import { getRandom } from '@opensky/shared/utils/arrayUtils'
import { distributions } from '@opensky/shared/utils/distributions'
import NiceFloatParameter from '@opensky/shared/utils/NiceFloatParameter'
import { BaseCard, isTrait } from '@skyweaver/state-metadata'
import { Entity } from 'gg'
import { Vector3 } from 'three'

import { getAssetsManager } from '~/assets'
import { initializeCardCache } from '~/cardCache'
import { Components } from '~/components'
import AttachedToComponent from '~/components/AttachedToComponent'
import DraggableComponent from '~/components/DraggableComponent'
import InspectableComponent from '~/components/InspectableComponent'
import IsRevealedComponent from '~/components/IsRevealedComponent'
import PlayableComponent from '~/components/PlayableComponent'
import TransformComponent from '~/components/TransformComponent'
import ZoneComponent, {
  FakeZoneType,
  ZoneType
} from '~/components/ZoneComponent'
import { createBaseRarityCardFromId } from '~/helpers/cardHelpers'
import { isValidDropTargetName } from '~/helpers/dropTargetTypes'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import queryParams from '~/queryParams'
import { getDropTarget } from '~/scenes/arena/dropTargetsLib'
import { scene } from '~/scenes/arena/scene'
import { simpleTweener } from '~/systems/animation/tweeners'
import AttachmentSystem from '~/systems/AttachmentSystem'
import CardArtGenerationSystem from '~/systems/CardArtGenerationSystem'
import ZoneSystem from '~/systems/cardPositioning/ZoneSystem'
import CardVisualsSystem from '~/systems/CardVisualsSystem'
import DragSystem from '~/systems/DragSystem'
import FrontFaceHidingSystem from '~/systems/FrontFaceHidingSystem'
import inputProvider from '~/systems/input/input'
import InteractiveIndicatorsSystem from '~/systems/InteractiveIndicatorsSystem'
import RevealedHandCardsSystem from '~/systems/RevealedHandCardsSystem'
import TextMesh from '~/systems/text/TextMesh'
import TextureAnimationSystem from '~/systems/TextureAnimationSystem'
import BasicIslandTest from '~/tests/BasicIslandTest'
import { CardStatus, Owner } from '~/types'
import { animationDelay } from '~/utils/asyncUtils'
import { cameraShaker } from '~/utils/cameraShaker'
import { findTextFieldByText } from '~/utils/findTextFieldByText'
import { globalAccess, onGlobalUiAccessReady } from '~/utils/globalAccess'
import { waitForNextFrame } from '~/utils/onNextFrame'
import { makeQuickButtonColumn, QuickButtonData } from '~/utils/quickButton'
import { world } from '~/world'

export async function testAnimatingComponentScene(
  ids: BaseCard[] = [
    '2005',
    '2008',
    '1002',
    '1004',
    '20013',
    '7',
    '8',
    '1023',
    '4099',
    '2099'
  ],
  initialZone: ZoneType = 'Hand',
  additionalQuickButtonDatas: QuickButtonData[] = []
) {
  const islandTest = new BasicIslandTest()
  await islandTest.init()
  initializeCardCache(0)

  ZoneComponent.ignoreDragging = true

  TransformComponent.defaultScene = scene

  world.addSystem(new CardVisualsSystem())
  world.addSystem(new CardArtGenerationSystem())
  world.addSystem(new TextureAnimationSystem())
  world.addSystem(new InteractiveIndicatorsSystem())
  world.addSystem(new FrontFaceHidingSystem())
  world.addSystem(new RevealedHandCardsSystem())

  await getAssetsManager().loadAsset('gamePiecesPhysical')
  await getAssetsManager().loadAsset('gamePiecesGraphical')

  world.addSystem(new ZoneSystem(scene, cameraShaker.camera))
  world.addSystem(new AttachmentSystem())
  world.addSystem(new DragSystem(inputProvider, getDropTarget('field')))
  const traitsParam = queryParams.traits

  const traits = (traitsParam ? traitsParam.split(',') : []).filter(isTrait)

  class DZData {
    constructor(
      public owner: Owner,
      public zone?: ZoneType,
      public fakeZone: FakeZoneType = 'UseState'
    ) {
      //
    }
  }

  const dropZoneEntMap = new Map<Entity<Components>, DZData>()
  function getDropTarget2(owner: Owner, status: CardStatus) {
    const key = `${owner.toLowerCase() as Lowercase<Owner>}-${
      status.toLowerCase() as Lowercase<CardStatus>
    }` as const
    if (isValidDropTargetName(key)) {
      return getDropTarget(key)
    }
    return undefined
  }
  const zoneCombosOfInterest: [ZoneType, FakeZoneType][] = []
  const owners: Owner[] = ['Player', 'Opponent']
  function mapDropTarget(
    zone: ZoneType = 'Limbo',
    fakeZone: FakeZoneType = 'UseState'
  ) {
    const status = `${fakeZone === 'UseState' ? zone : fakeZone}` as const
    for (const owner of owners) {
      const dt = getDropTarget2(owner, status)
      if (dt) {
        dropZoneEntMap.set(dt, new DZData(owner, zone, fakeZone))
        zoneCombosOfInterest.push([zone, fakeZone])
      }
    }
  }
  for (const zone of [
    'Field',
    'Deck',
    'Graveyard',
    'Hand',
    'Casting'
  ] as const) {
    mapDropTarget(zone)
  }
  for (const fakeZone of ['Conjuring', 'Staging'] as const) {
    mapDropTarget(undefined, fakeZone)
  }

  const zoneEnts = Array.from(dropZoneEntMap.keys())

  // const ids:BaseCard[] = ['111']

  let owner: Owner = 'Player'
  function cardIDToEnt(id: BaseCard) {
    const ent = createBaseRarityCardFromId(id, 'card', traits)!
    ent.get('zone')!.setOwner(owner)
    ent.get('zone')!.setStateZone(initialZone)
    ent.get('zone')!.setUserZone('UseState')
    ent.add(
      new DraggableComponent(
        new Vector3(),
        true,
        (dropped, droppedOnto) => {
          const nextZone = dropZoneEntMap.get(droppedOnto)!
          const z = dropped.get('zone')
          z.setOwner(nextZone.owner)
          if (nextZone.zone) {
            z.setStateZone(nextZone.zone)
          }
          z.setUserZone(nextZone.fakeZone)
        },
        () => {
          console.log('drop cancel')
        },
        () => {
          console.log('start drag without targets')
        }
      )
    )
    const d = ent.get('draggable')
    d.startNewFrame()
    for (const zoneEnt of zoneEnts) {
      d.addDropTargetToFrame(zoneEnt)
    }
    d.finalizeFrame()
    ent.add(new InspectableComponent())
    ent.add(new PlayableComponent())
    return ent
  }
  const ents = ids.map(cardIDToEnt)
  owner = 'Opponent'
  for (const ent of ids.map(cardIDToEnt)) {
    ents.push(ent)
  }

  for (const index of [0, 1]) {
    await animationDelay(1000).then(() => {
      const zone = ents[index].get('zone')
      zone.setStateZone('Field')
      zone.setUserZone('UseState')
    })
  }

  async function initUI() {
    await onGlobalUiAccessReady()
    const ui = globalAccess.ui!
    const container = ui.getContainer('randomTests')
    await container.ready
    await getAssetsManager().loadAsset('uiSmall')
    async function safe(entity: Entity<Components>) {
      const zone = entity.get('zone')
      if (zone.pendingFinalZoneChange) {
        await zone.pendingFinalZoneChange
      }
      while (entity.has('isAnimating')) {
        const anim = entity.get('isAnimating')
        if (anim.cancellable) {
          anim.cancel()
          entity.remove('isAnimating')
        } else {
          await anim.finishedFull
        }
        await waitForNextFrame() //this gives multi-phase animations a chance to play out
      }
    }
    let zoneStressTestActive: NodeJS.Timeout | undefined
    let zoneStressTestButtonLabel: TextMesh | undefined
    let attachmentStressTestActive: NodeJS.Timeout | undefined
    let attachmentStressTestButtonLabel: TextMesh | undefined
    let revealStressTestActive: NodeJS.Timeout | undefined
    let revealStressTestButtonLabel: TextMesh | undefined

    const quickButtonDatas = [
      new QuickButtonData('Start Stress Test', () => {
        if (zoneStressTestActive) {
          clearInterval(zoneStressTestActive)
          zoneStressTestActive = undefined
          if (zoneStressTestButtonLabel) {
            zoneStressTestButtonLabel.text = 'Start Stress Test'
          }
        } else {
          zoneStressTestActive = setInterval(async () => {
            const entity = getRandom(ents)
            await safe(entity)
            const zone = entity.get('zone')
            zone.setOwner(Math.random() > 0.5 ? 'Opponent' : 'Player')
            const zoneCombo = getRandom(zoneCombosOfInterest)
            if (
              zoneCombo[0] === 'Field' &&
              entity.get('cardInstance').state.view.type !== 'unit'
            ) {
              return // only units can go to the field
            }
            zone.setStateZone(zoneCombo[0])
            zone.setUserZone(zoneCombo[1])
            entity.remove('attachedTo')
          }, stressTestSpeed.value * simpleTweener.speed)
          if (zoneStressTestButtonLabel) {
            zoneStressTestButtonLabel.text = 'Stop Stress Test'
          }
        }
      }),
      new QuickButtonData('Start Attach Test', () => {
        if (attachmentStressTestActive) {
          clearInterval(attachmentStressTestActive)
          attachmentStressTestActive = undefined
          if (attachmentStressTestButtonLabel) {
            attachmentStressTestButtonLabel.text = 'Start Attach Test'
          }
        } else {
          attachmentStressTestActive = setInterval(async () => {
            const validAttachments = ents.filter(
              c => c.get('cardInstance').state.view.type !== 'unit'
            )
            if (validAttachments.length === 0) {
              return
            }
            const child = getRandom(validAttachments)
            await safe(child)
            const validAttachmentHosts = ents.filter(
              c =>
                c.get('cardInstance').state.view.type === 'unit' &&
                !c.has('hostingAttachment')
            )
            const parent = getRandom(validAttachmentHosts)
            if (validAttachmentHosts.length === 0) {
              return
            }
            const zone = child.get('zone')
            zone.setOwner(Math.random() > 0.5 ? 'Opponent' : 'Player')
            const zoneCombo = getRandom(zoneCombosOfInterest)
            zone.setStateZone('Attachment')
            zone.setUserZone(zoneCombo[1])
            child.remove('attachedTo')
            child.add(new AttachedToComponent(parent))
          }, stressTestSpeed.value * simpleTweener.speed)
          if (attachmentStressTestButtonLabel) {
            attachmentStressTestButtonLabel.text = 'Stop Attach Test'
          }
        }
      }),
      new QuickButtonData('Start Reveal Test', () => {
        if (revealStressTestActive) {
          clearInterval(revealStressTestActive)
          revealStressTestActive = undefined
          if (revealStressTestButtonLabel) {
            revealStressTestButtonLabel.text = 'Start Reveal Test'
          }
        } else {
          revealStressTestActive = setInterval(() => {
            const entity = getRandom(ents)
            if (entity.has('isRevealed')) {
              entity.remove('isRevealed')
            } else {
              entity.add(new IsRevealedComponent())
            }
          }, stressTestSpeed.value * simpleTweener.speed)
          if (revealStressTestButtonLabel) {
            revealStressTestButtonLabel.text = 'Stop Reveal Test'
          }
        }
      })
    ]

    makeQuickButtonColumn(
      container,
      quickButtonDatas.concat(additionalQuickButtonDatas),
      ReadonlyPin.BottomRight,
      undefined,
      undefined,
      120
    )
    container.show()
    zoneStressTestButtonLabel = findTextFieldByText(
      container,
      'Start Stress Test'
    )
    attachmentStressTestButtonLabel = findTextFieldByText(
      container,
      'Start Attach Test'
    )
    revealStressTestButtonLabel = findTextFieldByText(
      container,
      'Start Reveal Test'
    )
  }
  initUI()
}
export const test = testAnimatingComponentScene

const stressTestSpeed = new NiceFloatParameter(
  'testSpeed',
  'Test Speed Delay',
  300,
  120,
  1200,
  distributions.linear,
  x => `${x}ms`,
  'secret'
)
