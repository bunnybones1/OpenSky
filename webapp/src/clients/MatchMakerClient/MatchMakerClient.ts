import { isValidTypedDataSignature } from '@0xsequence/provider'
import {
  WEBSOCKET_FORCED_CLOSE_CODE,
  WEBSOCKET_NORMAL_CLOSE_CODE
} from '@opensky/shared/constants'
import { SubkeyCertification } from '@opensky/shared/game-server-message-types'
import {
  FindMatchMessage,
  MatchmakerMessage
} from '@opensky/shared/matchmaker-message-types'
import {
  getCachedSubkeyCertification,
  getOrCreateSubkey,
  setCachedSubkeyCertification,
  SubkeyProof
} from '@opensky/shared/subkey'
import { ethers } from 'ethers'

import env from '~/env'
import { AuthenticationClient } from '~/shared/clients'
import { captureError } from '~/shared/helpers/sentry'
import { updatePlayState } from '~/shared/state/play-state'

import { WebSocketClient } from '../WebsocketClient'
import * as messageHandlers from './handlers'
import { MatchMakerStatus } from './shared/types'

export class _MatchMakerClient_DONT_USE_DIRECTLY {
  readonly ws: WebSocketClient

  constructor() {
    this.ws = new WebSocketClient(env.MATCHMAKER_URL, this.onMessage, this.onFailed)
  }

  private onFailed = (e: any) => {
    captureError(new Error(JSON.stringify(e)), 'Matchmaker Error')
    updatePlayState('matchMakerStatus', MatchMakerStatus.SEARCH_ERRORED)
  }

  private onMessage = (ev: MessageEvent) => {
    const data = JSON.parse(ev.data)

    if (!('type' in data)) {
      return
    }

    const message = data as MatchmakerMessage

    switch (message.type) {
      case 'match_made':
        break
      case 'match_ready_to_start':
        messageHandlers.onMatchReady(data)
        break
      case 'accept_match':
        messageHandlers.onPlayerAccepted(data)
        break
      case 'decline_match': {
        this.ws.manual_disconnect()
        messageHandlers.onPlayerDeclined(data)
        break
      }
      case 'match_found':
        messageHandlers.onMatchFound(data)
        break
      case 'match_refusal_cooldown': {
        this.ws.manual_disconnect()
        messageHandlers.onMatchRefusalCooldown(/* data */)
        break
      }
      case 'timed_out': {
        this.ws.manual_disconnect()
        messageHandlers.onTimedOut()
        break
      }
      case 'error': {
        if (!!data.reason) {
          const code =
            data.reason === 'DUPLICATE_CONNECTION'
              ? WEBSOCKET_FORCED_CLOSE_CODE
              : WEBSOCKET_NORMAL_CLOSE_CODE

          this.ws.manual_disconnect(code)
        }

        messageHandlers.onError(data)
        break
      }
      default:
        console.error('UNKNOWN MESSAGE', data)
        break
    }
  }

  // Enters the player into the queue
  findMatch = async (message: FindMatchMessage) => {
    return new Promise((res, rej) => {
      this.ws
        .connect()
        .then(() => {
          this.ws.reconnectMessage = message
          this.ws.send(message)
          updatePlayState('matchMakerStatus', MatchMakerStatus.SEARCHING)
          res(true)
        })
        .catch((e) => {
          this.onFailed(e)
          rej(e)
        })
    })
  }

  generateSubkeyCertification = async (): Promise<SubkeyCertification> => {
    const provider = AuthenticationClient.wallet?.provider
    const wallet = ethers.Wallet.createRandom()
    const realWalletAddress = AuthenticationClient.wallet?.address

    if (!provider || !realWalletAddress) {
      captureError(
        new Error('invalid wallet'),
        'Subkey Certification Creation Failed'
      )
      throw new Error('invalid wallet')
    }

    const walletAddress = await wallet.getAddress()

    const subkey = getOrCreateSubkey()
    const cachedCertificationSignature = getCachedSubkeyCertification(subkey)

    const isSignatureValid = async (
      typedData: any,
      sig: string
    ): Promise<boolean> => {
      const isValid = await isValidTypedDataSignature(
        walletAddress,
        typedData,
        sig,
        provider
      )

      return !!isValid
    }

    const proof = new SubkeyProof(walletAddress, subkey.address)

    let signature

    if (cachedCertificationSignature) {
      const isCachedCertificationValid = await isSignatureValid(
        proof.messageTypedData(),
        cachedCertificationSignature
      )

      if (isCachedCertificationValid) {
        signature = cachedCertificationSignature
      }
    }

    if (!signature) {
      const messageTypedData = proof.messageTypedData()

      try {
        const certificationSignature = await wallet._signTypedData(
          messageTypedData.domain,
          messageTypedData.types,
          messageTypedData.message
        )

        const verifyNewSignature = await isSignatureValid(
          messageTypedData,
          certificationSignature
        )

        if (!verifyNewSignature) {
          throw new Error('generated invalid subkey signature')
        }

        setCachedSubkeyCertification(subkey, certificationSignature)

        signature = certificationSignature

        AuthenticationClient.wallet?.closeWalletWindow()
      } catch (error) {
        AuthenticationClient.wallet?.closeWalletWindow()
        throw error
      }
    }

    return {
      player: Array.from(ethers.utils.arrayify(realWalletAddress)),
      subkey: Array.from(ethers.utils.arrayify(subkey.address)),
      signature: Array.from(ethers.utils.arrayify(signature))
    }
  }
}
