import { ONE_DAY } from '../constants/time'
import { getAuthedAccount } from '../hooks/useAuthedAccount'
import { getLocalStorage } from './local-storage'

export const shouldSeeConversionDialog = () => {
  const account = getAuthedAccount()

  if (!!account && !!account.isBurnerWallet && account.level > 9) {
    const ls = getLocalStorage()

    if (!ls?.lastSeenConversionDialog) {
      return true
    } else {
      const lastSeenDateMs = new Date(ls.lastSeenConversionDialog).getTime()

      const msDifference = new Date(Date.now()).getTime() - lastSeenDateMs

      // eslint-disable-next-line no-console
      console.log({ msDifference })

      return Math.abs(msDifference) > ONE_DAY
    }
  }

  return false
}
