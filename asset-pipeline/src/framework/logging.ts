import { program } from 'commander'
import * as readline from 'readline'

import { RGB } from './logColors'
import { LogLevel } from './LogLevel'
import { delay } from './utils'

const red = new RGB(1, 0, 0)
const yellow = new RGB(1, 1, 0)
const white = new RGB(1, 1, 1)
const green = new RGB(0, 1, 0)

const logLevelThreshold = Math.min(
  9,
  Math.max(0, parseInt(program.opts().logLevel as string, 10))
)

export function error(val: string, logLevel: LogLevel = 0) {
  if (logLevel <= logLevelThreshold) {
    console.log(red.chalk(val, logLevel))
  }
}

export function warn(val: string, logLevel: LogLevel = 0) {
  if (logLevel <= logLevelThreshold) {
    console.log(yellow.chalk(val, logLevel))
  }
}

export function log(val: string, logLevel: LogLevel = 0) {
  if (logLevel <= logLevelThreshold) {
    console.log(white.chalk(val, logLevel))
  }
}

export function logGood(val: string, logLevel: LogLevel = 0) {
  if (logLevel <= logLevelThreshold) {
    console.log(green.chalk(val, logLevel))
  }
}

export function genericLogHandler(err: string, resp: string) {
  if (err) {
    error(err)
  } else {
    log(resp)
  }
}

let intervalId: NodeJS.Timeout | undefined
let getSummary: () => string

let lastLog = ''

function updateSummary() {
  readline.clearLine(process.stdout, 0)
  readline.cursorTo(process.stdout, 0, undefined)
  lastLog = getSummary()
  process.stdout.write(lastLog)
}

export async function endLogPhase(delayDur = 1000) {
  if (intervalId !== undefined) {
    clearInterval(intervalId)
    intervalId = undefined
  }
  log('')
  const nextLog = getSummary()
  if (nextLog !== lastLog) {
    log(nextLog)
  }
  await delay(delayDur)
}

export function startLogPhase(myGetSummary: () => string) {
  if (intervalId !== undefined) {
    endLogPhase()
  }
  getSummary = myGetSummary
  updateSummary()
  intervalId = setInterval(updateSummary, 1000 / 20)
}
