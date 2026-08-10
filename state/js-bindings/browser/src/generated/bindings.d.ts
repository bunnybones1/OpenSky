/* tslint:disable */
/* eslint-disable */
/**
* @param {any} js_state
* @param {number} player
* @param {any} js_secret
* @returns {any[]}
*/
export function getValidActions(js_state: any, player: number, js_secret: any): any[];
/**
*/
export function install_panic_logger(): void;
/**
* @param {any} action_object
* @returns {Uint8Array}
*/
export function serialize_player_action(action_object: any): Uint8Array;
/**
* @param {any} js_state
* @param {number} player
* @param {any} js_secret
* @returns {any}
*/
export function getUndraggableIDs(js_state: any, player: number, js_secret: any): any;
/**
* @param {any} js_state
* @param {number} player
* @param {any} js_action
* @param {any} js_secret
*/
export function validatePlayerAction(js_state: any, player: number, js_action: any, js_secret: any): void;
/**
* @returns {string}
*/
export function getVersion(): string;
/**
* @param {string} address
* @returns {string}
*/
export function getChallenge(address: string): string;
/**
* @param {string} player
* @param {string} subkey
* @returns {string}
*/
export function getApproval(player: string, subkey: string): string;
/**
* @param {Uint8Array} root
* @returns {string}
*/
export function getRootProofVersion(root: Uint8Array): string;
/**
* @param {Uint8Array} root
* @param {boolean | undefined} no_version_check
* @returns {Uint8Array}
*/
export function getRootProofID(root: Uint8Array, no_version_check?: boolean): Uint8Array;
/**
* @param {Uint8Array} root
* @param {string} player
* @param {boolean | undefined} no_version_check
* @returns {number}
*/
export function getRootProofPlayer(root: Uint8Array, player: string, no_version_check?: boolean): number;
/**
* @param {Uint8Array} diff
* @returns {string}
*/
export function getDiffProof(diff: Uint8Array): string;
/**
* @param {Uint8Array} diff
* @returns {string}
*/
export function getDiffDebugString(diff: Uint8Array): string;
export type GameState<S> = {     instances: Array<InstanceOrPlayer<S>>; playerCards: Array<    PlayerCards>; shuffleDeckOnInsert: boolean; state: S }

export type InstanceOrPlayer<S> = 
 | { instance: CardInstance<S>} 
 | { player: Player }

export type Zone = 
 | { name: "Deck" } 
 | { name: "Hand"; public: boolean } 
 | { name: "Field" } 
 | { name: "Graveyard" } 
 | { name: "Dust"; public: boolean } 
 | { name: "Attachment"; parent: Card } 
 | { name: "Limbo"; public: boolean } 
 | { name: "Casting" } 
 | { name: "CardSelection" }

export type PlayerCards = {     deck: number; hand: Array<InstanceID | undefined>; field: Array<    InstanceID>; graveyard: Array<InstanceID>; dust: Array<    InstanceID>; limbo: Array<InstanceID>; casting: Array<InstanceID    >; cardSelection: number; pointers: number }

export type InstanceID = number

export type OpaquePointer = { player: Player; index: number }

export type Card = 
 | { id: InstanceID } 
 | { pointer: OpaquePointer }

export type GameStatus = 
 | { type: "WaitingForGameToStart" } 
 | { type: "Playing" } 
 | { type: "GameOver"; winner: Player | undefined }

export type SkyWeaver = {     gameParams: GameParams; players: Array<PlayerState>; turnCount:     number; moveCount: number; status: GameStatus; currentPlayer: Player }

export type SkyWeaverSecret = {     originalDeck: Array<BaseCard>; filledDeck: Array<BaseCard>;     filledDeckInstances: Array<InstanceID>; singletonCardsPosessed:     IndexSet<BaseCard>; cardsAboutToBeDrawn: Array<InstanceID>;     cardRarities: Map<BaseCard, Rarity>; secretEarlyTriggers: Array<    Array<ActiveTrigger<SecretEarlyTrigger>>>}


  export type Secret = SkyWeaverSecret
  export type GameEvent = GameAction


export type GameParams = {     maxManaCrystals: SaturatingU8; startingMana: SaturatingU8;     skipFirstTurnStart: boolean; maxBoardUnits: number; maxHandSize:     number; maxTurnCount: number; fillDecksToPrismSize: boolean;     cheatsAllowed: boolean; skipMulligan: boolean; cardWhitelist: Array<    BaseCard>| undefined; singlePrismDeckSize: number; dualPrismDeckSize: number; rigDeckOrder: boolean; allowBeyondDeckDrawOutsidePrisms:     boolean; krampusMode: boolean; randomDeckOdds: Map<BaseCard, number    >| undefined; playerParams: Array<PlayerGameParams>}

