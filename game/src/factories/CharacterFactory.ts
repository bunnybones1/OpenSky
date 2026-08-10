import CharacterAssemblage from '~/assemblages/CharacterAssemblage'
import { RelaxedCardInstance } from '~/components/CardInstanceComponent'
import { createWorldEntity } from '~/helpers/worldHelpers'

export function createCharacter(card: RelaxedCardInstance) {
  return createWorldEntity(CharacterAssemblage(card))
}
