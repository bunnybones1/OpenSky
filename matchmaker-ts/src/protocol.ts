import { GameMode } from '@opensky/proto'
import { normalizeGoogleUUID } from '@opensky/shared/uuid'

export const MATCHMAKER_PATH = '/v1/matchmaker'
export const MAX_CLIENT_MESSAGE_BYTES = 64 * 1024

export interface FindMatchCommand {
  type: 'find_match'
  authToken?: string
  privateSeed: Record<string, unknown>
  sessionID: string
  mode: GameMode
  versionHash: string
  playerSessionID: string
  verifyToken?: unknown
}

export interface AcceptMatchCommand {
  type: 'accept_match'
  playerID?: string
}

export interface DeclineMatchCommand {
  type: 'decline_match'
  playerID?: string
}

export interface PingCommand {
  type: 'ping'
}

export type MatchmakerClientCommand =
  | FindMatchCommand
  | AcceptMatchCommand
  | DeclineMatchCommand
  | PingCommand

export interface MatchmakerErrorMessage {
  type: 'error'
  reason: string
  message: string
  level: 'server'
}

export type MatchmakerServerMessage =
  | {
      type: 'match_found'
      mode: GameMode
      timeoutMs: number
      playerIDs: string[]
    }
  | { type: 'accept_match'; playerID: string }
  | { type: 'decline_match'; playerID: string }
  | { type: 'match_made'; serverAddress: string }
  | { type: 'match_ready_to_start'; mode: GameMode }
  | { type: 'match_refusal_cooldown'; durationSeconds: number }
  | { type: 'timed_out' }
  | MatchmakerErrorMessage

const matchmakerModes = new Set<GameMode>([
  GameMode.RANKED_CONSTRUCTED,
  GameMode.CHALLENGE_CONSTRUCTED,
  GameMode.PRACTICE_BOT,
  GameMode.RANKED_DISCOVERY,
  GameMode.CONQUEST_CONSTRUCTED,
  GameMode.CONQUEST_DISCOVERY,
  GameMode.WARM_UP,
  GameMode.CHALLENGE_DISCOVERY,
  GameMode.PRACTICE_PVP
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const boundedString = (value: unknown, maximum: number) =>
  typeof value === 'string' && value.length <= maximum

export class ProtocolError extends Error {
  constructor(
    readonly reason: string,
    message: string
  ) {
    super(message)
  }
}

export const parseClientCommand = (
  raw: string | ArrayBuffer
): MatchmakerClientCommand => {
  if (typeof raw !== 'string') {
    throw new ProtocolError(
      'INVALID_OPERATION',
      'binary messages are not supported'
    )
  }
  if (new TextEncoder().encode(raw).byteLength > MAX_CLIENT_MESSAGE_BYTES) {
    throw new ProtocolError('INVALID_OPERATION', 'message is too large')
  }

  // The original browser client has always sent this literal heartbeat. The Go
  // matcher rewrites it to {"type":"ping"} before decoding, so preserve that
  // wire compatibility instead of treating a healthy client as malformed.
  if (raw === 'PING') return { type: 'ping' }

  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new ProtocolError('INVALID_OPERATION', 'message is not valid JSON')
  }
  if (!isRecord(value) || typeof value.type !== 'string') {
    throw new ProtocolError('INVALID_OPERATION', 'message type is required')
  }

  switch (value.type) {
    case 'ping':
      return { type: 'ping' }
    case 'accept_match':
      if (value.playerID !== undefined && !boundedString(value.playerID, 128)) {
        throw new ProtocolError('INVALID_OPERATION', 'invalid playerID')
      }
      return {
        type: 'accept_match',
        playerID: value.playerID as string | undefined
      }
    case 'decline_match':
      if (value.playerID !== undefined && !boundedString(value.playerID, 128)) {
        throw new ProtocolError('INVALID_OPERATION', 'invalid playerID')
      }
      return {
        type: 'decline_match',
        playerID: value.playerID as string | undefined
      }
    case 'find_match': {
      if (!isRecord(value.privateSeed)) {
        throw new ProtocolError(
          'INVALID_PRIVATE_SEED',
          'privateSeed is required'
        )
      }
      if (!matchmakerModes.has(value.mode as GameMode)) {
        throw new ProtocolError('INVALID_OPERATION', 'unsupported game mode')
      }
      if (typeof value.sessionID !== 'string' || value.sessionID.length > 128) {
        throw new ProtocolError('INVALID_OPERATION', 'invalid sessionID')
      }
      if (
        typeof value.versionHash !== 'string' ||
        value.versionHash.length === 0 ||
        value.versionHash.length > 128
      ) {
        throw new ProtocolError('OUTDATED_CLIENT', 'versionHash is required')
      }
      const playerSessionID = normalizeGoogleUUID(value.playerSessionID)
      if (!playerSessionID) {
        throw new ProtocolError(
          'INVALID_OPERATION',
          'playerSessionID must be a UUID'
        )
      }
      return {
        type: 'find_match',
        authToken:
          typeof value.authToken === 'string'
            ? value.authToken.slice(0, 4096)
            : undefined,
        privateSeed: value.privateSeed,
        sessionID: value.sessionID.toUpperCase(),
        mode: value.mode as GameMode,
        versionHash: value.versionHash.toLowerCase(),
        playerSessionID,
        verifyToken: value.verifyToken
      }
    }
    default:
      throw new ProtocolError('INVALID_OPERATION', 'unsupported message type')
  }
}

export const errorMessage = (
  reason: string,
  message = reason
): MatchmakerErrorMessage => ({
  type: 'error',
  reason,
  message,
  level: 'server'
})
