import { commons, v2 } from '@0xsequence/core'
import { trackers } from '@0xsequence/sessions'
import { ethers } from 'ethers'

import env from '~/env'

export const SequenceContext = v2.DeployedWalletContext
export const EthersProvider = new ethers.providers.JsonRpcProvider(
  env.ETHEREUM_HOST_PROVIDER
)
export const SequenceReader = new commons.reader.OnChainReader(EthersProvider)
export const SequenceTracker = new trackers.remote.RemoteConfigTracker(
  env.SEQUENCE_SESSIONS_HOST
)
