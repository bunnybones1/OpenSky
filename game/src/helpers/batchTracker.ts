import { sendTimeMarksToAnalytics } from '@opensky/shared/userSettings'

import { track } from './analytics-old'

import { TimeMarkReport } from './TimeMarkReport'

const name = '[G] Client Time Mark'

let currentBatch: TimeMarkReport[] | undefined = []

export function trackBatchedGameEvent(timeMark: TimeMarkReport) {
  if (!currentBatch) {
    currentBatch = []
  }
  currentBatch.push(timeMark)
}

setInterval(() => {
  if (currentBatch) {
    if (sendTimeMarksToAnalytics.value) {
      track(name, { timeMarks: currentBatch })
      // trackGameEvent(currentBatch)
      currentBatch = undefined
    }
  }
}, 5000)
