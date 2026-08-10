import * as ethers from 'ethers'
import { encodeTypedDataDigest } from '@0xsequence/ethauth'
import { TypedData } from '@0xsequence/utils'

export const SUBKEY_KEY = 'openskySubkey_v2'
export const SUBKEY_CERT_KEY = 'openskySubkey_cert_v2'

// As of July 2023, we no longer bother asking users for valid subkeys.
// They haven't been checked on the serverside for years anyways
// since we use JWT auth.
// We just generate random ones.
export const getOrCreateSubkey = (): ethers.Wallet => {
  const cachedKey = localStorage.getItem(SUBKEY_KEY)
  return cachedKey ? new ethers.Wallet(cachedKey) : createRandomSubkey()
}

const createRandomSubkey = () => {
  const randomWallet = ethers.Wallet.createRandom()
  localStorage.setItem(SUBKEY_KEY, randomWallet.privateKey)
  return randomWallet
}

export const getCachedSubkeyCertification = (
  subkey: ethers.Wallet
): string | null => {
  const cachedCert = localStorage.getItem(SUBKEY_CERT_KEY)

  if (cachedCert) {
    const [certSubkeyAddress, cert] = cachedCert.split(':')
    return certSubkeyAddress === subkey.address ? cert : null
  }

  return null
}

export const setCachedSubkeyCertification = (
  subkey: ethers.Wallet,
  certification: string
) => {
  localStorage.setItem(SUBKEY_CERT_KEY, `${subkey.address}:${certification}`)
}

export const convertAddress = (address: number[] | string) => {
  if (Array.isArray(address)) {
    return ethers.utils.getAddress(ethers.utils.hexlify(address)).toLowerCase()
  } else {
    return address.toLowerCase()
  }
}

export class SubkeyProof {
  address: string
  subkey: string
  signature: string

  constructor(address: string, subkey: string) {
    this.address = address.toLowerCase()
    this.subkey = subkey.toLowerCase()
  }

  messageTypedData(): TypedData {
    return {
      types: {
        Authorize: [
          { name: 'message', type: 'string' },
          { name: 'address', type: 'address' },
          { name: 'subkey', type: 'address' }
        ]
      },
      domain: {
        name: 'OpenSky',
        version: '1'
      },
      message: {
        message: 'Authorize this device to play OpenSky games.',
        address: this.address,
        subkey: this.subkey
      }
    }
  }

  messageDigest(): Uint8Array {
    return encodeTypedDataDigest(this.messageTypedData())
  }
}
