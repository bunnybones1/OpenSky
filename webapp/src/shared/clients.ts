import { SequenceAPIClient } from '@0xsequence/api'
import { SequenceMetadata } from '@0xsequence/metadata'
import { QueryClient } from '@tanstack/react-query'

import { _AssetClient_DONT_USE_DIRECTLY } from '~/clients/AssetClient/AssetClient'
import { _AuthenticationClient_DONT_USE_DIRECTLY } from '~/clients/AuthenticationClient/AuthenticationClient'
import { _MatchMakerClient_DONT_USE_DIRECTLY } from '~/clients/MatchMakerClient/MatchMakerClient'
import { _MobileClient_DONT_USE_DIRECTLY } from '~/clients/MobileClient/MobileClient'
import { _SoundClient_DONT_USE_DIRECTLY } from '~/clients/SoundClient/SoundClient'
import env from '~/env'
import { SkyWeaverAPIClient } from '~/lib/proto'

import { ONE_HOUR, THIRTY_SECONDS } from './constants/time'

export const GlobalQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: THIRTY_SECONDS,
      cacheTime: ONE_HOUR
    }
  }
})

const API_HOST = env.API_HOST || 'https://local.0xhorizon.net:1337'
const SEQUENCE_API_HOST = env.SEQUENCE_API_HOST || 'http://localhost:4422'
const SEQUENCE_METADATA_HOST = env.SEQUENCE_METADATA_HOST
const SEQUENCE_API_KEY = env.SEQUENCE_API_KEY

class APIClient_DONT_USE_DIRECTLY {
  public opensky = new SkyWeaverAPIClient(API_HOST)
  // we intentionally don't pass the API key to the API client, otherwise it breaks when we call `.getJWT`.
  public sequence = new SequenceAPIClient(SEQUENCE_API_HOST)
  public metadata = new SequenceMetadata(SEQUENCE_METADATA_HOST, SEQUENCE_API_KEY)
}

export const APIClient = new APIClient_DONT_USE_DIRECTLY()
export const AuthenticationClient = new _AuthenticationClient_DONT_USE_DIRECTLY()
export const MobileClient = new _MobileClient_DONT_USE_DIRECTLY()
export const MatchMakerClient = new _MatchMakerClient_DONT_USE_DIRECTLY()
export const AssetClient = new _AssetClient_DONT_USE_DIRECTLY()
export const SoundClient = new _SoundClient_DONT_USE_DIRECTLY()
