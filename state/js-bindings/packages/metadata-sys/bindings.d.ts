export type Card = { id: InstanceID } | { pointer: OpaquePointer }

export type CardEvent<S> =
  | {
      type: 'NewPointer'
      payload: { pointer: OpaquePointer; location: ExactCardLocation }
    }
  | { type: 'ModifyCard'; payload: { instance: CardInstance<S> } }
  | {
      type: 'MoveCard'
      payload: {
        instance: [CardInstance<S>, CardInstance<S> | undefined] | undefined
        from: CardLocation
        to: ExactCardLocation
      }
    }
  | {
      type: 'ShuffleDeck'
      payload: { player: Player; deck: Array<InstanceID> }
    }
  | {
      type: 'SortField'
      payload: { player: Player; field: Array<InstanceID>; real: boolean }
    }
  | { type: 'GameEvent'; payload: { event: GameEvent } }

export type CardInstance<S> = {
  id: InstanceID
  base: BaseCard
  attachment: InstanceID | undefined
  state: CardState
}

export type CardLocation = {
  player: Player
  location: [Zone, number | undefined] | undefined
}

export type ExactCardLocation = { player: Player; location: [Zone, number] }

export type GameState<S> = {
  instances: Array<InstanceOrPlayer<S>>
  playerCards: Array<PlayerCards>
  shuffleDeckOnInsert: boolean
  state: S
}

export type InstanceOrPlayer<S> =
  | { instance: CardInstance<S> }
  | { player: Player }

export type InstanceID = number

export type OpaquePointer = { player: Player; index: number }

export type PlayerCards = {
  deck: number
  hand: Array<InstanceID | undefined>
  field: Array<InstanceID>
  graveyard: Array<InstanceID>
  dust: Array<InstanceID>
  limbo: Array<InstanceID>
  casting: Array<InstanceID>
  cardSelection: number
  heroAbility: Array<InstanceID>
  pointers: number
}

export type PlayerSecret<S> = {
  secret: Secret
  instances: Map<InstanceID, CardInstance<S>>
  nextInstance: InstanceID | undefined
  pointers: Array<InstanceID>
  deck: Array<InstanceID>
  hand: Array<InstanceID | undefined>
  dust: Array<InstanceID>
  limbo: Array<InstanceID>
  cardSelection: Array<InstanceID>
  deferredLogs: Array<CardEvent<S>>
  deferredLocations: Array<[Zone, number | undefined]>
  player: Player
}

export type Zone =
  | { name: 'Deck' }
  | { name: 'Hand'; public: boolean }
  | { name: 'Field' }
  | { name: 'Graveyard' }
  | { name: 'Dust'; public: boolean }
  | { name: 'Attachment'; parent: Card }
  | { name: 'Limbo'; public: boolean }
  | { name: 'Casting' }
  | { name: 'CardSelection' }
  | { name: 'HeroAbility' }

export type GameAction =
  | { type: 'EnterPlayerAction'; payload: [Player | undefined, PlayerAction] }
  | { type: 'FinishCardResolution' }
  | { type: 'ExitPlayerAction'; payload: [Player | undefined, PlayerAction] }
  | { type: 'EnterPhase'; payload: Phase }
  | { type: 'ExitPhase'; payload: ResolvedPhase }
  | { type: 'EnterParallelPhases' }
  | { type: 'ExitParallelPhases' }
  | {
      type: 'PhaseModified'
      payload: {
        old: Phase
        new: Phase
        source: InstanceID
        effect_type: EffectType
      }
    }
  | { type: 'EnterAuraUpdate' }
  | { type: 'ExitAuraUpdate' }

export type FindByTag<Union, Tag> = Union extends Tag ? Union : never

export type Player = 0 | 1

export type Address = number[]

export type Signature = number[]

export type IndexMap<K, V> = K extends string | number | symbol
  ? { [X in K]: V }
  : never

export type IndexSet<V> = Array<V>

export type BitFlags<T> = number

export type PrivateSeed = {
  player: Address
  subkey: Address
  signature: Signature
  prisms: Array<Prism>
  heroAbility: BaseCard | undefined
  cards: Array<BaseCard>
  randomSeed: Array<number>
  cardRarities: Map<BaseCard, Rarity>
}

export type PublicSeed = {
  prisms: Array<Prism>
  heroAbility: BaseCard | undefined
}

export type Approval = {
  player: Address
  subkey: Address
  signature: Signature
}

export type PlayerAction =
  | { type: 'Setup' }
  | { type: 'Concede' }
  | { type: 'EndTurn' }
  | { type: 'PlayCard'; cardID: InstanceID; targetID: InstanceID | undefined }
  | { type: 'Attack'; attackerID: InstanceID; defenderID: InstanceID }
  | { type: 'CommitCardSelection'; cardIndices: Array<number> }
  | { type: 'Cheat'; cheats: Array<Cheat> }
  | { type: 'Timeout' }
  | { type: 'Abandon'; player: Player }

export type Cheat =
  | { type: 'AddBaseCardToZone'; player: Player; card: BaseCard; zone: Zone }
  | { type: 'ChangeMaxMana'; player: Player; delta: number }
  | { type: 'SummonBaseUnit'; player: Player; card: BaseCard }
  | { type: 'ApplyModifierToCard'; card: Card; modifier: Modifier }
  | { type: 'AttachBaseCardToParent'; parent: Card; attachment_base: BaseCard }
  | { type: 'MoveCardToZone'; card: Card; new_owner: Player; new_zone: Zone }
  | { type: 'DustCardThroughLimboFirst'; card: Card }
  | { type: 'DustAllCardsInHand'; player: Player }
  | { type: 'DustAllCardsInDeck'; player: Player }
  | { type: 'AllCardsInDeckToGraveyard'; player: Player }
  | { type: 'ModifyCardRarity'; card: Card; rarity: Rarity }
  | { type: 'DrawCard'; player: Player }
  | { type: 'EffectResolutionActive'; active: boolean }
  | { type: 'DeathCleanupActive'; active: boolean }
  | { type: 'AuraUpdateActive'; active: boolean }
  | { type: 'CrashGame' }
  | {
      type: 'ModifyHeroAbilityCounters'
      player: Player
      amount_delta: number
      max_delta: number
    }
  | { type: 'ModifyHeroAbilityCharges'; player: Player; delta: number }

