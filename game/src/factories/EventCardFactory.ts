import EventCardAssemblage from '~/assemblages/EventCardAssemblage'
import { DECK_COUNTER_POSITIONS } from '~/assets'
import { RelaxedCardInstance } from '~/components/CardInstanceComponent'
import { createWorldEntity } from '~/helpers/worldHelpers'

export function createEventCard(
  instance: RelaxedCardInstance,
  isPlayer: boolean
) {
  const components = EventCardAssemblage(instance)
  const entity = createWorldEntity(components)
  entity.get('zone').setOwner(isPlayer ? 'Player' : 'Opponent')
  const t = entity.get('transform')
  const player = entity.has('player')
  t.position.copy(DECK_COUNTER_POSITIONS[player ? 1 : 0][1])
  t.position.multiplyScalar(0.078)
  t.position.z -= player ? 0.12 : 0.09
  t.position.y -= 0.03
  t.rotation.x = Math.PI // * 0.5
  // t.rotation.z = Math.PI * -0.5

  return entity
}
