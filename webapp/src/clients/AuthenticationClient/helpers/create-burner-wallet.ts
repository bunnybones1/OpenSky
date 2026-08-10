import { Session } from '@0xsequence/auth'
import { ethers } from 'ethers'

import env from '~/env'

import { SequenceTracker } from '../shared/constants'
import { sequenceOverriddenNetworks } from './sequenceOverriddenNetworks'

export const createBurnerWallet = async (walletEOA: ethers.Wallet) => {
  const session = await Session.singleSigner({
    signer: walletEOA,
    projectAccessKey: env.SEQUENCE_API_KEY,
    settings: {
      tracker: SequenceTracker,
      services: {
        sequenceMetadataUrl: env.SEQUENCE_METADATA_HOST,
        sequenceApiUrl: env.SEQUENCE_API_HOST,
        sequenceApiChainId: env.ETHEREUM_NETWORK_CHAIN_ID,
        metadata: {
          name: 'OpenSky'
        }
      },
      networks: sequenceOverriddenNetworks
    }
  })

  return session.account
}