export type PlayerActionType<T extends PlayerAction['type']> = FindByTag<
  PlayerAction,
  { type: T }
>

export type PlayerActionError =
  | { playerActionErrorType: 'GameAlreadyFinished' }
  | { playerActionErrorType: 'AlreadySelectedCards'; detail: Player }
  | {
      playerActionErrorType: 'SelectedWrongNumberOfCards'
      detail: { expected: number; actual: number }
    }
  | { playerActionErrorType: 'DuplicateIndexInCardSelection' }
  | { playerActionErrorType: 'InvalidIndexInCardSelection' }
  | {
      playerActionErrorType: 'ActedOutOfTurn'
      detail: { expected: Player; actual: Player }
    }
  | { playerActionErrorType: 'DidNotSelectCards'; detail: Player }
  | {
      playerActionErrorType: 'DidOwnerAction'
      detail: { player: Player; action: PlayerAction }
    }
  | { playerActionErrorType: 'PlayedNonExistentCard' }
  | { playerActionErrorType: 'PlayedOrphanedAttachedSpell' }
  | { playerActionErrorType: 'PlayedNonFieldAttachedSpell'; detail: Zone }
  | {
      playerActionErrorType: 'PlayedAnotherPlayersCard'
      detail: { expected: Player; actual: Player }
    }
  | {
      playerActionErrorType: 'PlayedCardOnNonExistentTarget'
      detail: InstanceID
    }
  | { playerActionErrorType: 'AttackedWithNonExistentAttacker' }
  | { playerActionErrorType: 'AttackedNonExistentDefender' }
  | { playerActionErrorType: 'AttackedWithNonExistentAttackerAndDefender' }
  | { playerActionErrorType: 'AttackedWithNonFieldAttacker' }
  | { playerActionErrorType: 'AttackedNonFieldDefender' }
  | { playerActionErrorType: 'AttackedWithAnotherPlayersAttacker' }
  | { playerActionErrorType: 'AttackedOwnDefender' }
  | { playerActionErrorType: 'AttackedWithSleepingAttacker' }
  | { playerActionErrorType: 'AttackedWithExhaustedAttacker' }
  | { playerActionErrorType: 'AttackedGuardedHero' }
  | { playerActionErrorType: 'AttackedStealthUnit' }
  | { playerActionErrorType: 'AttackedHeroWithDash' }
  | { playerActionErrorType: 'AttackedNonFrontUnitWithBlindAttacker' }
  | { playerActionErrorType: 'AttackedWithAttackerWithRoots' }
  | { playerActionErrorType: 'Cheated' }
  | { playerActionErrorType: 'PlayedUnplayableCard' }
  | { playerActionErrorType: 'PlayedWithInsufficientMana' }
  | { playerActionErrorType: 'PlayedWithInsufficientRoom' }
  | { playerActionErrorType: 'PlayedTargetingCardOnTargetUntargetableByPlayer' }
  | {
      playerActionErrorType: 'PlayedTargetingCardOnTargetUntargetableByOpponent'
    }
  | { playerActionErrorType: 'PlayedTargetingCardOnInvalidTarget' }
  | { playerActionErrorType: 'PlayedNonTargetingCardWithTarget' }
  | { playerActionErrorType: 'PlayedTargetingCardWithoutTarget' }

export type GameStatus =
  | { type: 'WaitingForGameToStart' }
  | { type: 'Playing' }
  | { type: 'GameOver'; winner: Player | undefined }

export type SkyWeaver = {
  gameParams: GameParams
  players: Array<PlayerState>
  turnCount: number
  moveCount: number
  status: GameStatus
  currentPlayer: Player
  effectResolutionEnabled: boolean
  deathCleanupEnabled: boolean
  auraUpdateEnabled: boolean
  isCurrentPlayerSelectingCards: boolean
}

export type SkyWeaverSecret = {
  originalDeck: Array<BaseCard>
  filledDeck: Array<BaseCard>
  filledDeckInstances: Array<InstanceID>
  singletonCardsPosessed: IndexSet<BaseCard>
  cardsAboutToBeDrawn: Array<InstanceID>
  cardRarities: Map<BaseCard, Rarity>
  secretEarlyTriggers: Array<Array<ActiveTrigger<SecretEarlyTrigger>>>
  cardSelectionState: CardSelectionState | undefined
}

export type CardSelectionState = {
  target: InstanceID | undefined
  minChoices: number
  maxChoices: number
}

export type Secret = SkyWeaverSecret
export type GameEvent = GameAction

export type GameParams = {
  season: number
  maxManaCrystals: SaturatingU8
  skipFirstTurnStart: boolean
  maxBoardUnits: number
  maxHandSize: number
  maxTurnCount: number
  fillDecksToPrismSize: boolean
  cheatsAllowed: boolean
  skipMulligan: boolean
  cardWhitelist: Array<BaseCard> | undefined
  singlePrismDeckSize: number
  dualPrismDeckSize: number
  rigDeckOrder: boolean
  allowBeyondDeckDrawOutsidePrisms: boolean
  krampusMode: boolean
  tavernMode: TavernMode | undefined
  randomDeckOdds: Map<BaseCard, number> | undefined
  playerParams: Array<PlayerGameParams>
}

export type PlayerGameParams = {
  mulliganPoolSize: number
  mulliganChoiceSize: number
  startingMana: SaturatingU8
  skipFirstDraw: boolean
  heroModifiers: Array<Modifier>
  heroSpell: [BaseCard, Array<Modifier>] | undefined
  cardsAddedToHandAfterMulligan: Array<[BaseCard, Array<Modifier>]>
  field: Array<ModifiedBaseCard>
  deck: Array<ModifiedBaseCard>
  graveyard: Array<BaseCard>
}

