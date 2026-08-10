import { middleOut } from '@opensky/shared/utils/math'
import { BaseCard, isTrait } from '@skyweaver/state-metadata'
import { Entity } from 'gg'

import { Components } from '~/components'
import FrontFacesVisibleComponent from '~/components/FrontFacesVisibleComponent'
import TransformComponent from '~/components/TransformComponent'
import { scene } from '~/scenes/arena/scene'
import CardArtGenerationSystem from '~/systems/CardArtGenerationSystem'
import FrontFaceHidingSystem from '~/systems/FrontFaceHidingSystem'
import BasicIslandTest from '~/tests/BasicIslandTest'

import { getAssetsManager } from '../assets'
import { ARENA_ANGLE, SCALE_CHARACTER } from '../constants'
import { createBaseRarityCardFromId } from '../helpers/cardHelpers'
import queryParams from '../queryParams'
import CardVisualsSystem from '../systems/CardVisualsSystem'
import TextureAnimationSystem from '../systems/TextureAnimationSystem'
import { rotToQuat } from '../utils/mathThree'
import { world } from '../world'

async function sandbox() {
  const islandTest = new BasicIslandTest()
  await islandTest.init()
  const entities: Array<Entity<Components>> = []

  const COLUMNS = 5

  const defaultCardIds: BaseCard[] = [
    '3013',
    '20000',
    '2000',
    '19',
    '20001',
    '3003',
    '3002',
    '29',
    '2005',
    '35',
    '2008',
    '3015',
    '20013',
    '3011'
  ]

  TransformComponent.defaultScene = scene

  world.addSystem(new CardVisualsSystem())
  world.addSystem(new FrontFaceHidingSystem())
  world.addSystem(new CardArtGenerationSystem())
  world.addSystem(new TextureAnimationSystem())

  await getAssetsManager().loadAsset('gamePiecesPhysical')
  await getAssetsManager().loadAsset('gamePiecesGraphical')

  const cardsParam = queryParams.cards
  const traitsParam = queryParams.traits
  const type =
    (queryParams.type as 'card' | 'character' | 'hero') || 'character'

  const cardIds = (
    cardsParam ? cardsParam.split(',') : defaultCardIds
  ) as BaseCard[]
  const traits = (traitsParam ? traitsParam.split(',') : []).filter(isTrait)

  function filterAndShow(entities: Array<Entity<Components> | undefined>) {
    ;(
      entities.filter(a => a !== undefined) as Array<Entity<Components>>
    ).forEach((e, idx) => {
      e.add(new FrontFacesVisibleComponent())
      registerCard(e, idx)
    })
  }

  const registerCard = (entity: Entity<Components>, idx: number) => {
    const transform = entity.get('transform')
    const col = middleOut(idx % 5)
    const row = middleOut(Math.floor(idx / COLUMNS))

    transform.position.set(col * 0.08, 0.05, row * 0.2)
    transform.quaternion.copy(rotToQuat(ARENA_ANGLE, 0, 0))
    transform.scale.copy(SCALE_CHARACTER)
    entities.push(entity)
  }

  if (cardIds.length === 1) {
    const [id] = cardIds
    filterAndShow([
      createBaseRarityCardFromId(id, 'character', ['guard']),
      createBaseRarityCardFromId(id, 'character', []),
      createBaseRarityCardFromId(id, 'card', [])
    ])
  } else {
    filterAndShow(
      cardIds.map(id => createBaseRarityCardFromId(id, type, traits))
    )
  }
}

export const test = sandbox
