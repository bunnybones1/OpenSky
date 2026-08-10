import { GameMode as mode } from '@opensky/proto'
import { ExpectNever, Overlaps } from './typeHelpers'

export enum LocalGameMode {
  LOCAL_BOT = 'LOCAL_BOT',
  REPLAY = 'REPLAY',
  SPECTATE = 'SPECTATE',
  SANDBOX = 'SANDBOX'
}

export type AnyGameMode = mode | LocalGameMode
type AnyGameModeType = `${mode | LocalGameMode}`
const anyGameMode = [
  'UNKNOWN',
  'RANKED_CONSTRUCTED',
  'CHALLENGE_CONSTRUCTED',
  'CHALLENGE_DISCOVERY',
  'TUTORIAL',
  'PRACTICE_BOT',
  'PRACTICE_PVP',
  'WARM_UP',
  'RANKED_DISCOVERY',
  'CONQUEST_CONSTRUCTED',
  'CONQUEST_DISCOVERY',
  'LOCAL_BOT',
  'REPLAY',
  'SPECTATE',
  'SANDBOX'
  //TODO new Game Modes for Draft/Tournaments, partly for better analytics
] as const

type Overlap = Overlaps<[AnyGameModeType, typeof anyGameMode[number]]>[3]

type AnyGameModeIsExhaustive = ExpectNever<
  AnyGameModeType extends Overlap ? never : ['Missing game mode!']
>
void undefined as AnyGameModeIsExhaustive
const _assertAnyGameModeHasNoExtraKeys: readonly AnyGameModeType[] = anyGameMode
void _assertAnyGameModeHasNoExtraKeys

export function isAnyGameMode(mode: any): mode is AnyGameMode {
  return anyGameMode.includes(mode)
}

type SubsetOfTuple<U extends ReadonlyArray<any>> = ReadonlyArray<U[number]>

const _AUTHENTICATED_GAME_MODES = [
  mode.RANKED_DISCOVERY,
  mode.RANKED_CONSTRUCTED,
  mode.CONQUEST_DISCOVERY,
  mode.CONQUEST_CONSTRUCTED,
  mode.CHALLENGE_CONSTRUCTED,
  mode.CHALLENGE_DISCOVERY,
  mode.PRACTICE_BOT,
  mode.PRACTICE_PVP,
  mode.WARM_UP,
  mode.TUTORIAL
] as const
const _authenticatedGameModesCheck: SubsetOfTuple<typeof anyGameMode> =
  _AUTHENTICATED_GAME_MODES
void _authenticatedGameModesCheck

const _ONLINE_GAME_MODES = [
  mode.RANKED_DISCOVERY,
  mode.RANKED_CONSTRUCTED,
  mode.CONQUEST_DISCOVERY,
  mode.CONQUEST_CONSTRUCTED,
  mode.CHALLENGE_CONSTRUCTED,
  mode.CHALLENGE_DISCOVERY,
  mode.PRACTICE_BOT,
  mode.PRACTICE_PVP,
  mode.WARM_UP
] as const
const _onlineGameModesCheck: SubsetOfTuple<typeof _AUTHENTICATED_GAME_MODES> =
  _ONLINE_GAME_MODES
void _onlineGameModesCheck

const _TURN_TIMER_GAME_MODES = [
  mode.RANKED_DISCOVERY,
  mode.RANKED_CONSTRUCTED,
  mode.CONQUEST_DISCOVERY,
  mode.CONQUEST_CONSTRUCTED,
  mode.CHALLENGE_CONSTRUCTED,
  mode.CHALLENGE_DISCOVERY,
  mode.PRACTICE_PVP,
  mode.WARM_UP,
  LocalGameMode.SPECTATE
] as const

const _BOT_GAME_MODES = [
  mode.PRACTICE_BOT,
  mode.WARM_UP,
  mode.TUTORIAL,
  LocalGameMode.LOCAL_BOT,
  LocalGameMode.SANDBOX
] as const
const _botGameModesCheck: SubsetOfTuple<typeof anyGameMode> = _BOT_GAME_MODES
void _botGameModesCheck

const _CONQUEST_GAME_MODES = [
  mode.CONQUEST_CONSTRUCTED,
  mode.CONQUEST_DISCOVERY
] as const
const _conquestGameModesCheck: SubsetOfTuple<typeof anyGameMode> =
  _CONQUEST_GAME_MODES
void _conquestGameModesCheck

const _RANKED_GAME_MODES = [
  mode.RANKED_CONSTRUCTED,
  mode.RANKED_DISCOVERY
] as const
const _rankedGameModesCheck: SubsetOfTuple<typeof anyGameMode> =
  _RANKED_GAME_MODES
void _rankedGameModesCheck

const _REPLAYABLE_GAME_MODES = [
  ..._RANKED_GAME_MODES,
  ..._CONQUEST_GAME_MODES,
  mode.CHALLENGE_CONSTRUCTED,
  mode.CHALLENGE_DISCOVERY
] as const

