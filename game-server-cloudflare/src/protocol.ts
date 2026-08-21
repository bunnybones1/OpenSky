import {
  Emotes,
  GameServerMessage
} from '@opensky/shared/game-server-message-types'
import { MatchmakerStartMatchMessage } from '@opensky/shared/matchmaker-message-types'

export const INTERNAL_AUTH_HEADER = 'x-cloud-weasel-internal-auth'
export const TRUSTED_PRINCIPAL_HEADER = 'x-cloud-weasel-principal'
export const TRUSTED_USER_ID_HEADER = 'x-cloud-weasel-user-id'
export const TRUSTED_ANONYMOUS_SPECTATOR_HEADER =
  'x-cloud-weasel-anonymous-spectator'
export const MATCH_PATH_PREFIX = '/v1/matches/'
export const MAX_GAME_MESSAGE_BYTES = 256 * 1024

export interface CreateMatchRequest {
  proposalId: string
  releaseVersion: string
  match: MatchmakerStartMatchMessage
}

export type AcceptedClientMessage = Extract<
  GameServerMessage,
  {
    type:
      | 'join_server'
      | 'spectate_server'
      | 'gameplay'
      | 'timesync'
      | 'player_loading_progress'
      | 'emote'
      | 'mute_opponent'
      | 'error'
  }
>

export class GameProtocolError extends Error {}
export class IgnoredGameMessageError extends GameProtocolError {}
export class UnknownGameMessageError extends GameProtocolError {}
export class SourceGameError extends GameProtocolError {
  constructor(
    message: string,
    readonly level: 'user' | 'server'
  ) {
    super(message)
  }
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const decodeClientFrame = (raw: string | ArrayBuffer) => {
  const bytes =
    typeof raw === 'string'
      ? new TextEncoder().encode(raw)
      : new Uint8Array(raw)
  if (bytes.byteLength > MAX_GAME_MESSAGE_BYTES) {
    throw new GameProtocolError('message is too large')
  }
  return typeof raw === 'string' ? raw : new TextDecoder().decode(bytes)
}

export const parseSourcePing = (
  frame: string
): { handled: false } | { handled: true; id?: string } => {
  if (!frame.startsWith('PING')) return { handled: false }
  const fields = frame.split(':')
  return fields.length < 2
    ? { handled: true }
    : { handled: true, id: fields[1] }
}

export const parseClientMessage = (raw: string | ArrayBuffer) => {
  const frame = decodeClientFrame(raw)
  let value: unknown
  try {
    value = JSON.parse(frame)
  } catch {
    throw new IgnoredGameMessageError('message is not valid JSON')
  }
  if (value === null) {
    // MatchManager catches the source null-property error and leaves the
    // connection open, which is observable as the same silent ignore as a
    // JSON decode failure.
    throw new IgnoredGameMessageError('message is null')
  }
  if (!record(value) || typeof value.type !== 'string') {
    throw new UnknownGameMessageError('message type is required')
  }
  switch (value.type) {
    case 'join_server': {
      if (!record(value.subkeyCertification)) {
        throw new GameProtocolError('subkey certification is required')
      }
      const subkey = value.subkeyCertification.subkey
      if (
        !Array.isArray(subkey) ||
        subkey.length !== 20 ||
        subkey.some(byte => !Number.isInteger(byte) || byte < 0 || byte > 255)
      ) {
        throw new GameProtocolError('invalid subkey')
      }
      if (
        typeof value.loadingProgress !== 'number' ||
        !Number.isFinite(value.loadingProgress) ||
        value.loadingProgress < 0 ||
        value.loadingProgress > 1
      ) {
        throw new GameProtocolError('invalid loading progress')
      }
      return value as unknown as AcceptedClientMessage
    }
    case 'spectate_server': {
      if (
        typeof value.spectateToken !== 'string' ||
        value.spectateToken.length > 256 ||
        (value.authToken !== null && typeof value.authToken !== 'string')
      ) {
        throw new GameProtocolError('invalid spectate request')
      }
      const [spectatedPlayer, ...codes] = value.spectateToken.split('.')
      if (!spectatedPlayer) {
        throw new SourceGameError('invalid spectate player', 'server')
      }
      if (codes.length > 2 || codes.some(code => code.length > 50)) {
        throw new SourceGameError('invalid spectate code', 'server')
      }
      return value as unknown as AcceptedClientMessage
    }
    case 'gameplay':
      if (
        !Array.isArray(value.data) ||
        value.data.length === 0 ||
        value.data.length > 64 ||
        value.data.some(
          diff =>
            typeof diff !== 'string' ||
            diff.length > MAX_GAME_MESSAGE_BYTES ||
            !/^0x(?:[0-9a-f]{2})+$/i.test(diff)
        )
      ) {
        throw new GameProtocolError('invalid gameplay diffs')
      }
      return value as unknown as AcceptedClientMessage
    case 'timesync':
      if (
        typeof value.clientTime !== 'number' ||
        !Number.isFinite(value.clientTime)
      ) {
        throw new GameProtocolError('invalid client time')
      }
      return value as unknown as AcceptedClientMessage
    case 'player_loading_progress':
      if (
        typeof value.progress !== 'number' ||
        !Number.isFinite(value.progress) ||
        value.progress < 0 ||
        value.progress > 1
      ) {
        throw new GameProtocolError('invalid loading progress')
      }
      return value as unknown as AcceptedClientMessage
    case 'mute_opponent':
      if (typeof value.muted !== 'boolean')
        throw new GameProtocolError('invalid mute value')
      return value as unknown as AcceptedClientMessage
    case 'emote':
      if (
        [
          typeof value.emote === 'string' &&
            Emotes.includes(value.emote as never),
          typeof value.chat === 'string',
          Number.isSafeInteger(value.sticker) && (value.sticker as number) >= 0
        ].filter(Boolean).length !== 1
      ) {
        throw new GameProtocolError('invalid emote')
      }
      return value as unknown as AcceptedClientMessage
    case 'error':
      return value as unknown as AcceptedClientMessage
    default:
      throw new UnknownGameMessageError('unsupported message type')
  }
}

export const stateError = (error: unknown) => ({
  type: 'error' as const,
  message: `Error: ${
    error instanceof Error
      ? error.message
      : typeof error === 'object'
        ? JSON.stringify(error)
        : String(error)
  }`,
  level: 'state' as const
})
