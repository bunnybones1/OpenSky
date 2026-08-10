/* eslint-disable no-console */
import { proxy } from 'valtio'

export const consoleHistory = proxy<
  Array<{
    type: 'error' | 'warn' | 'log'
    message: Array<any>
    timestamp: number
  }>
>([])
const originalConsoleLog = console.log
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

console.log = (...args: any[]) => {
  originalConsoleLog(...args)
  consoleHistory.push({
    type: 'log',
    message: args,
    timestamp: Date.now()
  })
  while (consoleHistory.length > 10) {
    consoleHistory.shift()
  }
}
console.warn = (...args: any[]) => {
  originalConsoleWarn(...args)
  consoleHistory.push({
    type: 'warn',
    message: args,
    timestamp: Date.now()
  })
  while (consoleHistory.length > 10) {
    consoleHistory.shift()
  }
}
console.error = (...args: any[]) => {
  originalConsoleError(...args)
  consoleHistory.push({
    type: 'error',
    message: args,
    timestamp: Date.now()
  })
  while (consoleHistory.length > 10) {
    consoleHistory.shift()
  }
}
