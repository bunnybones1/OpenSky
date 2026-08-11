import {
  CardWithBalance,
  Fetch,
  Page,
  SearchCardsReturn,
  SkyWeaverAPI
} from '@opensky/proto'
import { SKYWEAVER_JWT_KEY } from '@opensky/shared/constants'

import env from './env'
import { gameMode, LocalGameMode } from './helpers/envGameModeHelpers'

const apiFetch: Fetch = async (input: RequestInfo, init?: RequestInit) => {
  const jwt = window.localStorage.getItem(SKYWEAVER_JWT_KEY)
  const headers = new Headers(init?.headers)
  const requestInit: RequestInit = {
    ...init,
    credentials: 'same-origin',
    headers
  }

  if (jwt) {
    headers.set('Authorization', `BEARER ${jwt}`)
  } else if (
    env.AUTH_MODE !== 'google' &&
    gameMode !== LocalGameMode.REPLAY &&
    gameMode !== LocalGameMode.SPECTATE
  ) {
    throw new Error('No jwt found.')
  }

  const response = await window.fetch(input, requestInit)

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text)
  }

  return response
}
class ClientAPI extends SkyWeaverAPI {
  async getUserCards(accountAddress: string): Promise<CardWithBalance[]> {
    // TODO: Get a method to get these cards
    let cards: CardWithBalance[] = []

    const req = {
      criteria: {
        ownedCards: true,
        accountAddress
      },
      includeUserBalances: true,
      contractQuery: env.DIRECT_BALANCE_FETCH
    }

    const reqPage: Page = {
      pageSize: 200
    }

    let cursor: string = ''
    let fetching = true
    while (fetching) {
      const pageParams = reqPage
      if (cursor !== '') {
        pageParams.before = cursor
      }
      const search: SearchCardsReturn = await this.searchCards({
        req,
        page: pageParams
      })
      if (search.page === null || search.res.length < 1) {
        fetching = false
        continue
      }
      if (search.page!.after !== null) {
        cursor = search.page!.after!
      }
      cards = [...cards, ...search.res]
    }

    return cards
  }
}

const apiClient = new ClientAPI(env.API_HOST, apiFetch)
window.apiClient = apiClient

export default apiClient