export type AttachmentOverride =
  | { override: [BaseCard, Array<Modifier>] }
  | 'remove'

export type ModifiedBaseCard = {
  base: BaseCard
  attachment: AttachmentOverride | undefined
  modifiers: Array<Modifier>
}

export type PlayerSeed = {
  prisms: Array<Prism>
  hero_ability: BaseCard | undefined
}

export type PlayerState = {
  id: Player
  prisms: Array<Prism>
  mana: SaturatingU8
  maxMana: SaturatingU8
  doneCardSelection: boolean
  heroAbilityBase: BaseCard | undefined
  bannerSize: number
  inspireRepeat: number
  gloryRepeat: number
  extraManaNextTurn: number
  thisTurnStats: ThisTurnPlayerStats
  gameStats: PlayerGameStats
  globalCardModifiers: Array<GlobalModifier>
  baseCardSwaps: Map<BaseCard, BaseCard>
  heroAbilityCastsOrTriggersSinceLastTurnStart: number
}

export type CardSelectionCard = {
  base: BaseCard
  extra_data: Card | undefined
  attributes: CardAttributes
}

export type GlobalModifier = {
  modifiers: Array<Modifier>
  source: InstanceID
  filter: SerializableFilter
}

export type ThisTurnPlayerStats = {
  heroWasDamaged: boolean
  heroAttacked: boolean
  heroHpLost: number
  heroHpGained: number
  heroHpAtTurnStart: SaturatingU8
  alliesDied: Array<InstanceID>
  numSpellsCast: number
  numHeroAttacks: number
  baseCardsPlayed: Array<BaseCard>
  unitsSummoned: Array<InstanceID>
}

export type PlayerGameStats = {
  totalHeroHealthLost: number
  totalHordeDamage: number
  fatigueAmount: number
}

export type TavernMode =
  | 'statSurge'
  | 'twoForOneUnits'
  | 'twoForOneSpells'
  | 'gottaGoFast'
  | 'bleedDry'
  | 'mrBoneCrabsWildRide'
  | 'matryoska'
  | 'krampus'
  | 'horde'

export type SaturatingU8 = number

export type CardAttributes = {
  cost: SaturatingU8
  prism: Prism
  element: Element
  power: SaturatingU8
  health: SaturatingU8
  traits: IndexSet<Trait>
  type: Type
  canBePlayed: boolean
  isSilenced: boolean
  markedForDeath: InstanceID | undefined
  didAttack: boolean
  attackState: AttackState
  canBeTargetedByOwner: boolean
  canBeTargetedByEnemy: boolean
  attackRestrictions: IndexSet<AttackRestriction>
  effects: Array<CardEffect>
  rarity: Rarity
  isXCost: boolean
  healthFrozen: boolean
  charges: SaturatingU8 | undefined
  maxCharges: SaturatingU8 | undefined
  counters: SaturatingU8 | undefined
  maxCounters: SaturatingU8 | undefined
  perTurn: SaturatingU8 | undefined
}

export type AttackState = 'Exhausted' | 'Sleeping' | 'Ready'

export type ModifierExpiry =
  | { type: 'OnTurn'; payload: number }
  | { type: 'Never'; payload: { copyable: boolean } }
  | { type: 'Aura' }
  | { type: 'XCost' }

export type TemporaryModifier = {
  source: InstanceID
  priority: number
  modifier: Modifier
  expiry: ModifierExpiry
}

export type CardState = {
  view: CardAttributes
  temporaryModifiers: Array<TemporaryModifier>
  fieldAge: number
  instance: CardAttributes
  effectTypes: Array<EffectType>
}

export type ModifyHealthReason =
  | { Lifesteal: InstanceID }
  | { Damage: [InstanceID, DamageKind] }
  | 'Fatigue'

export type ModifyPowerReason = 'Wither' | 'Banner'

export type Modifier =
  | { SetHealth: SaturatingU8 }
  | { ModifyHealth: [number, ModifyHealthReason | undefined] }
  | { SetPower: SaturatingU8 }
  | { ModifyPower: [number, ModifyPowerReason | undefined] }
  | { SetCost: SaturatingU8 }
  | { ModifyCost: number }
  | { GrantTrait: Trait }
  | { RemoveTrait: Trait }
  | { GrantEffect: CardEffect }
  | { SetTraits: IndexSet<Trait> }
  | { SetElement: Element }
  | { SetRarity: Rarity }
  | { GrantAttackRestrictions: IndexSet<AttackRestriction> }
  | { RemoveAttackRestrictions: IndexSet<AttackRestriction> }
  | { CanBePlayed: boolean }
  | { SetAttackState: AttackState }
  | { SetHealthFrozen: boolean }
  | { ChangeMana: number }
  | { SetDidAttack: boolean }
  | 'CantBeTargetedByEnemy'
  | 'NoTraits'
  | { Silenced: boolean }
  | { MarkedForDeath: InstanceID }
  | 'UnmarkForDeath'
  | 'CheatedByPlayingIllegalHandCard'
  | { KrampusBuff: number }
  | { ApplyAtTurnEnd: Modifier }
  | { StoredCard: StoredCard }
  | { MechshroomSize: SaturatingU8 }
  | { GlobalModifierSource: { source: InstanceID; modifier: Modifier } }
  | { ModifyCharges: number }
  | { ModifyCounters: number }
  | { ModifyMaxCounters: number }

export type StoredCard = {
  owner: Player
  card: [BaseCard, CardState]
  attachment: [BaseCard, CardState] | undefined
}