export type PlayerGameParams = {     mulliganPoolSize: number; mulliganChoiceSize: number; heroModifiers:     Array<Modifier>; heroSpell: [BaseCard, Array<Modifier >] |     undefined; cardsAddedToHandAfterMulligan: Array<    [BaseCard, Array<Modifier >]>; field: Array<ModifiedBaseCard>;     deck: Array<ModifiedBaseCard>; graveyard: Array<BaseCard>}

export type AttachmentOverride = 
 | { override: [BaseCard, Array<Modifier >] } 
 | "remove"

export type ModifiedBaseCard = {     base: BaseCard; attachment: AttachmentOverride | undefined; modifiers: Array<Modifier>}

export type PlayerSeed = { prisms: Array<Prism>}

export type PlayerState = {     id: Player; prisms: Array<Prism>; mana: SaturatingU8; maxMana:     SaturatingU8; doneCardSelection: boolean; bannerSize: number;     inspireRepeat: number; gloryRepeat: number; extraManaNextTurn: number; thisTurnStats: ThisTurnPlayerStats; gameStats: PlayerGameStats;     globalCardModifiers: Array<GlobalModifier>}

export type ThisTurnPlayerStats = {     heroWasDamaged: boolean; heroHpLost: number; alliesDied: Array<    InstanceID>}

export type PlayerGameStats = { totalHeroHealthLost: number; fatigueAmount: number }

export type CardEvent<S> = 
 | {     type: "NewPointer"; payload:     { pointer: OpaquePointer; location: ExactCardLocation } } 
 | { type: "ModifyCard"; payload: { instance: CardInstance<S>} } 
 | {     type: "MoveCard"; payload:     {         instance: [CardInstance<S >, CardInstance<S>| undefined] |         undefined; from: CardLocation; to: ExactCardLocation     } } 
 | {     type: "ShuffleDeck"; payload:     { player: Player; deck: Array<InstanceID>} } 
 | {     type: "SortField"; payload:     { player: Player; field: Array<InstanceID>; real: boolean } } 
 | { type: "GameEvent"; payload: { event: GameEvent } }

export type GameAction = 
 | { type: "EnterPlayerAction"; payload: [Player | undefined, PlayerAction] } 
 | { type: "FinishCardResolution" } 
 | { type: "ExitPlayerAction"; payload: [Player | undefined, PlayerAction] } 
 | { type: "EnterPhase"; payload: Phase } 
 | { type: "ExitPhase"; payload: ResolvedPhase } 
 | { type: "EnterParallelPhases" } 
 | { type: "ExitParallelPhases" } 
 | {     type: "PhaseModified"; payload:     {         old: Phase; new: Phase; source: InstanceID; effect_type:         EffectType     } } 
 | { type: "EnterAuraUpdate" } 
 | { type: "ExitAuraUpdate" }


export type FindByTag<Union, Tag> = Union extends Tag ? Union : never;
export type Player = 0 | 1;
export type Address = number[];
export type Signature = number[];

export type IndexMap<K, V> = K extends string | number | symbol ? {[X in K]: V} : never;
export type IndexSet<V> = Array<V>;
export type BitFlags<T> = number;

// Constructs a SkyWeaver root proof from player private seeds
//
// Callers should validate the accounts, subkeys, and signatures in the players' private seeds.
export function create_skyweaver_root_proof(
    owner_sign: (message: string) => number[],
    match_id: number[],
    game_params: GameParams,
    p1_seed: PrivateSeed,
    p2_seed: PrivateSeed,
): Uint8Array;



// Constructs a SkyWeaver root proof from a serialized game state
//
// Callers should validate the players' accounts and subkeys.
export function create_skyweaver_root_proof_from_serialized_game(
  owner_sign: (message: string) => number[],
  match_id: number[],
  js_game_state: GameState<SkyWeaver>,
  js_p1_player: string,
  js_p1_subkey: string,
  js_p2_player: string,
  js_p2_subkey: string,
): Uint8Array;


// Contains both public & private information the owner needs to start a game.
// This struct should not be shared with anyone.
export type PrivateSeed = {     player: Address; subkey: Address; signature: Signature; prisms:     Array<Prism>; cards: Array<BaseCard>; randomSeed: Array<number    >; cardRarities: Map<BaseCard, Rarity>}

export type Approval = { player: Address; subkey: Address; signature: Signature }

export type CardInstance<S> = {     id: InstanceID; base: BaseCard; attachment: InstanceID | undefined;     state: CardState }

export type PlayerSecret<S> = {     secret: Secret; instances: Map<InstanceID, CardInstance<S>>;     nextInstance: InstanceID | undefined; pointers: Array<InstanceID>;     deck: Array<InstanceID>; hand: Array<InstanceID | undefined>;     dust: Array<InstanceID>; limbo: Array<InstanceID>; cardSelection: Array<InstanceID>; deferredLogs: Array<CardEvent<S>>;     deferredLocations: Array<[Zone, number | undefined]>; player: Player }

