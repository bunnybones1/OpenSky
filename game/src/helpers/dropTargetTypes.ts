const validDropTargetNames = [
  'player-deck',
  'player-graveyard',
  'player-casting',
  'player-staging',
  'player-conjuring',
  'player-hand',
  'player-field',
  'opponent-deck',
  'opponent-graveyard',
  'opponent-casting',
  'opponent-staging',
  'opponent-conjuring',
  'opponent-hand',
  'opponent-field',
  'island-dust',
  'field'
] as const

export function isValidDropTargetName(
  baseName: string
): baseName is ValidDropTarget {
  return (validDropTargetNames as readonly string[]).includes(baseName)
}

export type ValidDropTarget = (typeof validDropTargetNames)[number]