const _replayableGameModesCheck: SubsetOfTuple<typeof anyGameMode> =
  _REPLAYABLE_GAME_MODES
void _replayableGameModesCheck

const _LEAVE_PENALTY_MODES = [
  ..._CONQUEST_GAME_MODES,
  ..._RANKED_GAME_MODES
] as const
const _leavePenaltyModesCheck: SubsetOfTuple<typeof _AUTHENTICATED_GAME_MODES> =
  _LEAVE_PENALTY_MODES
void _leavePenaltyModesCheck

const _NO_ACTIONS_MODES = [
  LocalGameMode.REPLAY,
  LocalGameMode.SPECTATE
] as const
const _noActionsModesCheck: SubsetOfTuple<typeof anyGameMode> =
  _NO_ACTIONS_MODES
void _noActionsModesCheck

const _DISCOVERY_GAME_MODES = [
  mode.RANKED_DISCOVERY,
  mode.CONQUEST_DISCOVERY,
  mode.CHALLENGE_DISCOVERY
] as const

const _CONSTRUCTED_GAME_MODES = [
  mode.RANKED_CONSTRUCTED,
  mode.CONQUEST_CONSTRUCTED,
  mode.UNKNOWN,
  mode.CHALLENGE_CONSTRUCTED,
  mode.PRACTICE_BOT,
  mode.PRACTICE_PVP,
  mode.WARM_UP,
  mode.TUTORIAL,
  LocalGameMode.LOCAL_BOT,
  LocalGameMode.REPLAY,
  LocalGameMode.SPECTATE,
  LocalGameMode.SANDBOX
] as const

type DiscoveryModes = typeof _DISCOVERY_GAME_MODES[number]
type ConstructedModes = typeof _CONSTRUCTED_GAME_MODES[number]

type DiscoveryAndConstructedDontOverlapCheck = ExpectNever<
  Overlaps<[DiscoveryModes, ConstructedModes]>
>
void undefined as DiscoveryAndConstructedDontOverlapCheck

type AllModes = `${DiscoveryModes | ConstructedModes}`
const discoveryAndConstructedAreExhaustiveCheck: readonly AllModes[] =
  anyGameMode
void discoveryAndConstructedAreExhaustiveCheck

export const isDiscoveryGame = (
  gameMode: any
): gameMode is typeof _DISCOVERY_GAME_MODES[number] =>
  (_DISCOVERY_GAME_MODES as readonly AnyGameMode[]).includes(gameMode)
export const isConstructedGame = (
  gameMode: any
): gameMode is typeof _CONSTRUCTED_GAME_MODES[number] =>
  (_CONSTRUCTED_GAME_MODES as readonly AnyGameMode[]).includes(gameMode)

export const isBotGame = (
  gameMode: any
): gameMode is typeof _BOT_GAME_MODES[number] =>
  Boolean((_BOT_GAME_MODES as readonly AnyGameMode[]).includes(gameMode))

export const isOnlineGame = (
  gameMode: any
): gameMode is typeof _ONLINE_GAME_MODES[number] =>
  (_ONLINE_GAME_MODES as readonly AnyGameMode[]).includes(gameMode)
export const isTurnTimerGame = (
  gameMode: any
): gameMode is typeof _TURN_TIMER_GAME_MODES[number] =>
  (_TURN_TIMER_GAME_MODES as readonly AnyGameMode[]).includes(gameMode)

export const isAuthenticatedGame = (
  gameMode: any
): gameMode is typeof _AUTHENTICATED_GAME_MODES[number] =>
  (_AUTHENTICATED_GAME_MODES as readonly AnyGameMode[]).includes(gameMode)

export const isReplayGame = (gameMode: any): gameMode is LocalGameMode.REPLAY =>
  gameMode === LocalGameMode.REPLAY

export const isRankedGame = (
  gameMode: any
): gameMode is typeof _RANKED_GAME_MODES[number] =>
  (_RANKED_GAME_MODES as readonly AnyGameMode[]).includes(gameMode)

export const isReplayableGame = (
  gameMode: any
): gameMode is typeof _REPLAYABLE_GAME_MODES[number] =>
  (_REPLAYABLE_GAME_MODES as readonly AnyGameMode[]).includes(gameMode)

export const isConquestGame = (
  gameMode: any
): gameMode is typeof _CONQUEST_GAME_MODES[number] =>
  (_CONQUEST_GAME_MODES as readonly AnyGameMode[]).includes(gameMode)

export const isLeavePenaltyGame = (
  gameMode: any
): gameMode is typeof _LEAVE_PENALTY_MODES[number] =>
  (_LEAVE_PENALTY_MODES as readonly AnyGameMode[]).includes(gameMode)

export const isNoActionsGameMode = (
  gameMode: any
): gameMode is typeof _NO_ACTIONS_MODES[number] =>
  (_NO_ACTIONS_MODES as readonly AnyGameMode[]).includes(gameMode)
