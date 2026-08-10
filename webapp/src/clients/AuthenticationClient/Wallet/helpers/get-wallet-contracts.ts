import {
  ERC20,
  ERC20__factory,
  ERC20Wrapper,
  ERC20Wrapper__factory
} from '@0xsequence/erc20-meta-token'
import { ChainId, nodesURL } from '@0xsequence/network'
import {
  NiftyswapExchange20,
  NiftyswapExchange20__factory
} from '@0xsequence/niftyswap'
import { JsonRpcProvider } from '@ethersproject/providers'
import {
  ConquestEntriesFactory,
  ConquestEntriesFactory__factory,
  ConquestV2,
  ConquestV2__factory,
  SkyweaverAssets as OpenSkyAssets,
  SkyweaverAssets__factory as OpenSkyAssets__factory
} from '@horizongames/skyweaver-contracts'
import { FreeConquestEntriesFactory__factory } from '@opensky/chain'
import { FreeConquestEntriesFactory } from '@opensky/chain'
import { LegacyHeroSale__factory } from '@opensky/chain'
import { LegacyHeroSale } from '@opensky/chain'
import * as dev_contract from '@opensky/chain/networks/MATIC_DEVELOPMENT.json'
import * as local_contract from '@opensky/chain/networks/MATIC_LOCAL.json'
import * as prod_contract from '@opensky/chain/networks/MATIC_PRODUCTION.json'
import * as stg_contract from '@opensky/chain/networks/MATIC_STAGING.json'

import env from '~/env'
import { captureError } from '~/shared/helpers/sentry'

interface ContractSchema {
  contractName: string
  address: string
}

export interface OpenSkyContracts {
  OpenSkyAssets: OpenSkyAssets
  USDC: ERC20
  tokenWrapper: ERC20Wrapper
  NiftyswapExchange: NiftyswapExchange20
  ConquestEntriesFactory: ConquestEntriesFactory
  Conquest: ConquestV2
  FreeConquestEntriesFactory: FreeConquestEntriesFactory
  LegacyHeroSale: LegacyHeroSale
}

const getContract = (): any => {
  if (env.CONTRACT_ENV === 'MATIC_DEVELOPMENT') return dev_contract
  if (env.CONTRACT_ENV === 'MATIC_PRODUCTION') return prod_contract
  if (env.CONTRACT_ENV === 'MATIC_STAGING') return stg_contract
  return local_contract
}

const getContractInstance = (contractName: string): ContractSchema => {
  const contractArtifacts = getContract().default

  const contract: ContractSchema | undefined = contractArtifacts.find(
    (c) => c.contractName === contractName
  )
  try {
    if (!contract) {
      throw new Error(`Cannot Find Deployed Contract Instance for: ${contractName}`)
    }
  } catch (err) {
    captureError(err, `Cannot find deployed contract instance for: ${contractName}`)
  }

  return contract || { contractName: '', address: '' }
}

export const getWalletContracts = () => {
  const provider = new JsonRpcProvider(nodesURL('polygon'), ChainId.POLYGON)

  return {
    OpenSkyAssets: OpenSkyAssets__factory.connect(
      getContractInstance('OpenSkyAssets').address,
      provider
    ),
    USDC: ERC20__factory.connect(getContractInstance('USDC').address, provider),
    tokenWrapper: ERC20Wrapper__factory.connect(
      getContractInstance('ERC20Wrapper').address,
      provider
    ),
    NiftyswapExchange: NiftyswapExchange20__factory.connect(
      getContractInstance('NiftyswapExchange').address,
      provider
    ),
    ConquestEntriesFactory: ConquestEntriesFactory__factory.connect(
      getContractInstance('ConquestEntriesFactory').address,
      provider
    ),
    Conquest: ConquestV2__factory.connect(
      getContractInstance('Conquest').address,
      provider
    ),
    FreeConquestEntriesFactory: FreeConquestEntriesFactory__factory.connect(
      getContractInstance('FreeConquestEntriesFactory').address,
      provider
    ),
    LegacyHeroSale: LegacyHeroSale__factory.connect(
      getContractInstance('LegacyHeroSale').address,
      provider
    )
  }
}
