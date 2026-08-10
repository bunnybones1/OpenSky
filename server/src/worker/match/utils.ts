import { ErrorMessage } from '@opensky/shared/game-server-message-types'
import { getDiffDebugString } from '@skyweaver/state-node-sys'
import { ethers } from 'ethers'
import { parentPort } from 'worker_threads'

import { logger } from '../../utils/logger'
import {
  MatchCreatedMessage,
  MatchEndedMessage,
  MatchRecordDoneMessage,
  MatchStatusInfoMessage,
  MatchThreadInactiveMessage,
  MatchThreadRestartRequestMessage,
  ThreadTransportMessage
} from './TransportModels'

export const diffDecoder = (diff: string | Uint8Array): string | null => {
  try {
    const difflog = getDiffDebugString(ethers.utils.arrayify(diff))

    const action = difflog.substring(
      difflog.indexOf('actions:'),
      difflog.indexOf('proof_signature:')
    )

    return action
  } catch (error) {
    logger.error('ERROR LOGGING DIFF', { diff, error })
    return null
  }
}

export const post = (
  message:
    | MatchCreatedMessage
    | MatchEndedMessage
    | MatchRecordDoneMessage
    | MatchThreadInactiveMessage
    | MatchThreadRestartRequestMessage
    | MatchStatusInfoMessage
    | ThreadTransportMessage
) => {
  parentPort!.postMessage(message)
}

// Error formatter
export const errorMessage = (err: any): ErrorMessage => {
  return {
    type: 'error',
    message: `Error: ${
      typeof err === 'object' && 'message' in err ? err.message : err
    }`,
    level:
      typeof err === 'string' && err.toLowerCase().includes('soft')
        ? 'user'
        : 'state'
  }
}

export function toHex(_: string, value: any) {
  if (typeof value === 'object' && value instanceof Uint8Array) {
    return ethers.utils.hexlify(value)
  } else {
    return value
  }
}
