import { removeFromArray } from '@opensky/shared/utils/arrayUtils'

import { simpleTweener } from '~/systems/animation/tweeners'

export class TimedTask {
  private _task: (() => void) | undefined
  constructor(
    public expireTime: number,
    task: () => void
  ) {
    this._task = task
  }
  task() {
    if (this._task) {
      this._task()
      this._task = undefined
    } else {
      console.warn('timed task asked to fire twice??')
    }
  }
}
class Timer {
  time: number
  orderOffset: number
  tasks: TimedTask[]
  constructor() {
    this.time = 0
    this.orderOffset = 0
    this.tasks = []
  }
  update(dt: number) {
    this.orderOffset = 0
    this.time += dt
    while (this.tasks.length > 0 && this.tasks[0].expireTime <= this.time) {
      this.tasks.shift()!.task()
    }
  }
  add(task: () => void, delay: number, compensateTimeWarp: boolean = false) {
    if (compensateTimeWarp) {
      delay *= simpleTweener.speed
    }
    this.orderOffset += 0.0001
    const timedTask = new TimedTask(this.time + delay + this.orderOffset, task)
    this.tasks.push(timedTask)
    this.tasks.sort((a, b) => a.expireTime - b.expireTime)
    return timedTask
  }
  runPrematurely(timedTask: TimedTask) {
    removeFromArray(this.tasks, timedTask)
    timedTask.task()
  }
  cancel(timedTask: TimedTask) {
    removeFromArray(this.tasks, timedTask)
  }
  async delayPromise(
    seconds: number,
    compensateTimeWarp: boolean = false
  ): Promise<void> {
    return new Promise(resolve =>
      this.add(resolve, seconds, compensateTimeWarp)
    )
  }
}
export const taskTimer = new Timer()
