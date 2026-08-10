export const traits = [
  'guard',
  'stealth',
  'armor',
  'wither',
  'lifesteal',
  'banner',
  'dash'
] as const

export const artStatuses = [
  'ToRedesign',
  'Good',
  'ToAdjust',
  'Trashed'
] as const
export const elements = [
  'light',
  'mind',
  'fire',
  'air',
  'water',
  'earth',
  'metal',
  'dark',
  'sky'
] as const

export const prisms = ['hrt', 'str', 'wis', 'agy', 'int', 'tok', 'tut'] as const

export const types = [
  'hero',
  'unit',
  'spell',
  'enchant',
  'heroAbility'
] as const

export const spellBehaviours = [
  'defensive',
  'offensive',
  'positive',
  'negative'
] as const

export const sets = [
  'Tutorial',
  'Core Set',
  'Core Expansion',
  'Clash of Inventors',
  'Hexbound Invasion',
  'Starter Expansion'
] as const

export const rarities = ['common', 'rare', 'epic', 'legendary'] as const
export const itemGrades = ['base', 'silver', 'gold'] as const

export const races = [
  'Cycle of Life',
  'Bond of Duty',
  'Corpse Explosion',
  'Graverobbing',
  'Blazing Kick',
  'Human',
  'The Armis',
  'Not Starter, but can be used as starter',
  'Starter',
  'REDESIGN',
  'STARTER',
  'Elemental',
  'Dreambeasts',
  'Not starter but can be used',
  'Mystic secrets',
  'Air slash',
  'Storm call',
  'Saurian',
  'Beast',
  'Treefolk',
  'Sirens',
  'Cygnan',
  'Hoplites',
  'Lapin',
  'Rashidans',
  'Mecha',
  'The Hexbound',
  'hero-sidekick',
  'Not Starter but can be used as starter',
  'Vulpine',
  'The Exo',
  'Golem',
  'Masked Dreamers',
  'Tortugan',
  'Revenants',
  'Wraiths',
  'Dryads',
  'Dragon',
  'Primalan',
  'Badgerkin',
  'Raptors',
  'Leorans',
  'Wolfkin',
  'Oni',
  'Wu-Kin',
  'The Surit',
  'REDESIGN TITANIC',
  'COULDB-STARTER',
  'Sporekin',
  'Servitors',
  'Animata'
] as const
export type Race = (typeof races)[number]

export const backgroundKinds = ['halloween', ...elements] as const
export type BackgroundKind = (typeof backgroundKinds)[number]

export const artKinds = ['bg', 'hero', 'unit', 'spell'] as const
export type ArtKind = (typeof artKinds)[number]

export const artistNames = [
  'giaco',
  'brian',
  'xavi',
  'lobo',
  'air',
  'dark',
  'earth',
  'fire',
  'light',
  'metal',
  'mind',
  'water',
  'halloween',
  'case',
  'edsoa',
  'rubio',
  'mara',
  'desir',
  'erlan',
  'hang',
  'hans',
  'ksen',
  'miche',
  'panou',
  'patty',
  'shapo',
  'andr',
  'batis',
  'braga',
  'brau',
  'britta',
  'calle',
  'chen',
  'cunha',
  'cho',
  'delat',
  'freita',
  'jhona',
  'heran',
  'kelv',
  'kalani',
  'leoni',
  'pablo',
  'paulov',
  'machu',
  'minh',
  'mini',
  'scava',
  'pasco',
  'perez',
  'puddu',
  'racca',
  'rodri',
  'sewoo',
  'soyun',
  'tonel',
  'vini'
] as const
export type Artist = (typeof artistNames)[number]

export const artMarketingUsages = ['DontUse', 'GoodToUse', 'TryAvoid'] as const
export type ArtMarketingUsage = (typeof artMarketingUsages)[number]

export const vocabType = ['trait', 'trigger', 'keyword'] as const

export const questPeriodicity = ['daily', 'weekly', 'seasonal'] as const

export const heroes = [
  'ada',
  'samya',
  'fox',
  'lotus',
  'titus',
  'iris',
  'bouran',
  'horik',
  'zoey',
  'axel',
  'ari',
  'mira',
  'mai',
  'banjo',
  'sitti'
] as const

export const questDesignedDifficulties = ['easy', 'med', 'hard'] as const
export const questColumns = ['left', 'mid', 'right'] as const

export const vocabIcons = [
  'trait-armor',
  'trait-banner',
  'trait-dash',
  'trait-guard',
  'trait-lifesteal',
  'trait-stealth',
  'trait-wither',
  'trigger-generic',
  'trigger-death',
  'trigger-glory',
  'trigger-inspire',
  'trigger-play',
  'trigger-slay',
  'trigger-summon',
  'trigger-sunrise',
  'trigger-sunset',
  'keyword-conjure',
  'keyword-mulligan',
  'keyword-draw',
  'keyword-dust'
] as const

export const draftPoolType = ['main', 'support']

export const gameDesignStatus = ['needs-change', 'needs-review']