export type CardLocation = { player: Player; location: [Zone, number | undefined] | undefined }

export type ExactCardLocation = { player: Player; location: [Zone, number] }

export type PlayerAction = 
 | { type: "Setup" } 
 | { type: "Concede" } 
 | { type: "EndTurn" } 
 | {     type: "PlayCard"; cardID: InstanceID; targetID: InstanceID |     undefined } 
 | { type: "Attack"; attackerID: InstanceID; defenderID: InstanceID } 
 | { type: "CommitCardSelection"; cardIndices: Array<number>} 
 | { type: "Cheat"; cheats: Array<Cheat>} 
 | { type: "Timeout" } 
 | { type: "Abandon"; player: Player }

export type Cheat = 
 | {     type: "AddBaseCardToZone"; player: Player; card: BaseCard; zone:     Zone } 
 | { type: "ChangeMaxMana"; player: Player; delta: number } 
 | { type: "SummonBaseUnit"; player: Player; card: BaseCard } 
 | { type: "ApplyModifierToCard"; card: Card; modifier: Modifier } 
 | {     type: "AttachBaseCardToParent"; parent: Card; attachment_base:     BaseCard } 
 | {     type: "MoveCardToZone"; card: Card; new_owner: Player; new_zone:     Zone } 
 | { type: "DustCardThroughLimboFirst"; card: Card } 
 | { type: "DustAllCardsInHand"; player: Player } 
 | { type: "DustAllCardsInDeck"; player: Player } 
 | { type: "AllCardsInDeckToGraveyard"; player: Player } 
 | { type: "ModifyCardRarity"; card: Card; rarity: Rarity } 
 | { type: "DrawCard"; player: Player } 
 | { type: "CrashGame" }


export type PlayerActionType<T extends PlayerAction["type"]> = FindByTag<PlayerAction, {type: T}>


export type PlayerActionError = 
 | { playerActionErrorType: "GameAlreadyFinished" } 
 | { playerActionErrorType: "AlreadySelectedCards"; detail: Player } 
 | {     playerActionErrorType: "SelectedWrongNumberOfCards"; detail:     { expected: number; actual: number } } 
 | { playerActionErrorType: "DuplicateIndexInCardSelection" } 
 | { playerActionErrorType: "InvalidIndexInCardSelection" } 
 | {     playerActionErrorType: "ActedOutOfTurn"; detail:     { expected: Player; actual: Player } } 
 | { playerActionErrorType: "DidNotSelectCards"; detail: Player } 
 | {     playerActionErrorType: "DidOwnerAction"; detail:     { player: Player; action: PlayerAction } } 
 | { playerActionErrorType: "PlayedNonExistentCard" } 
 | { playerActionErrorType: "PlayedOrphanedAttachedSpell" } 
 | { playerActionErrorType: "PlayedNonFieldAttachedSpell"; detail: Zone } 
 | {     playerActionErrorType: "PlayedAnotherPlayersCard"; detail:     { expected: Player; actual: Player } } 
 | {     playerActionErrorType: "PlayedCardOnNonExistentTarget"; detail:     InstanceID } 
 | { playerActionErrorType: "AttackedWithNonExistentAttacker" } 
 | { playerActionErrorType: "AttackedNonExistentDefender" } 
 | { playerActionErrorType: "AttackedWithNonExistentAttackerAndDefender" } 
 | { playerActionErrorType: "AttackedWithNonFieldAttacker" } 
 | { playerActionErrorType: "AttackedNonFieldDefender" } 
 | { playerActionErrorType: "AttackedWithAnotherPlayersAttacker" } 
 | { playerActionErrorType: "AttackedOwnDefender" } 
 | { playerActionErrorType: "AttackedWithSleepingAttacker" } 
 | { playerActionErrorType: "AttackedWithExhaustedAttacker" } 
 | { playerActionErrorType: "AttackedGuardedHero" } 
 | { playerActionErrorType: "AttackedStealthUnit" } 
 | { playerActionErrorType: "AttackedHeroWithDash" } 
 | { playerActionErrorType: "AttackedNonFrontUnitWithBlindAttacker" } 
 | { playerActionErrorType: "AttackedWithAttackerWithRoots" } 
 | { playerActionErrorType: "Cheated" } 
 | { playerActionErrorType: "PlayedUnplayableCard" } 
 | { playerActionErrorType: "PlayedWithInsufficientMana" } 
 | { playerActionErrorType: "PlayedWithInsufficientRoom" } 
 | { playerActionErrorType: "PlayedTargetingCardOnTargetUntargetableByPlayer" } 
 | {     playerActionErrorType:     "PlayedTargetingCardOnTargetUntargetableByOpponent" } 
 | { playerActionErrorType: "PlayedTargetingCardOnInvalidTarget" } 
 | { playerActionErrorType: "PlayedNonTargetingCardWithTarget" } 
 | { playerActionErrorType: "PlayedTargetingCardWithoutTarget" }