export type BaseCard =
  | 'Dummy'
  | 'Hero'
  | '1'
  | '10'
  | '100'
  | '1000'
  | '1001'
  | '1002'
  | '1003'
  | '1004'
  | '1005'
  | '1006'
  | '1007'
  | '1008'
  | '1009'
  | '101'
  | '1010'
  | '1011'
  | '1012'
  | '1013'
  | '1014'
  | '1015'
  | '1016'
  | '1017'
  | '1018'
  | '1019'
  | '102'
  | '1020'
  | '1021'
  | '1022'
  | '1023'
  | '1024'
  | '1025'
  | '1026'
  | '1027'
  | '1028'
  | '1029'
  | '103'
  | '1030'
  | '1031'
  | '1032'
  | '1033'
  | '1034'
  | '1035'
  | '1036'
  | '1037'
  | '1038'
  | '1039'
  | '104'
  | '1040'
  | '1041'
  | '1042'
  | '1043'
  | '1044'
  | '1045'
  | '1046'
  | '1047'
  | '1048'
  | '1049'
  | '105'
  | '1050'
  | '1051'
  | '1052'
  | '1053'
  | '1054'
  | '1055'
  | '1056'
  | '1057'
  | '1058'
  | '1059'
  | '106'
  | '1060'
  | '1061'
  | '1062'
  | '1063'
  | '1064'
  | '1065'
  | '1066'
  | '1067'
  | '1068'
  | '1069'
  | '107'
  | '1070'
  | '1071'
  | '1072'
  | '1073'
  | '1074'
  | '1075'
  | '1076'
  | '1077'
  | '1078'
  | '1079'
  | '108'
  | '1080'
  | '1081'
  | '1082'
  | '1083'
  | '1084'
  | '1085'
  | '1086'
  | '1087'
  | '1088'
  | '1089'
  | '109'
  | '1090'
  | '1091'
  | '1092'
  | '1093'
  | '1094'
  | '1095'
  | '1096'
  | '1097'
  | '1098'
  | '1099'
  | '11'
  | '110'
  | '1100'
  | '1101'
  | '1102'
  | '1103'
  | '1104'
  | '1105'
  | '1106'
  | '1107'
  | '1108'
  | '1109'
  | '111'
  | '1110'
  | '1111'
  | '1112'
  | '1113'
  | '1114'
  | '1115'
  | '1116'
  | '1117'
  | '1118'
  | '1119'
  | '112'
  | '1120'
  | '1121'
  | '1122'
  | '1123'
  | '1124'
  | '1125'
  | '1126'
  | '1127'
  | '1128'
  | '1129'
  | '113'
  | '1130'
  | '1131'
  | '1132'
  | '1133'
  | '1134'
  | '1135'
  | '1136'
  | '1137'
  | '1138'
  | '1139'
  | '114'
  | '1140'
  | '1141'
  | '1142'
  | '1143'
  | '1144'
  | '1145'
  | '1146'
  | '1147'
  | '1148'
  | '1149'
  | '115'
  | '1150'
  | '1151'
  | '1152'
  | '1153'
  | '1154'
  | '1155'
  | '1156'
  | '1157'
  | '1158'
  | '1159'
  | '116'
  | '1160'
  | '1161'
  | '1162'
  | '1163'
  | '1164'
  | '117'
  | '1173'
  | '1174'
  | '1175'
  | '1176'
  | '1177'
  | '118'
  | '119'
  | '12'
  | '120'
  | '121'
  | '122'
  | '123'
  | '124'
  | '125'
  | '126'
  | '127'
  | '128'
  | '129'
  | '13'
  | '130'
  | '131'
  | '132'
  | '133'
  | '134'
  | '135'
  | '136'
  | '137'
  | '138'
  | '139'
  | '14'
  | '140'
  | '141'
  | '142'
  | '143'
  | '144'
  | '145'
  | '146'
  | '147'
  | '148'
  | '149'
  | '15'
  | '150'
  | '151'
  | '152'
  | '153'
  | '154'
  | '155'
  | '156'
  | '157'
  | '158'
  | '159'
  | '16'
  | '160'
  | '161'
  | '162'
  | '163'
  | '164'
  | '165'
  | '166'
  | '167'
  | '168'
  | '17'
  | '18'
  | '180'
  | '181'
  | '182'
  | '183'
  | '184'
  | '187'
  | '188'
  | '189'
  | '19'
  | '190'
  | '191'
  | '2'
  | '20'
  | '2000'
  | '20000'
  | '20001'
  | '20002'
  | '20003'
  | '20004'
  | '20005'
  | '20006'
  | '20007'
  | '20008'
  | '20009'
  | '2001'
  | '20010'
  | '20011'
  | '20012'
  | '20013'
  | '20014'
  | '20015'
  | '20017'
  | '20018'
  | '20019'
  | '2002'
  | '20020'
  | '20021'
  | '20022'
  | '20023'
  | '20024'
  | '20025'
  | '20026'
  | '20027'
  | '20028'
  | '20029'
  | '2003'
  | '20030'
  | '20031'
  | '20032'
  | '20033'
  | '20034'
  | '20035'
  | '20036'
  | '20037'
  | '20038'
  | '20039'
  | '2004'
  | '20040'
  | '20041'
  | '20042'
  | '20043'
  | '20044'
  | '20045'
  | '20046'
  | '20047'
  | '20048'
  | '20049'
  | '2005'
  | '20050'
  | '20051'
  | '20052'
  | '20053'
  | '20054'
  | '20055'
  | '20056'
  | '20057'
  | '20058'
  | '20059'
  | '2006'
  | '20060'
  | '20062'
  | '20063'
  | '20064'
  | '20065'
  | '20066'
  | '20067'
  | '20068'
  | '20069'
  | '2007'
  | '20070'
  | '2008'
  | '2009'
  | '2010'
  | '2011'
  | '2012'
  | '2013'
  | '2014'
  | '2015'
  | '2016'
  | '2017'
  | '2018'
  | '2019'
  | '2020'
  | '2021'
  | '2022'
  | '2023'
  | '2024'
  | '2025'
  | '2026'
  | '2027'
  | '2028'
  | '2029'
  | '2030'
  | '2031'
  | '2032'
  | '2033'
  | '2034'
  | '2035'
  | '2036'
  | '2037'
  | '2038'
  | '2039'
  | '2040'
  | '2041'
  | '2042'
  | '2043'
  | '2044'
  | '2045'
  | '2046'
  | '2047'
  | '2048'
  | '2049'
  | '2050'
  | '2051'
  | '2052'
  | '2053'
  | '2054'
  | '2055'
  | '2056'
  | '2057'
  | '2058'
  | '2059'
  | '2060'
  | '2061'
  | '2062'
  | '2063'
  | '2064'
  | '2065'
  | '2066'
  | '2067'
  | '2068'
  | '2069'
  | '2070'
  | '2071'
  | '2072'
  | '2073'
  | '2074'
  | '2075'
  | '2076'
  | '2077'
  | '2078'
  | '2079'
  | '2080'
  | '2081'
  | '2082'
  | '2083'
  | '2084'
  | '2085'
  | '2086'
  | '2087'
  | '2088'
  | '2089'
  | '2090'
  | '2091'
  | '2092'
  | '2093'
  | '2094'
  | '2095'
  | '2096'
  | '2097'
  | '2098'
  | '2099'
  | '21'
  | '2100'
  | '2101'
  | '2102'
  | '2103'
  | '2104'
  | '2105'
  | '2106'
  | '2107'
  | '2108'
  | '2109'
  | '2110'
  | '2111'
  | '2112'
  | '2113'
  | '2114'
  | '2115'
  | '2116'
  | '2117'
  | '2118'
  | '2119'
  | '2120'
  | '2121'
  | '2122'
  | '2123'
  | '2124'
  | '2125'
  | '2126'
  | '2127'
  | '2128'
  | '2129'
  | '2130'
  | '2131'
  | '2132'
  | '2133'
  | '2134'
  | '2135'
  | '2136'
  | '2137'
  | '2138'
  | '2139'
  | '2140'
  | '2141'
  | '2142'
  | '2143'
  | '2144'
  | '2145'
  | '2146'
  | '2147'
  | '2148'
  | '2149'
  | '2150'
  | '2151'
  | '2152'
  | '2153'
  | '2154'
  | '2155'
  | '2156'
  | '2157'
  | '2158'
  | '2159'
  | '2160'
  | '2161'
  | '2162'
  | '2163'
  | '2164'
  | '2165'
  | '2166'
  | '2167'
  | '2177'
  | '2178'
  | '2179'
  | '2180'
  | '2181'
  | '22'
  | '23'
  | '24'
  | '25'
  | '25000'
  | '25001'
  | '25002'
  | '25003'
  | '25004'
  | '25005'
  | '25006'
  | '25007'
  | '25008'
  | '25009'
  | '25010'
  | '25011'
  | '25012'
  | '25013'
  | '25014'
  | '25015'
  | '25016'
  | '25017'
  | '25018'
  | '25019'
  | '25020'
  | '25021'
  | '25022'
  | '25023'
  | '25024'
  | '25025'
  | '25026'
  | '26'
  | '27'
  | '28'
  | '29'
  | '3'
  | '30'
  | '3000'
  | '30000'
  | '30001'
  | '30002'
  | '30003'
  | '30004'
  | '30005'
  | '30006'
  | '30007'
  | '30008'
  | '30009'
  | '3001'
  | '30010'
  | '30011'
  | '30012'
  | '30013'
  | '30014'
  | '30015'
  | '30016'
  | '30017'
  | '30018'
  | '30019'
  | '3002'
  | '30020'
  | '30021'
  | '30022'
  | '30023'
  | '30024'
  | '30025'
  | '30026'
  | '30027'
  | '30028'
  | '30029'
  | '3003'
  | '30030'
  | '30031'
  | '30032'
  | '30033'
  | '30034'
  | '30035'
  | '30036'
  | '30037'
  | '30038'
  | '30039'
  | '3004'
  | '30040'
  | '30041'
  | '30042'
  | '30043'
  | '30044'
  | '30045'
  | '30046'
  | '30047'
  | '30048'
  | '30049'
  | '3005'
  | '30050'
  | '30051'
  | '30052'
  | '30053'
  | '30054'
  | '30055'
  | '30056'
  | '30057'
  | '30058'
  | '30059'
  | '3006'
  | '30060'
  | '30061'
  | '30062'
  | '30063'
  | '30064'
  | '30065'
  | '30066'
  | '30067'
  | '30068'
  | '30069'
  | '3007'
  | '30070'
  | '30071'
  | '30072'
  | '30073'
  | '30074'
  | '30075'
  | '30076'
  | '30077'
  | '30078'
  | '30079'
  | '3008'
  | '30080'
  | '30081'
  | '30082'
  | '30083'
  | '30084'
  | '30085'
  | '30086'
  | '30087'
  | '30088'
  | '30089'
  | '3009'
  | '30090'
  | '30091'
  | '30092'
  | '30093'
  | '30094'
  | '30095'
  | '30096'
  | '30097'
  | '30098'
  | '30099'
  | '3010'
  | '30100'
  | '30101'
  | '30102'
  | '30103'
  | '30104'
  | '30105'
  | '30106'
  | '30107'
  | '30108'
  | '30109'
  | '3011'
  | '30110'
  | '30111'
  | '30112'
  | '30113'
  | '30114'
  | '30115'
  | '30116'
  | '30117'
  | '30118'
  | '30119'
  | '3012'
  | '30120'
  | '30121'
  | '30122'
  | '30123'
  | '30124'
  | '30125'
  | '30126'
  | '30127'
  | '30128'
  | '30129'
  | '3013'
  | '30130'
  | '30131'
  | '30132'
  | '30133'
  | '30134'
  | '30135'
  | '30136'
  | '30137'
  | '3014'
  | '3015'
  | '3016'
  | '3017'
  | '3018'
  | '3019'
  | '3020'
  | '3021'
  | '3022'
  | '3023'
  | '3024'
  | '3025'
  | '3026'
  | '3027'
  | '3028'
  | '3029'
  | '3030'
  | '3031'
  | '3032'
  | '3033'
  | '3034'
  | '3035'
  | '3036'
  | '3037'
  | '3038'
  | '3039'
  | '3040'
  | '3041'
  | '3042'
  | '3043'
  | '3044'
  | '3045'
  | '3046'
  | '3047'
  | '3048'
  | '3049'
  | '3050'
  | '3051'
  | '3052'
  | '3053'
  | '3054'
  | '3055'
  | '3056'
  | '3057'
  | '3058'
  | '3059'
  | '3060'
  | '3061'
  | '3062'
  | '3063'
  | '3064'
  | '3065'
  | '3066'
  | '3067'
  | '3068'
  | '3069'
  | '3070'
  | '3071'
  | '3072'
  | '3073'
  | '3074'
  | '3075'
  | '3076'
  | '3077'
  | '3078'
  | '3079'
  | '3080'
  | '3081'
  | '3082'
  | '3083'
  | '3084'
  | '3085'
  | '3086'
  | '3087'
  | '3088'
  | '3089'
  | '3090'
  | '3091'
  | '3092'
  | '3093'
  | '3094'
  | '3095'
  | '3096'
  | '3097'
  | '3098'
  | '3099'
  | '31'
  | '3100'
  | '3101'
  | '3102'
  | '3103'
  | '3104'
  | '3105'
  | '3106'
  | '3107'
  | '3108'
  | '3109'
  | '3110'
  | '3111'
  | '3112'
  | '3113'
  | '3114'
  | '3115'
  | '3116'
  | '3117'
  | '3118'
  | '3119'
  | '3120'
  | '3121'
  | '3122'
  | '3123'
  | '3124'
  | '3125'
  | '3126'
  | '3127'
  | '3128'
  | '3129'
  | '3130'
  | '3131'
  | '3132'
  | '3133'
  | '3134'
  | '3135'
  | '3136'
  | '3137'
  | '3138'
  | '3139'
  | '3140'
  | '3141'
  | '3142'
  | '3143'
  | '3144'
  | '3145'
  | '3146'
  | '3147'
  | '3148'
  | '3149'
  | '3150'
  | '3151'
  | '3152'
  | '3153'
  | '3154'
  | '3155'
  | '3156'
  | '3157'
  | '3158'
  | '3159'
  | '3160'
  | '3161'
  | '3162'
  | '3163'
  | '3164'
  | '3165'
  | '3166'
  | '3167'
  | '3168'
  | '3169'
  | '32'
  | '33'
  | '34'
  | '35'
  | '36'
  | '37'
  | '38'
  | '39'
  | '4'
  | '40'
  | '4000'
  | '4001'
  | '4002'
  | '4003'
  | '4004'
  | '4005'
  | '4006'
  | '4007'
  | '4008'
  | '4009'
  | '4010'
  | '4011'
  | '4012'
  | '4013'
  | '4014'
  | '4015'
  | '4016'
  | '4017'
  | '4018'
  | '4019'
  | '4020'
  | '4021'
  | '4022'
  | '4023'
  | '4024'
  | '4025'
  | '4026'
  | '4027'
  | '4028'
  | '4029'
  | '4030'
  | '4031'
  | '4032'
  | '4033'
  | '4034'
  | '4035'
  | '4036'
  | '4037'
  | '4038'
  | '4039'
  | '4040'
  | '4041'
  | '4042'
  | '4043'
  | '4044'
  | '4045'
  | '4046'
  | '4047'
  | '4048'
  | '4049'
  | '4050'
  | '4051'
  | '4052'
  | '4053'
  | '4054'
  | '4055'
  | '4056'
  | '4057'
  | '4058'
  | '4059'
  | '4060'
  | '4061'
  | '4062'
  | '4063'
  | '4064'
  | '4065'
  | '4066'
  | '4067'
  | '4068'
  | '4069'
  | '4070'
  | '4071'
  | '4072'
  | '4073'
  | '4074'
  | '4075'
  | '4076'
  | '4077'
  | '4078'
  | '4079'
  | '4080'
  | '4081'
  | '4082'
  | '4083'
  | '4084'
  | '4085'
  | '4086'
  | '4087'
  | '4088'
  | '4089'
  | '4090'
  | '4091'
  | '4092'
  | '4093'
  | '4094'
  | '4095'
  | '4096'
  | '4097'
  | '4098'
  | '4099'
  | '41'
  | '4100'
  | '4101'
  | '4102'
  | '4103'
  | '4104'
  | '4105'
  | '4106'
  | '4107'
  | '4108'
  | '4109'
  | '4110'
  | '4111'
  | '4112'
  | '4113'
  | '4114'
  | '4115'
  | '4116'
  | '4117'
  | '4118'
  | '4119'
  | '4120'
  | '4121'
  | '4122'
  | '4123'
  | '4124'
  | '4125'
  | '4126'
  | '4127'
  | '4128'
  | '4129'
  | '4130'
  | '4131'
  | '4132'
  | '4133'
  | '4134'
  | '4135'
  | '4136'
  | '4137'
  | '4138'
  | '4139'
  | '4140'
  | '4141'
  | '4142'
  | '4143'
  | '4144'
  | '4145'
  | '4146'
  | '4147'
  | '4148'
  | '4149'
  | '4150'
  | '4151'
  | '4152'
  | '4153'
  | '4154'
  | '4155'
  | '4156'
  | '4157'
  | '4158'
  | '4159'
  | '4160'
  | '4161'
  | '4162'
  | '4163'
  | '4164'
  | '42'
  | '43'
  | '44'
  | '45'
  | '46'
  | '47'
  | '48'
  | '49'
  | '5'
  | '50'
  | '51'
  | '52'
  | '53'
  | '54'
  | '55'
  | '56'
  | '57'
  | '58'
  | '59'
  | '6'
  | '60'
  | '61'
  | '62'
  | '63'
  | '64'
  | '65'
  | '66'
  | '67'
  | '68'
  | '69'
  | '7'
  | '70'
  | '71'
  | '72'
  | '73'
  | '74'
  | '75'
  | '76'
  | '77'
  | '78'
  | '79'
  | '8'
  | '80'
  | '81'
  | '82'
  | '83'
  | '84'
  | '85'
  | '86'
  | '87'
  | '88'
  | '89'
  | '9'
  | '90'
  | '91'
  | '92'
  | '93'
  | '94'
  | '95'
  | '96'
  | '97'
  | '98'
  | '99'

