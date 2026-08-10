import Orchestrator from './Orchestrator'

export type TaskAction = (orchestrator: Orchestrator) => Promise<any>

class Task {
  static collection: Map<string, Task> = new Map()

  static create(name: string, description: string, action: TaskAction) {
    if (this.collection.has(name)) {
      throw new Error(`Task with name ${name} already exists.`)
    }

    this.collection.set(name, new Task(name, description, action))
  }

  name: string
  description: string

  private _action: TaskAction

  constructor(name: string, description: string, action: TaskAction) {
    this.name = name
    this.description = description
    this._action = action
  }

  async run(orchestrator: Orchestrator) {
    await this._action(orchestrator)
  }
}

export default Task
