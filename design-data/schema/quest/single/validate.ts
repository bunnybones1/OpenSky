import { ValidationError } from 'myzod'

import { Quest } from './struct'

export function endProgressIsGreaterThanStartProgress(quest: Quest) {
  if (quest.startProgress && quest.startProgress > quest.endProgress) {
    throw new ValidationError(
      `Quest ${quest.name} has endProgress > startProgress:
start: ${quest.startProgress}
end  : ${quest.endProgress}`,
      ['startProgress', 'endProgress']
    )
  }
  return true
}