export type SerializableFilter =
  | 'C1135'
  | 'C121'
  | 'C122'
  | 'C123'
  | 'C124'
  | 'C129'
  | 'C131'
  | 'C162'
  | 'C20069'
  | 'C20070'
  | 'C2157'
  | 'C30065'
  | 'C30101'
  | 'C31'
  | 'C3122'
  | 'C3162'
  | 'C3167'
  | 'C4118'
  | 'C4162'
  | 'IsUnit'
  | 'C20013'

export type AttackRestriction =
  | 'Blind'
  | 'HeroNotHitStealth'
  | 'GuardOnField'
  | 'Dash'

export type CardEffect =
  | { Intrinsic: BaseCard }
  | 'StrikeStorm'
  | { Riptide: InstanceID }
  | 'SonicJammer'
  | 'Evasion'
  | 'MagmaHarrier'
  | { HowlingHorn: [] }
  | 'SavageSquirrel'
  | 'GreenerPastures'
  | 'EtheranLore'
  | 'Frostbite'
  | 'Roots'
  | 'Shield'
  | 'Flames'
  | 'Chains'
  | 'Hex'
  | 'Dazed'
  | 'Anima'
  | 'Shroud'
  | 'Lead'
  | 'Fate'
  | 'Fury'
  | 'Barrier'
  | 'Vapors'
  | 'IllWill'
  | 'FrostAdept'
  | { GenesisAvatar: [] }
  | { Lorekeeper: InstanceID }
  | { ScarredServitor: number }
  | { InfiniteInfinities: InstanceID }
  | { InfinitieInfinitiesTracker: number }
  | { Calciform: number }
  | { PassiveAbility: [] }
  | { LotusEnlightened: number }
  | { Meditation: [InstanceID, number] }
  | { PackLeader: number }
  | { Virulence: [] }
  | { Overcome: [] }
  | { Faster: [] }
  | 'Hexheart'
  | { Mechshroom: [InstanceID, number] }
  | { HexedSurit: InstanceID }
  | 'AntiMago'
  | 'Overmind'
  | { BodySnatcher: { original_owner: Player; snatched_unit: InstanceID } }
  | { OohShiny: Array<InstanceID | undefined> }
  | { HexedSiren: InstanceID }
  | { Spellbreaker: InstanceID }
  | { SonicSignal: [] }
  | { ReefDiver: InstanceID }
  | { Dash: { put_to_sleep: boolean } }
  | { BleedDry: [] }
  | { TwoForOneUnits: [] }
  | { TwoForOneSpells: [] }
  | { Matryoska: [] }
  | { Horde: number }
  | 'CardSelection'