export type Prism = 
 | "agy" 
 | "hrt" 
 | "int" 
 | "str" 
 | "wis" 
 | "tok" 
 | "tut"

export type Element = 
 | "light" 
 | "mind" 
 | "fire" 
 | "air" 
 | "water" 
 | "earth" 
 | "metal" 
 | "dark" 
 | "sky"

export type Trait = 
 | "Stealth" 
 | "Wither" 
 | "Guard" 
 | "Banner" 
 | "Lifesteal" 
 | "Armor" 
 | "Dash"

export type Type = 
 | "Hero" 
 | "Unit" 
 | "Spell" 
 | "Enchant"

export type DamageKind = 
 | { type: "Combat"; is_retaliation: boolean } 
 | { type: "CardEffect" }

export type CardPool = 
 | "Deck" 
 | "Prisms" 
 | "Anywhere"

export type Rarity = 
 | "none" 
 | "base" 
 | "silver" 
 | "gold"

export type Phase = 
 | { type: "Cancelled"; payload: PhaseCancelled } 
 | { type: "EndTurn"; payload: PhaseEndTurn } 
 | { type: "StartTurn"; payload: PhaseStartTurn } 
 | { type: "ModifyCard"; payload: PhaseModifyCard } 
 | { type: "Attack"; payload: PhaseAttack } 
 | { type: "MoveToZone"; payload: PhaseMoveToZone } 
 | { type: "Draw"; payload: PhaseDraw } 
 | { type: "Conjure"; payload: PhaseConjure } 
 | { type: "Damage"; payload: PhaseDamage } 
 | { type: "ChangeMana"; payload: PhaseChangeMana } 
 | { type: "ChangeMaxMana"; payload: PhaseChangeMaxMana } 
 | { type: "ChangeManaNextTurn"; payload: PhaseChangeManaNextTurn } 
 | { type: "AuraUpdate"; payload: PhaseAuraUpdate } 
 | { type: "ResolveCardEffect"; payload: PhaseResolveCardEffect } 
 | { type: "ResetCard"; payload: PhaseResetCard } 
 | { type: "Glory"; payload: PhaseGlory } 
 | { type: "Mulligan"; payload: PhaseMulligan } 
 | { type: "ResolveTrigger"; payload: PhaseResolveTrigger } 
 | { type: "Overdraw"; payload: PhaseOverdraw }

export type PhaseCancelled = {}

export type PhaseEndTurn = Player

export type PhaseStartTurn = Player

export type PhaseModifyCard = { card: Card; modifier: Modifier }

export type PhaseAttack = { attacker: InstanceID; defender: InstanceID }

export type PhaseMoveToZone = { card: Card; player: Player; zone: Zone }

export type PhaseDraw = { from: [Player, CardPool]; to: [Player, Zone] }

export type PhaseConjure = { from: Player; to: [Player, Zone] }

export type PhaseDamage = {     target: InstanceID; amount: SaturatingU8; source: InstanceID;     isWither: boolean; lifestealFrom: Player | undefined; kind:     DamageKind }

export type PhaseChangeMana = { player: Player; delta: number }

export type PhaseChangeMaxMana = { player: Player; delta: number }

export type PhaseChangeManaNextTurn = { player: Player; delta: number }

export type PhaseAuraUpdate = {}

export type PhaseResolveCardEffect = {     baseCard: BaseCard; id: InstanceID; targetId: InstanceID | undefined; playedManaCost: SaturatingU8; playedByUnit: boolean }

export type PhaseResetCard = Card

export type PhaseGlory = [InstanceID, SaturatingU8]

export type PhaseMulligan = { player: Player; toMulligan: Array<Card>; drawDelta: number }

export type PhaseResolveTrigger = { id: InstanceID; effect: CardEffect; effectType: EffectType }

export type PhaseOverdraw = Player

export type ResolvedPhase = 
 | { type: "FailedToResolve"; payload: ResolvedPhaseFailedToResolve } 
 | { type: "EndTurn"; payload: ResolvedPhaseEndTurn } 
 | { type: "StartTurn"; payload: ResolvedPhaseStartTurn } 
 | { type: "ModifyCard"; payload: ResolvedPhaseModifyCard } 
 | { type: "Attack"; payload: ResolvedPhaseAttack } 
 | { type: "MoveToZone"; payload: ResolvedPhaseMoveToZone } 
 | { type: "Draw"; payload: ResolvedPhaseDraw } 
 | { type: "Conjure"; payload: ResolvedPhaseConjure } 
 | { type: "Damage"; payload: ResolvedPhaseDamage } 
 | { type: "ChangeMana"; payload: ResolvedPhaseChangeMana } 
 | { type: "ChangeMaxMana"; payload: ResolvedPhaseChangeMaxMana } 
 | { type: "ChangeManaNextTurn"; payload: ResolvedPhaseChangeManaNextTurn } 
 | { type: "AuraUpdate"; payload: ResolvedPhaseAuraUpdate } 
 | { type: "ResolveCardEffect"; payload: ResolvedPhaseResolveCardEffect } 
 | { type: "ResetCard"; payload: ResolvedPhaseResetCard } 
 | { type: "Glory"; payload: ResolvedPhaseGlory } 
 | { type: "Mulligan"; payload: ResolvedPhaseMulligan } 
 | { type: "ResolveTrigger"; payload: ResolvedPhaseResolveTrigger } 
 | { type: "Overdraw"; payload: ResolvedPhaseOverdraw }

