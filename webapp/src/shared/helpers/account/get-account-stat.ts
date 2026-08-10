import { Account, AccountStat } from '~/lib/proto'
import { GameType } from '~/shared/constants/ranks'

export const getAccountStat = (
  mode: GameType,
  account?: Account | null
): AccountStat | undefined => {
  if (!account) return
  let accountStat

  if (mode === GameType.DISCOVERY && account.stats?.rankedDiscovery !== undefined) {
    accountStat = account.stats.rankedDiscovery
  } else if (
    mode === GameType.CONSTRUCTED &&
    account.stats?.rankedConstructed !== undefined
  ) {
    accountStat = account.stats.rankedConstructed
  }
  return accountStat
}
