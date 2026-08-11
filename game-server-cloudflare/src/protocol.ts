import {
  Emotes,
  GameServerMessage
} from '@opensky/shared/game-server-message-types'
import { MatchmakerStartMatchMessage } from '@opensky/shared/matchmaker-message-types'

export const INTERNAL_AUTH_HEADER = 'x-cloud-weasel-internal-auth'
export const TRUSTED_PRINCIPAL_HEADER = 'x-cloud-weasel-principal'
export const TRUSTED_USER_ID_HEADER = 'x-cloud-weasel-user-id'
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
      | 'gameplay'
      | 'timesync'
      | 'player_loading_progress'
      | 'emote'
      | 'mute_opponent'
      | 'abandon_match'
      | 'error'
  }
>

export class GameProtocolError extends Error {}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const parseClientMessage = (raw: string | ArrayBuffer) => {
  if (typeof raw !== 'string')
    throw new GameProtocolError('binary messages are not supported')
  if (new TextEncoder().encode(raw).byteLength > MAX_GAME_MESSAGE_BYTES) {
    throw new GameProtocolError('message is too large')
  }
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new GameProtocolError('message is not valid JSON')
  }
  if (!record(value) || typeof value.type !== 'string') {
    throw new GameProtocolError('message type is required')
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
        !(
          (typeof value.emote === 'string' &&
            Emotes.includes(value.emote as never)) ||
          (typeof value.chat === 'string' && value.chat.length <= 500) ||
          (Number.isInteger(value.sticker) && (value.sticker as number) >= 0)
        )
      ) {
        throw new GameProtocolError('invalid emote')
      }
      return value as unknown as AcceptedClientMessage
    case 'error':
      return value as unknown as AcceptedClientMessage
    case 'abandon_match':
      return value as unknown as AcceptedClientMessage
    default:
      throw new GameProtocolError('unsupported message type')
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
