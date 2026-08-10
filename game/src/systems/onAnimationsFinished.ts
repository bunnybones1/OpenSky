import { timeWarp } from '~/utils/timeWarp'

export function onAnimationsFinished(turn?: number) {
  timeWarp.removeCustomScaler('TabbedInFastForward')
  if (turn) {
    timeWarp.removeCustomScaler(`EndTurnFastForward-${turn}`)
  } else {
    timeWarp.removeCustomScalersThatStartWith('EndTurnFastForward')
  }
}
