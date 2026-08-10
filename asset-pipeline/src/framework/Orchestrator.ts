import { ChildProcess, exec } from 'child_process'
import { program } from 'commander'
import TaskList from 'listr'
import * as os from 'os'
import * as path from 'path'
import { performance } from 'perf_hooks'
import readline from 'readline-sync'
import writeFileAtomic from 'write-file-atomic'

import { cachePath } from '../config'
import CommandBlock from './CommandBlock'
import Folder from './Folder'
import { error, log, warn } from './logging'
import { ensureFolder, promiseAllWithLimit } from './utils'
import { say } from './voiceLog'

const MAX_PROCESSES = os.cpus().length / 2 // CPU core count
const JOB_TIMEOUT = 240 * 1000 // ms
const SAVE_PROGRESS_INTERVAL = 10 * 1000 // ms

export enum RunMode {
  Normal,
  Pretend,
  SkipCommands,
  Force
}

export interface CommandBlockProcessor {
  processCommandBlocks(
    commandBlocks: CommandBlock[],
    progress?: (processed: number, skipped: number, total: number) => void,
    options?: Partial<{ maxProcesses: number }>
  )

  commandHashCache: Folder
  resultHashCache: Folder
  saveProgress(): Promise<void>
  tasks: Map<string, Task>
}

export type Task = (
  orchestrator: CommandBlockProcessor,
  task: ListrTask
) => Promise<any>

class Orchestrator implements CommandBlockProcessor {
  taskForPath: Map<string, Task>
  commandHashCache: Folder
  resultHashCache: Folder
  isSavingProgress = false
  lastSaveTime = ''
  isProcessing = 0
  maxProcesses: number = MAX_PROCESSES
  queue: CommandPromise[] = []
  jobIDSrc = 0
  taskList: TaskList

  tasks: Map<string, Task> = new Map()
  dependencies: Map<string, string[]> = new Map()

  mode: RunMode = RunMode.Normal

  private _saveProgressIntervalId: NodeJS.Timeout
  currentTask: { task: Task; listrTask: ListrTask }

  task(key: string, task: Task): void
  task(key: string, deps: string[], task?: Task): void
  task(key: string, a: Task | string[], b?: Task) {
    if (this.tasks.has(key)) {
      throw new Error('Task by that name has already been added.')
    }

    if (typeof a === 'function') {
      this.tasks.set(key, a)
    } else {
      if (!program.opts().direct) {
        this.dependencies.set(key, a)
      }
      this.tasks.set(key, b!)
    }
  }

  taskName(taskToFind: Task): string | undefined {
    return [...this.tasks.entries()].find(
      ([_, task]) => task === taskToFind
    )?.[0]
  }

  async start(keys: string[], mode: RunMode = RunMode.Normal) {
    this.mode = mode
    this.taskForPath = new Map()
    this.commandHashCache = await loadHashCache('commandBlocks')
    this.resultHashCache = await loadHashCache('results')

    const getDependencies = (keys: string[], results: string[] = []) => {
      for (const key of keys) {
        const deps = this.dependencies.get(key)
        const task = this.tasks.get(key)

        if (deps) {
          getDependencies(deps, results)
        }

        if (task && !results.includes(key)) {
          results.push(key)
        }
      }

      return results
    }

    keys = getDependencies(keys)

    this._saveProgressIntervalId = setInterval(() => {
      this.saveProgress()
    }, SAVE_PROGRESS_INTERVAL)

    // Non-pretty task runner
    // const taskLogger = {}
    // Object.defineProperty(taskLogger, 'output', {
    //   set(value: string) {
    //     console.log(value)
    //   }
    // })

    // for (const key of keys) {
    //   console.log('Running', key, '...')
    //   const task = this.tasks.get(key)
    //   await task(this, taskLogger)
    // }

    // Pretty task runner
    this.taskList = new TaskList(
      keys.map((key) => ({
        title: key,
        task: async (ctx: any, t: ListrTask) => {
          const verboseSound = program.opts().moresound

          if (verboseSound) {
            say(t.title.split(':').pop() ?? 'next task')
          }

          const task = this.tasks.get(key)!
          this.currentTask = { task, listrTask: t }
          await task(this, t)
        }
      }))
    )

    let error = false
    try {
      await this.taskList.run()
    } catch (err) {
      say('problem encountered')
      console.error(err)
      error = true
    }

    this.stop()
    log('saving hash caches one last time...')
    await this.saveProgress()
    process.exit(error ? 1 : 0)
  }

