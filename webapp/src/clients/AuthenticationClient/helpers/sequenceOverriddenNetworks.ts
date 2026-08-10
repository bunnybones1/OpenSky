import { allNetworks } from '@0xsequence/network'

import env from '~/env'

export const sequenceOverriddenNetworks = allNetworks.map((network) =>
  `${network.chainId}` === env.ETHEREUM_NETWORK_CHAIN_ID
    ? {
        ...network,
        rpcUrl: env.ETHEREUM_HOST_PROVIDER,
        indexerUrl: env.SEQUENCE_INDEXER_HOST,
        relayer: {
          provider: { url: env.ETHEREUM_HOST_PROVIDER },
          url: env.SEQUENCE_RELAYER_HOST,
          projectAccessKey: env.SEQUENCE_API_KEY
        }
      }
    : network
)
