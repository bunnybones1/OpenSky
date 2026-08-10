import { AccountWithPrismsAndCosmeticsInfo } from '@opensky/shared/game-server-message-types'
import { Player } from '@skyweaver/state-metadata'

import { debugAccounts } from '~/debugAccounts'

class AccountsStore {
  player: Player
  private _accounts:
    | [AccountWithPrismsAndCosmeticsInfo, AccountWithPrismsAndCosmeticsInfo]
    | null = null
  private locked = false
  fake = false
  get accounts():
    | [AccountWithPrismsAndCosmeticsInfo, AccountWithPrismsAndCosmeticsInfo]
    | null {
    return this.fake ? debugAccounts : this._accounts
  }
  set accounts(
    accounts:
      | [AccountWithPrismsAndCosmeticsInfo, AccountWithPrismsAndCosmeticsInfo]
      | null
  ) {
    if (this.locked) {
      return
    } else {
      this._accounts = accounts
    }
  }
}

export const accountsStore = new AccountsStore()