export type ResolvedPhaseFailedToResolve = {}

export type ResolvedPhaseEndTurn = { player: Player; turnCount: number }

export type ResolvedPhaseStartTurn = { player: Player; turnCount: number }

export type ResolvedPhaseModifyCard = { card: Card; modifier: Modifier }

export type ResolvedPhaseAttack = { attacker: InstanceID; defender: InstanceID }

export type ResolvedPhaseMoveToZone = { card: Card; from: CardLocation; to: [Player, Zone] }

export type ResolvedPhaseDraw = {     allowedPool: CardPool; from: [Player, CardPool]; to: [Player, Zone];     drawnCard: Card }

export type ResolvedPhaseConjure = { from: Player; to: [Player, Zone]; conjuredCard: Card }

export type ResolvedPhaseDamage = {     target: InstanceID; amount: SaturatingU8; overkill: SaturatingU8;     source: InstanceID; isWither: boolean; lifestealFrom: Player |     undefined; kind: DamageKind }

export type ResolvedPhaseChangeMana = { player: Player; delta: number }

export type ResolvedPhaseChangeMaxMana = { player: Player; delta: number }

export type ResolvedPhaseChangeManaNextTurn = { player: Player; delta: number }

export type ResolvedPhaseAuraUpdate = {}

export type ResolvedPhaseResolveCardEffect = {     baseCard: BaseCard; id: InstanceID; targetId: InstanceID | undefined; playedManaCost: SaturatingU8; playedByUnit: boolean }

export type ResolvedPhaseResetCard = Card

export type ResolvedPhaseGlory = [InstanceID, SaturatingU8]

export type ResolvedPhaseMulligan = { player: Player; mulliganed: Array<Card>; drawn: Array<Card>}

export type ResolvedPhaseResolveTrigger = { id: InstanceID; effect: CardEffect; effectType: EffectType }

export type ResolvedPhaseOverdraw = { player: Player; returnedCard: Card }

export type SaturatingU8 = number

export type CardAttributes = {     cost: SaturatingU8; prism: Prism; element: Element; power:     SaturatingU8; health: SaturatingU8; traits: IndexSet<Trait>; type: Type; canBePlayed: boolean; isSilenced: boolean; markedForDeath:     boolean; didAttack: boolean; attackState: AttackState;     canBeTargetedByOwner: boolean; canBeTargetedByEnemy: boolean;     attackRestrictions: BitFlags<AttackRestriction>; effects: Array<    CardEffect>; rarity: Rarity }

export type AttackState = 
 | "Exhausted" 
 | "Sleeping" 
 | "Ready"

export type ModifierExpiry = 
 | { OnTurn: number } 
 | { Never: { copyable: boolean } } 
 | "Aura" 
 | "XCost"

export type TemporaryModifier = {     source: InstanceID; priority: number; modifier: Modifier; expiry:     ModifierExpiry }

export type CardState = {     view: CardAttributes; temporaryModifiers: Array<TemporaryModifier>;     fieldAge: number; instance: CardAttributes; effectTypes: Array<    EffectType>}

export type ModifyHealthReason = 
 | { Lifesteal: InstanceID } 
 | { Damage: [InstanceID, DamageKind] } 
 | "Fatigue"

export type ModifyPowerReason = 
 | "Wither"

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
 | { SetTraits: IndexSet<Trait>} 
 | { SetElement: Element } 
 | { SetRarity: Rarity } 
 | { GrantAttackRestrictions: BitFlags<AttackRestriction>} 
 | { RemoveAttackRestrictions: BitFlags<AttackRestriction>} 
 | { CanBePlayed: boolean } 
 | { SetAttackState: AttackState } 
 | { SetDidAttack: boolean } 
 | "CantBeTargetedByEnemy" 
 | "NoTraits" 
 | "Silenced" 
 | { MarkedForDeath: boolean } 
 | "CheatedByPlayingIllegalHandCard" 
 | { KrampusBuff: number } 
 | { ApplyAtTurnEnd: Modifier } 
 | { StoredCard: StoredCard } 
 | { MechshroomSize: SaturatingU8 } 
 | { GlobalModifierSource: InstanceID }

