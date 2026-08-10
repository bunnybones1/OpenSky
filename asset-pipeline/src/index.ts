import './cli'

import chalk from 'chalk'
import { program } from 'commander'

import { log } from './framework/logging'
import Orchestrator, { RunMode } from './framework/Orchestrator'
import { say } from './framework/voiceLog'
import { registerTasks } from './registry'

process.on('SIGINT', () => process.exit(1)) // CTRL+C
process.on('SIGQUIT', () => process.exit(1)) // Keyboard quit
process.on('SIGTERM', () => process.exit(1)) // `kill` command

const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

// Override console commands to output an extra \n, so they're not eaten by `listr`.
console.log = (...args: unknown[]) => {
  process.stdout.write('\n')
  originalConsoleLog(...args)
}
console.error = (...args: unknown[]) => {
  process.stderr.write('\n')
  originalConsoleError(...args)
}
console.warn = (...args: unknown[]) => {
  process.stderr.write('\n')
  originalConsoleWarn(...args)
}
const orchestrator = new Orchestrator()

registerTasks(orchestrator)

const listTasks = () => {
  const sortedKeys = [...orchestrator.tasks.keys()].sort()
  for (const key of sortedKeys) {
    console.log(key)
  }
}

const invalidRunMode = () => {
  log(`Only one of --force, --pretend, or --skip-commands is allowed.`)
}

const runTasks = async () => {
  const tasks = program.opts().task as string[] | undefined
  let mode = RunMode.Normal
  if (program.opts().pretend) {
    if (mode != RunMode.Normal) {
      return invalidRunMode()
    }
    mode = RunMode.Pretend
  }
  if (program.opts().force) {
    if (mode != RunMode.Normal) {
      return invalidRunMode()
    }
    mode = RunMode.Force
  }

  if (program.opts().skipCommands) {
    if (mode != RunMode.Normal) {
      return invalidRunMode()
    }
    mode = RunMode.SkipCommands
  }

  const useSound = program.opts().sound || program.opts().moresound

  if (useSound) {
    say('Welcome')
  }

  log(chalk.blue('Asset Generator Pipeline'))
  log(chalk.grey('-------------------------'))
  log(chalk.grey('options:'))
  const optsString = Object.entries(program.opts()).reduce(
    (last, [k, v]) => last + `\n${k}: ${JSON.stringify(v, null, 2)}`,
    ''
  )
  log(chalk.grey(optsString))

  log(chalk.grey('please stand by...\n'))

  await orchestrator.start(tasks || ['all'], mode)

  if (useSound) {
    say('Finished')
  }
}

if (program.opts().list) {
  listTasks()
} else {
  runTasks()
}
