import { getLast } from '@opensky/shared/utils/arrayUtils'
import {
  getLocalStorageBoolean,
  getLocalStorageInt,
  getLocalStorageParam,
  setLocalStorageBoolean,
  setLocalStorageInt,
  setLocalStorageParam
} from '@opensky/shared/utils/localStorage'
import { Object3D } from 'three'

import { debugGuiState } from '~/userSettings'
import { globalAccess, onGlobalUiAccessReady } from '~/utils/globalAccess'
import { removeFromParent } from '~/utils/threeUtils'

export class Debuggable {
  childObjs: Array<Object3D | ((dt: number) => void)> = []
  constructor(
    public onDebugStart: () =>
      | Array<Object3D | ((dt: number) => void)>
      | Promise<Array<Object3D | ((dt: number) => void)>>,
    public onDebugStop?: () => void
  ) {
    //
  }
}

class DebugBranch {
  debuggables: Debuggable[] = []
  childBranches = new Map<string, DebugBranch>()
  constructor(
    public path: string,
    public level = 0
  ) {
    //
  }
  register(path: string, debuggable: Debuggable, level = 0) {
    this.registerInternal(path.split('/'), debuggable, [], level)
  }
  registerInternal(
    pathChunks: string[],
    debuggable: Debuggable,
    pathSoFar: string[],
    level = 0
  ) {
    if (pathChunks.length > 0) {
      const key = pathChunks.shift()!
      pathSoFar.push(key)
      if (!this.childBranches.has(key)) {
        this.childBranches.set(key, new DebugBranch(pathSoFar.join('/'), level))
      }
      this.childBranches
        .get(key)!
        .registerInternal(pathChunks, debuggable, pathSoFar, level)
    } else {
      this.debuggables.push(debuggable)
    }
  }
  getBranch(path: string): DebugBranch {
    return this.getBranchInternal(path.split('/'))
  }
  getBranchInternal(pathChunks: string[]): DebugBranch {
    if (pathChunks.length > 0) {
      const key = pathChunks.shift()!
      if (this.childBranches.has(key)) {
        return this.childBranches.get(key)!.getBranchInternal(pathChunks)
      }
    }
    return this
  }
  // unregister(path:string, debuggable:Debuggable) {
  // 	removeFromArray(this.debuggables, debuggable)
  // }
}

const debugPathName = 'debug-branch-path'
const debugStateName = 'debug-branch-state'
const debugLevelName = 'debug-security-level-v2'

export function getCurrentDebugPath() {
  return getLocalStorageParam(debugPathName) || ''
}

class DebugBranchRoot extends DebugBranch {
  private _activePath: string = ''
  private _lastValidPath: string = ''
  private _activeState: boolean = false
  private _activeLevel = 0
  initd: boolean
  get activeState() {
    return this._activeState
  }
  get activeLevel() {
    return this._activeLevel
  }
  constructor() {
    super('root')
    this.setActivePath(getCurrentDebugPath())
    this.setActiveState(getLocalStorageBoolean(debugStateName, false))
    this.setActiveLevel(getLocalStorageInt(debugLevelName, 0))
  }

  register(path: string, debuggable: Debuggable, level = 0) {
    super.register('root/' + path, debuggable, level)
  }

  async setActiveState(state: boolean) {
    if (this._activeState === state) {
      return
    }
    setLocalStorageBoolean(debugStateName, state)
    await this._recalculate(
      state ? '' : this._activePath,
      state ? this._activePath : ''
    )
    this._activeState = state
  }
  async pop() {
    const prev = this._activePath.split('/').slice(0, -1).join('/')
    if (prev) {
      await this.setActivePath(prev)
    }
  }

  async setActiveLevel(level: number) {
    if (this._activeLevel === level) {
      return
    }
    this._activeLevel = level
    setLocalStorageInt(debugLevelName, level)
    await this._recalculate(
      this._activeState ? this._activePath : '',
      this._activeState ? this._activePath : '',
      true
    )
  }

  async setActivePath(path: string, force = false) {
    if (path.indexOf('root/') !== 0) {
      path = 'root/' + path
    }
    if (this._activePath === path && !force) {
      return
    }
    setLocalStorageParam(debugPathName, path)
    if (this._activeState) {
      await this._recalculate(this._activePath, path, force)
    }
    this._activePath = this._lastValidPath
  }
  private async _recalculate(oldPath: string, newPath: string, force = false) {
    if (oldPath === newPath && !force) {
      return
    }
    await onGlobalUiAccessReady()
    if (globalAccess.uiSkip) {
      return
    }
    const debugUI = globalAccess.ui!.getContainer('debug')
    await debugUI.ready
    const closestOldBranch = this.getBranch(oldPath)
    for (const d of closestOldBranch.debuggables) {
      d.onDebugStop?.()
      for (const child of d.childObjs) {
        if (child instanceof Object3D) {
          removeFromParent(child)
        } else {
          debugUI.updateCallbacks.delete(child)
        }
      }
      d.childObjs.length = 0
    }

    debugUI.resetOptions()
    debugUI.resetBreadcrumbButtons()

    const closestBranch = this.getBranch(newPath)
    const breadcrumbPathChunks: string[] = []
    for (const chunk of closestBranch.path.split('/')) {
      breadcrumbPathChunks.push(chunk)
      const breadcrumbPath = breadcrumbPathChunks.join('/')
      debugUI.createBreadcrumbButton(chunk, () => {
        debuggables.setActivePath(breadcrumbPath)
      })
    }

    this._lastValidPath = breadcrumbPathChunks.join('/')

    for (const d of closestBranch.debuggables) {
      const children = await d.onDebugStart()
      for (const child of children) {
        d.childObjs.push(child)
        if (child instanceof Object3D) {
          debugUI.contents.add(child)
        } else {
          debugUI.updateCallbacks.add(child)
        }
      }
    }

    for (const option of closestBranch.childBranches.values()) {
      if (option.level > this._activeLevel) {
        continue
      }
      debugUI.addOption(getLast(option.path.split('/')), () => {
        this.setActivePath(option.path)
      })
    }
  }
}

export const debuggables = new DebugBranchRoot()

debugGuiState.listen(v => {
  if (!v) {
    debuggables.setActiveLevel(0)
  }
})
