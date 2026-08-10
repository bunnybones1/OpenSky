import { SEQUENCE_JWT_KEY, SKYWEAVER_JWT_KEY } from '@opensky/shared/constants'

import { APIClient } from '~/shared/clients'

export const getJWTs = () => {
  const jwt = window.localStorage.getItem(SKYWEAVER_JWT_KEY)
  const sequenceJwt = window.localStorage.getItem(SEQUENCE_JWT_KEY)

  return {
    jwt,
    sequenceJwt
  }
}

export const setJWTs = ({
  openskyJWT,
  sequenceJWT
}: {
  openskyJWT?: string
  sequenceJWT?: string
}) => {
  if (!!openskyJWT) {
    window.localStorage.setItem(SKYWEAVER_JWT_KEY, openskyJWT)
    APIClient.opensky.authToken = openskyJWT
  }
  if (!!sequenceJWT) {
    window.localStorage.setItem(SEQUENCE_JWT_KEY, sequenceJWT)
    APIClient.sequence.jwtAuth = sequenceJWT
  }
}
