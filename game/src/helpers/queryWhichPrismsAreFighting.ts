import { DeckClass } from '@opensky/proto'
import { prismsToDeckClass } from '@opensky/shared/helpers'

import { accountsLoaded, storeHelper } from '~/state'

let __singletonQuery: Promise<DeckClass[]> | undefined

export function queryWhichPrismsAreFighting() {
  if (!__singletonQuery) {
    __singletonQuery = new Promise<DeckClass[]>(resolve => {
      accountsLoaded.then(() =>
        resolve(storeHelper.getAccounts().map(a => prismsToDeckClass(a.prisms)))
      )
    })
  }
  return __singletonQuery!
}
