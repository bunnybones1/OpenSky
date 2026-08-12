import { GameMode } from '@opensky/proto'
import { areMatchModesCompatible } from '@opensky/shared/match-modes'

export const INTERNAL_AUTH_HEADER = 'x-cloud-weasel-internal-auth'
export const BOT_PLACEHOLDER = '0x0000000000000000000000000000000000000000'
export const MAX_DISPATCH_BYTES = 512 * 1024

export interface AcceptedMatchPlayer {
  address: string
  mode: GameMode
  playerSessionId: string
  clientVersionHash: string
}

export interface AcceptedMatchRequest {
  type: 'find_match'
  privateSeed: Record<string, unknown>
  playerSessionID: string
  mode: GameMode
  versionHash: string
}

export interface AcceptedMatchIdentity {
  principal: string
  userId: string
  displayName: string
}

export interface AcceptedMatchParticipant {
  player: AcceptedMatchPlayer
  request?: AcceptedMatchRequest
  identity?: AcceptedMatchIdentity
}

export interface AcceptedMatchDispatch {
  proposalId: string
  participants: [AcceptedMatchParticipant, AcceptedMatchParticipant]
  createdAtMs: number
}

export class DispatchProtocolError extends Error {}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const gameModes = new Set(Object.values(GameMode))

export const parseAcceptedMatchDispatch = (
  value: unknown
): AcceptedMatchDispatch => {
  if (
    !record(value) ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(String(value.proposalId ?? ''))
  ) {
    throw new DispatchProtocolError('invalid proposal ID')
  }
  if (
    !Number.isSafeInteger(value.createdAtMs) ||
    (value.createdAtMs as number) <= 0 ||
    !Array.isArray(value.participants) ||
    value.participants.length !== 2
  ) {
    throw new DispatchProtocolError('invalid accepted proposal')
  }

  const participants = value.participants.map(raw => {
    if (!record(raw) || !record(raw.player)) {
      throw new DispatchProtocolError('invalid participant')
    }
    const player = raw.player
    if (
      !/^0x[0-9a-f]{40}$/.test(String(player.address ?? '')) ||
      !gameModes.has(player.mode as GameMode) ||
      typeof player.playerSessionId !== 'string' ||
      player.playerSessionId.length > 128 ||
      typeof player.clientVersionHash !== 'string' ||
      player.clientVersionHash.length > 128
    ) {
      throw new DispatchProtocolError('invalid matchmaker player')
    }
    const normalizedPlayer: AcceptedMatchPlayer = {
      address: player.address as string,
      mode: player.mode as GameMode,
      playerSessionId: player.playerSessionId as string,
      clientVersionHash: player.clientVersionHash as string
    }
    if (player.address === BOT_PLACEHOLDER) {
      if (raw.request !== undefined || raw.identity !== undefined) {
        throw new DispatchProtocolError(
          'bot participant contains human identity'
        )
      }
      return { player: normalizedPlayer }
    }
    if (!record(raw.request) || !record(raw.identity)) {
      throw new DispatchProtocolError(
        'human participant is missing identity data'
      )
    }
    if (
      raw.identity.principal !== player.address ||
      typeof raw.identity.userId !== 'string' ||
      raw.identity.userId.length === 0 ||
      raw.identity.userId.length > 256 ||
      typeof raw.identity.displayName !== 'string' ||
      raw.identity.displayName.length > 256 ||
      raw.request.type !== 'find_match' ||
      raw.request.mode !== player.mode ||
      !record(raw.request.privateSeed) ||
      typeof raw.request.playerSessionID !== 'string' ||
      raw.request.playerSessionID !== player.playerSessionId ||
      raw.request.versionHash !== player.clientVersionHash
    ) {
      throw new DispatchProtocolError('participant identity contract mismatch')
    }
    return {
      player: normalizedPlayer,
      request: raw.request as unknown as AcceptedMatchRequest,
      identity: raw.identity as unknown as AcceptedMatchIdentity
    }
  }) as [AcceptedMatchParticipant, AcceptedMatchParticipant]

  if (
    !areMatchModesCompatible([
      participants[0].player.mode,
      participants[1].player.mode
    ])
  ) {
    throw new DispatchProtocolError('participants use incompatible game modes')
  }
  if (
    participants[0].player.address !== BOT_PLACEHOLDER &&
    participants[0].player.address === participants[1].player.address
  ) {
    throw new DispatchProtocolError('duplicate participant')
  }
  if (
    participants.every(
      participant => participant.player.address === BOT_PLACEHOLDER
    )
  ) {
    throw new DispatchProtocolError('bot-only matches are not supported')
  }

  return {
    proposalId: value.proposalId as string,
    participants,
    createdAtMs: value.createdAtMs as number
  }
}