export type EffectType =
  | 'Death'
  | 'Glory'
  | 'Slay'
  | 'Inspire'
  | 'Play'
  | 'Summon'
  | 'Generic'
  | 'Sunrise'
  | 'Sunset'
  | 'Continuous'
  | 'Internal'
  | 'Choose'

export type ActiveTrigger<_G> = object

export type SecretEarlyTrigger = never

export type Prism = 'agy' | 'hrt' | 'int' | 'str' | 'wis' | 'tok' | 'tut'

export type Element =
  | 'light'
  | 'mind'
  | 'fire'
  | 'air'
  | 'water'
  | 'earth'
  | 'metal'
  | 'dark'
  | 'sky'

export type Trait =
  | 'stealth'
  | 'wither'
  | 'guard'
  | 'banner'
  | 'lifesteal'
  | 'armor'
  | 'dash'

export type Type = 'hero' | 'unit' | 'spell' | 'enchant' | 'heroAbility'

export type DamageKind =
  | { type: 'Combat'; is_retaliation: boolean }
  | { type: 'CardEffect' }

export type CardPool = 'Deck' | 'Prisms' | 'Anywhere'

export type Rarity = 'none' | 'base' | 'silver' | 'gold'

export type Phase =
  | { type: 'Cancelled'; payload: PhaseCancelled }
  | { type: 'EndTurn'; payload: PhaseEndTurn }
  | { type: 'StartTurn'; payload: PhaseStartTurn }
  | { type: 'ModifyCard'; payload: PhaseModifyCard }
  | { type: 'Attack'; payload: PhaseAttack }
  | { type: 'MoveToZone'; payload: PhaseMoveToZone }
  | { type: 'Draw'; payload: PhaseDraw }
  | { type: 'Conjure'; payload: PhaseConjure }
  | { type: 'Damage'; payload: PhaseDamage }
  | { type: 'ChangeMana'; payload: PhaseChangeMana }
  | { type: 'ChangeMaxMana'; payload: PhaseChangeMaxMana }
  | { type: 'ChangeManaNextTurn'; payload: PhaseChangeManaNextTurn }
  | { type: 'AuraUpdate'; payload: PhaseAuraUpdate }
  | { type: 'ResolveCardEffect'; payload: PhaseResolveCardEffect }
  | { type: 'ResetCard'; payload: PhaseResetCard }
  | { type: 'Glory'; payload: PhaseGlory }
  | { type: 'Mulligan'; payload: PhaseMulligan }
  | { type: 'ResolveTrigger'; payload: PhaseResolveTrigger }
  | { type: 'Overdraw'; payload: PhaseOverdraw }
  | { type: 'ResolveCardSelection'; payload: PhaseResolveCardSelection }

