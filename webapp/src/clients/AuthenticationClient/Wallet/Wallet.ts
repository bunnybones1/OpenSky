import { Account } from '@0xsequence/account'
import { ChainId } from '@0xsequence/network'
import { sequence } from '0xsequence'
import { ethers } from 'ethers'

import { captureError } from '~/shared/helpers/sentry'

import {
  getWalletContracts,
  OpenSkyContracts
} from './helpers/get-wallet-contracts'

interface WalletConstructorArgs {
  burnerWallet?: Account
  sequenceWallet?: sequence.provider.SequenceProvider
  logout: () => void
}

export class Wallet {
  private burnerWallet: WalletConstructorArgs['burnerWallet']
  private sequenceWallet: WalletConstructorArgs['sequenceWallet']

  public contracts: OpenSkyContracts
  private logout: () => void

  constructor(config: WalletConstructorArgs) {
    if (!!config.burnerWallet) {
      this.burnerWallet = config.burnerWallet
    } else if (!!config.sequenceWallet) {
      this.sequenceWallet = config.sequenceWallet
    }
    this.logout = config.logout
    this.contracts = getWalletContracts()
  }

  get address() {
    if (!!this.sequenceWallet && this.sequenceWallet.isConnected()) {
      return this.sequenceWallet.getAddress()
    }
    if (!!this.burnerWallet) return this.burnerWallet.address

    return
  }

  get isBurnerWallet() {
    return !!this.burnerWallet && !this.sequenceWallet
  }

  get provider() {
    if (!!this.sequenceWallet) {
      return this.sequenceWallet.getProvider(ChainId.POLYGON)
    } else if (!!this.burnerWallet) {
      return this.burnerWallet.providerFor(ChainId.POLYGON)
    }
    return undefined
  }

  public openWalletWindow = async (path?: string): Promise<boolean> => {
    try {
      if (!!this.sequenceWallet) {
        const result = await this.sequenceWallet.openWallet(path)
        return result
      } else {
        // TODO: Open upgrade wallet dialog.
        return false
      }
    } catch (error) {
      if (error.message === 'connect first') {
        this.logout()
      } else {
        captureError(error, 'Opening wallet window')
      }
      return false
    }
  }

  public closeWalletWindow = () => {
    if (!!this.sequenceWallet) {
      this.sequenceWallet.closeWallet()
    }
  }

  public sendTransaction = async (
    transaction: sequence.transactions.Transactionish
  ): Promise<ethers.providers.TransactionResponse | null | undefined> => {
    try {
      if (!!this.sequenceWallet) {
        const signer = this.sequenceWallet.signer

        return await signer.sendTransaction(transaction, {
          chainId: ChainId.POLYGON
        })
      } else if (!!this.burnerWallet) {
        return await this.burnerWallet.sendTransaction(transaction, ChainId.POLYGON)
      } else {
        throw new Error('no wallet.')
      }
    } catch (error) {
      if (error.code === 4001) return
      return null
    }
  }

  public disconnect = () => {
    if (!!this.sequenceWallet) this.sequenceWallet.disconnect()
  }

  public isConnected = () => {
    if (!!this.sequenceWallet) return this.sequenceWallet.isConnected()
    return false
  }

  public signMessage = async (message: string): Promise<string | undefined> => {
    if (!!this.sequenceWallet) {
      const signature = await this.sequenceWallet.signer.signMessage(message, {
        chainId: ChainId.POLYGON
      })
      return signature
    }
    if (!!this.burnerWallet) {
      return await this.burnerWallet.signMessage(message, 137)
    }
    return
  }
}
