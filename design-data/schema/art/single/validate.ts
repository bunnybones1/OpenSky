import { Infer, ValidationError } from 'myzod'

import { _bareArtSchema } from './struct'

export function artElementMatchesBackgroundId(
  art: Infer<typeof _bareArtSchema>
) {
  if (art.element && art.bgId && art.element !== art.bgId.split('-')[1]) {
    throw new ValidationError(
      `Art Element doesn't match BG id: ${art.element} != ${art.bgId}`,
      ['element', 'bgId']
    )
  }
  return true
}