export type PhaseCancelled = {}

export type PhaseEndTurn = Player

export type PhaseStartTurn = Player

export type PhaseModifyCard = {
  source: InstanceID
  card: Card
  modifier: Modifier
}

export type PhaseAttack = { attacker: InstanceID; defender: InstanceID }

export type PhaseMoveToZone = { card: Card; player: Player; zone: Zone }

export type PhaseDraw = { from: [Player, CardPool]; to: [Player, Zone] }

export type PhaseConjure = { from: Player; to: [Player, Zone] }

export type PhaseDamage = {
  target: InstanceID
  amount: SaturatingU8
  source: InstanceID
  isWither: boolean
  lifestealFrom: Player | undefined
  kind: DamageKind
}

export type PhaseChangeMana = { player: Player; delta: number }

export type PhaseChangeMaxMana = { player: Player; delta: number }

export type PhaseChangeManaNextTurn = { player: Player; delta: number }

export type PhaseAuraUpdate = {}

export type PhaseResolveCardEffect = {
  baseCard: BaseCard
  id: InstanceID
  targetId: InstanceID | undefined
  playedManaCost: SaturatingU8
  playedByUnit: boolean
}

export type PhaseResetCard = Card

export type PhaseGlory = [InstanceID, SaturatingU8]

export type PhaseMulligan = {
  player: Player
  toMulligan: Array<Card>
  drawDelta: number
}

