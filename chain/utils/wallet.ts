import { ethers } from 'ethers'
import { EnvTypes, NetworkTypes, OwnerTypes } from '@opensky/chain-model'
import * as dotenv from 'dotenv'
dotenv.config()

export const getProvider = (
  network: NetworkTypes
): ethers.providers.JsonRpcProvider => {
  switch (network) {
    case NetworkTypes.MUMBAI:
      return new ethers.providers.JsonRpcProvider(
        'https://rpc-mumbai.matic.today'
      )

    case NetworkTypes.MATIC: {
      // Set MATIC_RPC_URL to your authenticated Polygon RPC endpoint (for example: Infura, Alchemy, or Sequence).
      const maticRpcUrl =
        process.env.MATIC_RPC_URL || 'https://nodes.sequence.app/polygon'
      return new ethers.providers.JsonRpcProvider(maticRpcUrl, 137)
    }

    case NetworkTypes.GANACHE:
      return new ethers.providers.JsonRpcProvider('http://localhost:8545')

    default:
      // NetworkTypes.RINKEBY
      // NetworkTypes.KOVAN
      return new ethers.providers.InfuraProvider(
        network,
        process.env.INFURA_API_KEY
      )
  }
}
export const getWallet = (
  type: EnvTypes,
  provider: ethers.providers.Provider
): ethers.Wallet => {
  let privateKey

  switch (type) {
    case EnvTypes.LOCAL:
      privateKey = process.env.LOCAL_OWNER_PRIVATE_KEY
      break
    case EnvTypes.DEVELOPMENT:
      privateKey = process.env.DEV_OWNER_PRIVATE_KEY
      break
    case EnvTypes.STAGING:
      privateKey = process.env.STAGING_OWNER_PRIVATE_KEY
      break
    case EnvTypes.PRODUCTION:
      privateKey = process.env.PRODUCTION_OWNER_PRIVATE_KEY
      break
    default:
      throw new Error(`invalid wallet type`)
  }

  console.log(privateKey)
  const wallet = new ethers.Wallet(privateKey, provider)

  console.log('\n')
  console.log(wallet.address, '<-- SIGNER')
  console.log('\n')

  return wallet
}

export interface BaseWallet {
  address: string
  sendTransaction: (
    txn: ethers.providers.TransactionRequest,
    confirmations?: number
  ) => Promise<any>
}
class EOAWallet implements BaseWallet {
  constructor(private wallet: ethers.Wallet) {}

  get address() {
    return this.wallet.address
  }

  sendTransaction = async (
    txn: ethers.providers.TransactionRequest,
    confirmations?: number
  ) => {
    try {
      const sent = await this.wallet.sendTransaction(txn)
      await sent.wait(confirmations)
    } catch (error) {
      console.log('TX ERROR:', error)
    }
  }
}

export class OperatorWallet {
  static async create(
    _env: EnvTypes,
    _network: NetworkTypes,
    _ownerType: OwnerTypes,
    _ownerAddress? : string
  ): Promise<ethers.Wallet> {
    const wallet = getWallet(_env, getProvider(_network))

    if (_ownerType === 'EOA') {
      if (_ownerAddress && wallet.address.toLowerCase() !== _ownerAddress.toLowerCase()) {
        throw new Error(`signer address ${wallet.address.toLowerCase()} does not match owner EOA address ${_ownerAddress.toLowerCase()}`)
      }

      return wallet//new EOAWallet(wallet)
    }

    throw new Error('invalid _ownerType')
  }
}

export class SenderWallet {
  static async create(
    _env: EnvTypes,
    _network: NetworkTypes,
    _ownerType: OwnerTypes,
    _senderAddress?: string
  ): Promise<BaseWallet> {
    const wallet = getWallet(_env, getProvider(_network))

    if (_ownerType === 'EOA') {
      return new EOAWallet(wallet)
    }

    throw new Error('invalid _ownerType or _senderAddress')
  }
}