export type StoredCard = {     owner: Player; card: [BaseCard, CardState]; attachment:     [BaseCard, CardState] | undefined }


export type BaseCard = "Dummy" | "Hero"  | "85" | "95" | "1000" | "1002" | "1003" | "1004" | "1006" | "1008" | "1009" | "1010" | "1012" | "1013" | "1015" | "1016" | "1017" | "1018" | "1019" | "1020" | "1021" | "1023" | "1024" | "1025" | "1026" | "1028" | "1029" | "1030" | "1032" | "1034" | "1035" | "1036" | "1037" | "1038" | "1039" | "1040" | "1041" | "1042" | "1043" | "1044" | "1045" | "1046" | "1047" | "1048" | "1050" | "1051" | "1052" | "1053" | "1054" | "1055" | "1058" | "1059" | "1060" | "1061" | "1062" | "1063" | "1065" | "1066" | "1068" | "1071" | "1072" | "1073" | "1074" | "1075" | "1076" | "1078" | "1079" | "1080" | "1081" | "1082" | "1083" | "1084" | "1088" | "1090" | "1091" | "1092" | "1093" | "1096" | "1098" | "1100" | "1101" | "1103" | "1105" | "2000" | "2002" | "2003" | "2004" | "2005" | "2006" | "2007" | "2008" | "2009" | "2010" | "2014" | "2015" | "2016" | "2017" | "2018" | "2020" | "2021" | "2022" | "2024" | "2025" | "2026" | "2027" | "2028" | "2030" | "2032" | "2035" | "2036" | "2037" | "2038" | "2039" | "2041" | "2042" | "2043" | "2044" | "2045" | "2046" | "2047" | "2048" | "2050" | "2052" | "2053" | "2054" | "2056" | "2057" | "2058" | "2059" | "2060" | "2061" | "2062" | "2065" | "2066" | "2067" | "2069" | "2071" | "2072" | "2077" | "2078" | "2079" | "2080" | "2082" | "2083" | "2084" | "2085" | "2086" | "2087" | "2088" | "2089" | "2090" | "2091" | "2092" | "2093" | "2094" | "2095" | "2100" | "2102" | "2103" | "2104" | "2105" | "3000" | "3001" | "3002" | "3004" | "3005" | "3008" | "3009" | "3010" | "3011" | "3013" | "3014" | "3016" | "3017" | "3018" | "3019" | "3020" | "3021" | "3022" | "3023" | "3026" | "3027" | "3028" | "3029" | "3030" | "3031" | "3032" | "3033" | "3034" | "3035" | "3036" | "3037" | "3038" | "3039" | "3043" | "3046" | "3048" | "3050" | "3051" | "3052" | "3054" | "3055" | "3056" | "3057" | "3058" | "3061" | "3062" | "3063" | "3064" | "3065" | "3066" | "3068" | "3070" | "3071" | "3072" | "3073" | "3075" | "3077" | "3078" | "3079" | "3080" | "3082" | "3083" | "3085" | "3087" | "3088" | "3089" | "3090" | "3091" | "3093" | "3094" | "3096" | "3097" | "3098" | "3099" | "3102" | "3105" | "1106" | "1107" | "1108" | "1110" | "1112" | "1114" | "1115" | "2107" | "2108" | "2111" | "2112" | "2113" | "2114" | "2115" | "3106" | "3107" | "3108" | "3109" | "3111" | "3112" | "3114" | "3115" | "118" | "120" | "1117" | "1119" | "2116" | "2117" | "2118" | "2119" | "3116" | "3118" | "3119" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "13" | "14" | "15" | "16" | "17" | "18" | "19" | "20" | "21" | "22" | "23" | "24" | "25" | "26" | "27" | "28" | "29" | "30" | "31" | "32" | "33" | "34" | "35" | "36" | "37" | "38" | "39" | "40" | "41" | "42" | "43" | "44" | "45" | "46" | "47" | "48" | "49" | "50" | "51" | "52" | "53" | "54" | "55" | "56" | "57" | "58" | "59" | "60" | "61" | "62" | "63" | "64" | "65" | "66" | "67" | "68" | "69" | "70" | "71" | "72" | "73" | "74" | "75" | "76" | "77" | "78" | "79" | "80" | "81" | "82" | "83" | "84" | "86" | "87" | "88" | "89" | "90" | "91" | "92" | "93" | "94" | "96" | "97" | "98" | "99" | "100" | "101" | "102" | "103" | "104" | "105" | "106" | "1001" | "1005" | "1007" | "1011" | "1014" | "1022" | "1027" | "1031" | "1033" | "1049" | "1056" | "1057" | "1064" | "1067" | "1069" | "1070" | "1077" | "1085" | "1086" | "1087" | "1089" | "1094" | "1095" | "1097" | "1099" | "1102" | "1104" | "2001" | "2011" | "2012" | "2013" | "2019" | "2023" | "2029" | "2031" | "2033" | "2034" | "2040" | "2049" | "2051" | "2055" | "2063" | "2064" | "2068" | "2070" | "2073" | "2074" | "2075" | "2076" | "2081" | "2096" | "2097" | "2098" | "2099" | "2101" | "3003" | "3006" | "3007" | "3012" | "3015" | "3024" | "3025" | "3040" | "3041" | "3042" | "3044" | "3045" | "3047" | "3049" | "3053" | "3059" | "3060" | "3067" | "3069" | "3074" | "3076" | "3081" | "3084" | "3086" | "3092" | "3095" | "3100" | "3101" | "3103" | "3104" | "4000" | "4001" | "4002" | "4003" | "4004" | "4005" | "4006" | "4007" | "4008" | "4009" | "4010" | "4011" | "4012" | "4013" | "4014" | "4015" | "4016" | "4017" | "4018" | "4019" | "4020" | "4021" | "4022" | "4023" | "4024" | "4025" | "4026" | "4027" | "4028" | "4029" | "4030" | "4031" | "4032" | "4033" | "4034" | "4035" | "4036" | "4037" | "4038" | "4039" | "4040" | "4041" | "4042" | "4043" | "4044" | "4045" | "4046" | "4047" | "4048" | "4049" | "4050" | "4051" | "4052" | "4053" | "4054" | "4055" | "4056" | "4057" | "4058" | "4059" | "4060" | "4061" | "4062" | "4063" | "4064" | "4065" | "4066" | "4067" | "4068" | "4069" | "4070" | "4071" | "4072" | "4073" | "4074" | "4075" | "4076" | "4077" | "4078" | "4079" | "4080" | "4081" | "4082" | "4083" | "4084" | "4085" | "4086" | "4087" | "4088" | "4089" | "4090" | "4091" | "4092" | "4093" | "4094" | "4095" | "4096" | "4097" | "4098" | "4099" | "4100" | "4101" | "4102" | "4103" | "4104" | "4105" | "107" | "108" | "109" | "110" | "111" | "112" | "113" | "114" | "115" | "116" | "1109" | "1111" | "2106" | "2109" | "2110" | "3110" | "3113" | "4106" | "4107" | "4108" | "4109" | "4110" | "4111" | "4112" | "4113" | "4114" | "4115" | "117" | "119" | "1116" | "1118" | "4116" | "4117" | "4119" | "1113" | "3117" | "12" | "4118" | "20000" | "20001" | "20002" | "20003" | "20004" | "20005" | "20006" | "20007" | "20008" | "20009" | "20010" | "20011" | "20012" | "20013" | "20014" | "20015" | "20016" | "20017" | "20018" | "20019" | "20020" | "20021" | "20022" | "20023" | "20024" | "20025" | "20026" | "20027" | "20028" | "20029" | "20030" | "20031" | "20032" | "20033" | "20034" | "20035" | "20036" | "20037" | "20038" | "20039" | "20040" | "20041" | "20042" | "20043" | "20045" | "20046" | "20047" | "20048" | "20049" | "20050" | "20051" | "20052" | "20053" | "20054" | "20055" | "20056" | "20057" | "30000" | "30001" | "30002" | "30003" | "30004" | "30005" | "30006" | "30007" | "30008" | "30009" | "30010" | "30011" | "30012" | "30013" | "30014" | "30015" | "30016" | "30017" | "30018" | "30019" | "30020" | "30021" | "30022" | "30023" | "30024" | "30025" | "30026" | "30027" | "30028" | "30029" | "30030" | "30031" | "30032" | "30033" | "30034" | "30035" | "30036" | "30037" | "30038" | "30039" | "30040" | "30041" | "30042" | "30043" | "30044" | "30045" | "30046" | "30047" | "30048" | "30049" | "30050" | "30051" | "30052" | "30053" | "30054" | "30055" | "30056" | "30057" | "30058" | "30059" | "30060" | "30061" | "30062" | "30063" | "30064" | "30065" | "30066" | "30067" | "30068" | "30069" | "30070" | "30071" | "30072" | "30073" | "30074" | "30075" | "30076" | "30077" | "30078" | "30079" | "30080" | "30081" | "30082" | "30083" | "30084" | "30085" | "30086" | "30087" | "30088" | "30089" | "30090" | "30091" | "30092" | "30093" | "30094" | "30095" | "20058" | "20059" | "20060" | "30096" | "30097" | "30098" | "30099" | "30100"