export type PhaseResolveTrigger = {
  id: InstanceID
  effect: CardEffect
  effectType: EffectType
}

export type PhaseOverdraw = Player

export type PhaseResolveCardSelection = {
  cardIndices: Array<number>
  player: Player
  isInitCardSelection: boolean
}

export type ResolvedPhase =
  | { type: 'FailedToResolve'; payload: ResolvedPhaseFailedToResolve }
  | { type: 'EndTurn'; payload: ResolvedPhaseEndTurn }
  | { type: 'StartTurn'; payload: ResolvedPhaseStartTurn }
  | { type: 'ModifyCard'; payload: ResolvedPhaseModifyCard }
  | { type: 'Attack'; payload: ResolvedPhaseAttack }
  | { type: 'MoveToZone'; payload: ResolvedPhaseMoveToZone }
  | { type: 'Draw'; payload: ResolvedPhaseDraw }
  | { type: 'Conjure'; payload: ResolvedPhaseConjure }
  | { type: 'Damage'; payload: ResolvedPhaseDamage }
  | { type: 'ChangeMana'; payload: ResolvedPhaseChangeMana }
  | { type: 'ChangeMaxMana'; payload: ResolvedPhaseChangeMaxMana }
  | { type: 'ChangeManaNextTurn'; payload: ResolvedPhaseChangeManaNextTurn }
  | { type: 'AuraUpdate'; payload: ResolvedPhaseAuraUpdate }
  | { type: 'ResolveCardEffect'; payload: ResolvedPhaseResolveCardEffect }
  | { type: 'ResetCard'; payload: ResolvedPhaseResetCard }
  | { type: 'Glory'; payload: ResolvedPhaseGlory }
  | { type: 'Mulligan'; payload: ResolvedPhaseMulligan }
  | { type: 'ResolveTrigger'; payload: ResolvedPhaseResolveTrigger }
  | { type: 'Overdraw'; payload: ResolvedPhaseOverdraw }
  | { type: 'ResolveCardSelection'; payload: ResolvedPhaseResolveCardSelection }

export type ResolvedPhaseFailedToResolve = {}

export type ResolvedPhaseEndTurn = { player: Player; turnCount: number }

export type ResolvedPhaseStartTurn = { player: Player; turnCount: number }

export type ResolvedPhaseModifyCard = {
  source: InstanceID
  card: Card
  modifier: Modifier
}

export type ResolvedPhaseAttack = {
  attacker: InstanceID
  defender: InstanceID
  overkill: SaturatingU8
}

export type ResolvedPhaseMoveToZone = {
  card: Card
  from: CardLocation
  to: [Player, Zone]
}

export type ResolvedPhaseDraw = {
  allowedPool: CardPool
  from: [Player, CardPool]
  to: [Player, Zone]
  drawnCard: Card
}

export type ResolvedPhaseConjure = {
  from: Player
  to: [Player, Zone]
  conjuredCard: Card
}

export type ResolvedPhaseDamage = {
  target: InstanceID
  amount: SaturatingU8
  overkill: SaturatingU8
  source: InstanceID
  isWither: boolean
  lifestealFrom: Player | undefined
  kind: DamageKind
}

export type ResolvedPhaseChangeMana = { player: Player; delta: number }

export type ResolvedPhaseChangeMaxMana = { player: Player; delta: number }

export type ResolvedPhaseChangeManaNextTurn = { player: Player; delta: number }

export type ResolvedPhaseAuraUpdate = {}

export type ResolvedPhaseResolveCardEffect = {
  baseCard: BaseCard
  id: InstanceID
  targetId: InstanceID | undefined
  playedManaCost: SaturatingU8
  playedByUnit: boolean
}

export type ResolvedPhaseResetCard = Card

export type ResolvedPhaseGlory = [InstanceID, SaturatingU8]

export type ResolvedPhaseMulligan = {
  player: Player
  mulliganed: Array<Card>
  drawn: Array<Card>
}

export type ResolvedPhaseResolveTrigger = {
  id: InstanceID
  effect: CardEffect
  effectType: EffectType
}

export type ResolvedPhaseOverdraw = { player: Player; returnedCard: Card }

export type ResolvedPhaseResolveCardSelection = {
  cardIndices: Array<number>
  player: Player
  isInitCardSelection: boolean
}
