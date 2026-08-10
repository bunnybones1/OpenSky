import { Infer, ValidationError } from 'myzod'
import { _bareArtSchema } from './single/struct'

export function onlyUnitsHaveBackgrounds(
  art: Record<string, Infer<typeof _bareArtSchema>>
) {
  const artErrors: Record<string, ValidationError> = {}
  for (const [artID, a] of Object.entries(art)) {
    const artType = artID.split('-')[0]
    if ((artType === 'unit' || artType === 'unit') && !a.bgId) {
      artErrors[artID] = new ValidationError(
        `Art is a Unit/Hero, but has no background associated.`,
        ['bgId']
      )
    }
    if (artType !== 'unit' && artType !== 'hero' && a.bgId) {
      artErrors[artID] = new ValidationError(
        `Art is not a Unit or Hero, but has a background associated.`,
        ['bgId']
      )
    }
    if (a.bgId && !art[a.bgId]) {
      artErrors[artID] = new ValidationError(
        `Art has background ${a.bgId}, but no art with that ID exists.`,
        ['bgId']
      )
    }
  }
  if (Object.keys(artErrors).length) {
    throw new ValidationError(
      `Failed to validate backgrounds for cards.`,
      undefined,
      artErrors
    )
  }
  return true
}
