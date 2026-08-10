import t from 'myzod'

import * as cell from '../../cellTypes'

export const _bareArtSchema = t
  .object({
    element: cell.cardElement.optional(),
    status: cell.artStatus,
    marketing: cell.artMarketingUsage,
    race: cell.artRace.optional(),
    bgId: cell.artSlug.optional(),
    notes: t.string().optional()
  })
  .collectErrors()
