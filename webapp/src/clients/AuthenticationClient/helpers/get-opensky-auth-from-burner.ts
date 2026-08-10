import { Account } from '@0xsequence/account'
import { ValidateSequenceWalletProof } from '@0xsequence/auth'
import { ETHAuth, ETHAuthVersion, Proof } from '@0xsequence/ethauth'
import { ChainId } from '@0xsequence/network'

import { APIClient } from '~/shared/clients'

import { SequenceContext, SequenceReader, SequenceTracker } from '../shared/constants'

export const getOpenSkyAuthFromBurner = async (
  address: string,
  wallet: Account
) => {
  const proof = new Proof({
    address,
    claims: {
      app: 'OpenSky',
      iat: Math.round(new Date().getTime() / 1000),
      exp: Math.round(new Date().getTime() / 1000) + 60 * 60 * 24 * 365,
      v: ETHAuthVersion
    }
  })

  const validator = ValidateSequenceWalletProof(
    () => SequenceReader,
    SequenceTracker,
    SequenceContext
  )

  const ethAuth = new ETHAuth(validator)

  const digest = proof.messageDigest()

  const signature = await wallet.signDigest(
    digest,
    ChainId.POLYGON,
    undefined,
    'eip6492'
  )

  proof.signature = signature

  const ethAuthProofString = await ethAuth.encodeProof(proof)

  const authResp = await APIClient.opensky.getAuthToken({
    ethAuthProofString
  })

  const sequenceAuthResp = await APIClient.sequence.getAuthToken({
    ewtString: ethAuthProofString
  })

  if (
    authResp.status !== true ||
    authResp.address.length !== 42 ||
    sequenceAuthResp.status !== true ||
    sequenceAuthResp.address.length !== 42
  ) {
    throw new Error('auth failed')
  }

  return {
    JWT: authResp.jwtToken,
    sequenceJWT: sequenceAuthResp.jwtToken,
    address: authResp.address
  }
}
