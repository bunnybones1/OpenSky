import { Archetype } from 'gg'

import { Components } from '~/components'

export type ArchetypeClass = new () => Archetype<Components>
export type TypedArchetypeClass<T extends Archetype<Components>> = new () => T

export { default as RevealedHandCardsArchetype } from './RevealedHandCardsArchetype'
export { default as ScreenSpaceArchetype } from './ScreenSpaceArchetype'
export { default as SleepingArchetype } from './SleepingArchetype'
export { default as TriggersHolderArchetype } from './TriggersHolderArchetype'
