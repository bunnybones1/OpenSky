import { isNativeOpenSkyDesktopApp } from '@opensky/shared/native'
import { sequence } from '0xsequence'

import { APIClient } from '~/shared/clients'

export const getOpenSkyAuthFromSequence = async (
  wallet: sequence.provider.SequenceProvider
) => {
  const connectDetails = await wallet.connect({
    authorize: true,
    app: 'OpenSky',
    appProtocol: isNativeOpenSkyDesktopApp() ? 'openskymobile' : undefined,
    expiry: 60 * 60 * 24 * 365,
    settings: {
      bannerUrl: 'https://assets.skyweaver.net/signin-opensky-banner.png'
    }
  })

  const proofString = connectDetails?.proof?.proofString

  if (!proofString) {
    throw new Error(
      `No proofString. ConnectDetails are: ${JSON.stringify(connectDetails)}`
    )
  }

  const authResp = await APIClient.opensky.getAuthToken({
    ethAuthProofString: proofString
  })
  const sequenceAuthResp = await APIClient.sequence.getAuthToken({
    ewtString: proofString
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
    address: authResp.address,
    proofString
  }
}
