import { i18n } from '@opensky/language-manager'

interface CalculateNextRewardsDateArgs {
  onEnd?: () => void
  nextDate?: string
}

export const getTimeUntilString = ({
  onEnd,
  nextDate
}: CalculateNextRewardsDateArgs) => {
  if (!!nextDate) {
    const nextReward = new Date(nextDate)
    const rightNow = new Date()

    const msUntilRewards = Math.ceil(
      ((nextReward.getTime() - rightNow.getTime()) / 1000) * 1000
    )

    if (msUntilRewards < 1) {
      if (!!onEnd) onEnd()
      return i18n.t('generic.Now')
    } else {
      const days = Math.floor(msUntilRewards / 8.64e7 || 0)

      let hours = String(Math.floor((msUntilRewards % 8.64e7) / 3.6e6 || 0))
      if (Number(hours) < 10) hours = `0${hours}`

      let min = String(Math.floor((msUntilRewards % 3.6e6) / 6e4 || 0))
      if (Number(min) < 10) min = `0${min}`

      let sec = String(Math.floor((msUntilRewards % 6e4) / 1e3 || 0))
      if (Number(sec) < 10) sec = `0${sec}`

      return `${days}d ${hours}:${min}:${sec}`
    }
  }
  return
}