export type SerializableFilter = 
 | "C4118"

export type AttackRestriction = 
 | "Blind" 
 | "HeroNotHitStealth" 
 | "GuardOnField" 
 | "Dash"

export type CardEffect = 
 | { Intrinsic: BaseCard } 
 | "SonicJammer" 
 | "Frostbite" 
 | "Roots" 
 | "Shield" 
 | "Flames" 
 | "Chains" 
 | "Hex" 
 | "Dazed" 
 | "Anima" 
 | "Shroud" 
 | "Lead" 
 | "Fate" 
 | "Fury" 
 | "Barrier" 
 | "Vapors" 
 | { GenesisAvatar: [] } 
 | { Mechshroom: [InstanceID, number] } 
 | { BodySnatcher: { original_owner: Player; snatched_unit: InstanceID } } 
 | { OohShiny: Array<InstanceID | undefined>} 
 | { Dash: { put_to_sleep: boolean } }

export type EffectType = 
 | "Death" 
 | "Glory" 
 | "Inspire" 
 | "Play" 
 | "Summon" 
 | "Generic" 
 | "Sunrise" 
 | "Sunset" 
 | "Continuous" 
 | "Internal"


export type ActiveTrigger<_G> = object

export type SecretEarlyTrigger = never


/**
*/
export class WasmMatch {
  free(): void;
/**
* @param {number | undefined} player
* @param {Uint8Array} root
* @param {any} secret
* @param {boolean} p2p
* @param {Function} ready
* @param {Function} sign
* @param {Function} send
* @param {Function} log
* @param {Function} random
* @param {boolean | undefined} no_version_check
*/
  constructor(player: number | undefined, root: Uint8Array, secret: any, p2p: boolean, ready: Function, sign: Function, send: Function, log: Function, random: Function, no_version_check?: boolean);
/**
* @param {Uint8Array} data
* @param {boolean} p2p
* @param {Function} ready
* @param {Function} sign
* @param {Function} send
* @param {Function} log
* @param {Function} random
* @param {boolean | undefined} no_version_check
* @returns {WasmMatch}
*/
  static deserialize(data: Uint8Array, p2p: boolean, ready: Function, sign: Function, send: Function, log: Function, random: Function, no_version_check?: boolean): WasmMatch;
/**
* @param {number} secret_knowledge
* @returns {Uint8Array}
*/
  serialize(secret_knowledge: number): Uint8Array;
/**
* @returns {boolean}
*/
  hasState(): boolean;
/**
* @param {number} player
* @returns {boolean}
*/
  hasSecret(player: number): boolean;
/**
* @param {number} player
* @returns {any}
*/
  secret(player: number): any;
/**
* @param {string} address
* @returns {number | undefined}
*/
  getAddressPlayer(address: string): number | undefined;
/**
* @param {number | undefined} player
* @param {any} action
* @param {any} using_secrets
* @returns {any}
*/
  simulate(player: number | undefined, action: any, using_secrets: any): any;
/**
*/
  flush(): void;
/**
* @param {any} action
*/
  dispatch(action: any): void;
/**
* @param {string} address
* @param {string} signature
*/
  dispatchCertify(address: string, signature: string): void;
/**
* @param {string} player
* @param {string} subkey
* @param {string} signature
*/
  dispatchApprove(player: string, subkey: string, signature: string): void;
/**
*/
  dispatchTimeout(): void;
/**
* @param {Uint8Array} diff
*/
  apply(diff: Uint8Array): void;
/**
* @param {Uint8Array} diff
*/
  raw_apply(diff: Uint8Array): void;
/**
* @param {string} player
* @param {string} subkey
* @returns {string}
*/
  static getApproval(player: string, subkey: string): string;
/**
*/
  readonly addresses: any;
/**
*/
  readonly hash: string;
/**
*/
  readonly id: Uint8Array;
/**
*/
  readonly pendingPlayer: number | undefined;
/**
*/
  readonly player: number | undefined;
/**
*/
  readonly state: any;
}
/**
*/
export class WasmState {
  free(): void;
/**
* @param {any} state
* @param {any} secrets
* @param {Function} log
* @param {Function} random
*/
  constructor(state: any, secrets: any, log: Function, random: Function);
/**
* @param {Uint8Array} data
* @param {Function} log
* @param {Function} random
* @returns {WasmState}
*/
  static deserialize(data: Uint8Array, log: Function, random: Function): WasmState;
/**
* @returns {Uint8Array}
*/
  serialize(): Uint8Array;
/**
* @returns {boolean}
*/
  hasState(): boolean;
/**
* @param {number} player
* @returns {boolean}
*/
  hasSecret(player: number): boolean;
/**
* @param {number} player
* @returns {any}
*/
  secret(player: number): any;
/**
* @param {number | undefined} player
* @param {any} action
* @param {any} using_secrets
* @returns {any}
*/
  simulate(player: number | undefined, action: any, using_secrets: any): any;
/**
* @param {number | undefined} player
* @param {any} action
*/
  apply(player: number | undefined, action: any): void;
/**
*/
  readonly state: any;
}