  stop() {
    clearInterval(this._saveProgressIntervalId)
  }

  async saveProgress() {
    if (this.isSavingProgress || this.mode === RunMode.Pretend) {
      return
    }

    this.lastSaveTime = new Date().toISOString()
    this.isSavingProgress = true
    await Promise.all([
      saveHashCache(this.resultHashCache, 'results'),
      saveHashCache(this.commandHashCache, 'commandBlocks')
    ])

    this.isSavingProgress = false
  }

  async queueCommandBlock(commandBlock: CommandBlock): Promise<string> {
    const p = new Promise(
      (resolve: (val: string) => void, reject: (val: string) => void) => {
        this.queue.push(new CommandPromise(commandBlock, resolve, reject))
      }
    )

    this.tryProcessQueue()

    return p
  }

  tryProcessQueue() {
    if (this.isProcessing < this.maxProcesses && this.queue.length > 0) {
      const cp = this.queue.shift()!

      this.command(cp)
      this.isProcessing++
    }
  }

  async processCommandBlocks(
    commandBlocks: CommandBlock[],
    progress: (processed: number, skipped: number, total: number) => void = this
      .defaultProgressLogger,
    options: Partial<{ maxProcesses: number }> = {}
  ) {
    try {
      this.maxProcesses = options.maxProcesses || MAX_PROCESSES
      const uniquePaths: string[] = Array.from(
        new Set(
          commandBlocks.reduce<string[]>(
            (acc, commandBlock) =>
              acc.concat(
                commandBlock.context.outputFiles.map((outputFile) =>
                  path.dirname(outputFile)
                )
              ),
            []
          )
        )
      )

      this.currentTask.listrTask.output = `Ensuring output folders exist...`
      await Promise.all(uniquePaths.map(ensureFolder))

      this.currentTask.listrTask.output = `Checking commandblock hashes...`

      const needsUpdate: CommandBlock[] = []
      const numHashed = { value: 0 }
      await promiseAllWithLimit(
        commandBlocks.map((commandBlock) => async () => {
          if (
            this.mode === RunMode.Force ||
            !(await commandBlock.isUpToDate(
              this.commandHashCache,
              this.resultHashCache
            ))
          ) {
            needsUpdate.push(commandBlock)
          }
          numHashed.value += 1

          const amount = numHashed.value / commandBlocks.length
          this.currentTask.listrTask.output = `${progressBar(
            amount,
            10
          )} Checking commandblock hashes... ${numHashed.value}/${
            commandBlocks.length
          } (${needsUpdate.length} need update)`
        }),
        100
      )

      for (const thing of needsUpdate) {
        if (
          program.opts().interactiveCheck &&
          !this.confirmCommandBlockInteractivelySync(thing)
        ) {
          throw new Error('User cancelled')
        }
      }
      // console.log(needsUpdate.map(x => x.context.outputFiles))

      const total = commandBlocks.length
      const skipped = total - needsUpdate.length
      let processed = 0

      if (progress) {
        progress(processed, skipped, total - skipped)
      }

      await Promise.all(
        needsUpdate.map(async (commandBlock) => {
          if (
            this.mode !== RunMode.Pretend &&
            this.mode !== RunMode.SkipCommands
          ) {
            await this.executeCommandBlock(commandBlock)
          }

          const commandHash = await commandBlock.getCommandHash()
          const outputHashes = await commandBlock.getOutputHashes()

          for (const [outputFile, outputHash] of outputHashes) {
            if (this.taskForPath.has(outputFile)) {
              throw new Error(
                `While processing command blocks, tried to write path
                ${outputFile}
                but it was already written to by
                ${this.taskName(this.taskForPath.get(outputFile)!)}`
              )
            } else {
              this.taskForPath.set(outputFile, this.currentTask.task)
            }
            this.commandHashCache.storeHash(outputFile, commandHash)
            this.resultHashCache.storeHash(outputFile, outputHash)
          }

          processed++

          if (progress) {
            progress(processed, skipped, total)
          }
        })
      )

      await this.saveProgress()
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(
          `Failed to run task ${this.taskName(this.currentTask.task)}:\n${
            err.message
          }\n${err.stack}`
        )
      } else {
        throw err
      }
    }
  }

  async executeCommandBlock(commandBlock: CommandBlock): Promise<string> {
    const response = await this.queueCommandBlock(commandBlock)
    return response
  }

  getCommandSummary() {
    return `${this.queue.length} commands remaining... ${this.isProcessing}/${this.maxProcesses} commands processing...`
  }

  command(cp: CommandPromise) {
    const { commandBlock } = cp
    const jobID = '#' + this.jobIDSrc++
    const startTime = performance.now()
    const iid = setInterval(() => {
      warn(
        `timeout on ${jobID} (${(
          0.001 *
          (performance.now() - startTime)
        ).toFixed(2)}s)`,
        3
      )
      if (process) {
        process.kill()
      }
    }, JOB_TIMEOUT)

    let process: ChildProcess | undefined

    if (typeof commandBlock.command === 'string') {
      process = exec(
        commandBlock.command.replace(/\n/g, '\\\n'),
        {},
        async (err, stdout, stderr) => {
          // const failed = err || stderr

          const errorMessage = err?.message || stderr

          const failed = errorMessage
            ? !errorMessage.toLowerCase().includes('warning')
            : false

          if (failed) {
            error(`${jobID} failed, restarting > ${cp.commandBlock.command}`)
            const canRestart = cp.commandBlock.retry()
            error(
              `${jobID} failed, ${canRestart ? 'restarting' : 'aborting'} > ${
                cp.commandBlock.command
              }`
            )

            if (err) {
              error(err.message)
            } else if (stderr) {
              error(stderr)
            }

            if (canRestart) {
              this.queue.unshift(cp)
            } else {
              throw new Error(
                `Out of retries for job ${jobID}. Max ${cp.commandBlock.maxRetries} > ${cp.commandBlock.command}`
              )
            }
          } else {
            await cp.commandBlock.execute()
            cp.resolve(stdout)
          }

          clearInterval(iid)
          this.isProcessing--
          this.tryProcessQueue()
        }
      )
    } else {
      commandBlock.command(commandBlock.context).then(async (response) => {
        await cp.commandBlock.execute()
        cp.resolve(response)

        clearInterval(iid)
        this.isProcessing--
        this.tryProcessQueue()
      })
    }
  }
  // arrow fn so we can pass as a callback
  defaultProgressLogger = (
    processed: number,
    skipped: number,
    total: number
  ) => {
    const todoTotal = total - skipped
    const amount = processed / todoTotal
    const percent = Math.floor(amount * 100)
    this.currentTask.listrTask.output = `${progressBar(amount, 10)} ${percent
      .toString()
      .padStart(3, ' ')}% Processed ${processed}/${
      total - skipped
    }, total ${total}, unchanged ${skipped}`
  }
  confirmCommandBlockInteractivelySync = (block: CommandBlock) => {
    console.log('Command is ', block.command)

    const answer = readline.question(
      'Command block is out of date. Execute command block? [(y)es/(C)ancel] '
    )

    if (answer[0].toLowerCase() === 'y') {
      return true
    } else {
      return false
    }
  }
}

export default Orchestrator

class CommandPromise {
  constructor(
    public commandBlock: CommandBlock,
    public resolve: (response: any) => void,
    public reject: (reason: string) => void
  ) {
    //
  }
}

function getHashCacheFileName(name: string) {
  return path.resolve(cachePath, name + '.hashCache.json')
}

async function loadHashCache(name: string) {
  return Folder.loadFile(getHashCacheFileName(name))
}

async function saveHashCache(files: Folder, name: string) {
  return writeFileAtomic(
    getHashCacheFileName(name),
    JSON.stringify(files.getSimple(), null, 2)
  ).catch((err) =>
    error(
      err instanceof Error
        ? `${err.name}: ${err.message}\n${err.stack}`
        : JSON.stringify(err)
    )
  )
}

/**
 *
 * @param value 0-1, how full
 * @param width how many ascii chars should the inner bar be
 * @returns a string like [XXXXX     ] where the number of Xs is proportional to value
 */
function progressBar(value: number, width: number): string {
  const full = Math.ceil(Math.min(1, value) * width)
  const empty = width - full
  return `${(value * 100).toFixed(2).padStart(6, ' ')}% [${'▓'.repeat(
    full
  )}${'░'.repeat(empty)}]`
}
