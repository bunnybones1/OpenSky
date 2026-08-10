import chalk from 'chalk'

import { LogLevel } from './LogLevel'

function clamp(v: number) {
  return Math.min(1, Math.max(0, v))
}

function numToHexString(v: number, length = 2) {
  return (~~(clamp(v) * 255)).toString(16).padStart(length, '0')
}

export class RGB {
  constructor(private r: number, private g: number, private b: number) {
    //
  }
  chalk(str: string, logLevel: LogLevel = 0) {
    return chalk.hex(this.hex(logLevel))(str)
  }
  private hex(logLevel: LogLevel = 0) {
    const bright = 1 - logLevel / 8
    return (
      numToHexString(this.r * bright) +
      numToHexString(this.g * bright) +
      numToHexString(this.b * bright)
    )
  }
}
