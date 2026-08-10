import { TFunction } from '@opensky/language-manager'
import { BaseCard, CardLibrary } from '@skyweaver/state-metadata'

import { pick } from '../../framework/utils'

export function getRenderAffectingCardPropsString(
  id: BaseCard,
  t: TFunction
): string {
  const name = t(`cards:${id}.name`)
  const text = t(`cards:${id}.description`)
  if (!name) {
    throw new Error('Missing name translation for card' + id)
  }
  const card = CardLibrary.get(id)
  if (!card) {
    throw new Error('Missing card in card library ' + id)
  }

  const inputHashString = JSON.stringify({
    lang: {
      type: t(`cardMeta:type.${card.type}`),
      element: t(`cardMeta:elements.uppercase.${card.element}`)
    },
    ...pick(
      card,
      'attachment',
      'cost',
      'type',
      'power',
      'health',
      'prism',
      'traits',
      'element',
      'artSlug',
      'backgroundArtSlug'
    ),
    name,
    text,
    attachment: (card.attachment !== undefined
      ? (() => {
          const a = CardLibrary.get(card.attachment!)
          if (!a) {
            throw new Error(
              `Can't find (${id})'s attachment ${card.attachment}`
            )
          }
          return pick(a, 'cost', 'artSlug', 'type')
        })()
      : undefined)
  })

  return inputHashString
}
