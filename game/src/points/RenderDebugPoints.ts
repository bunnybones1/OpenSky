import { addToArrayUnique } from '@opensky/shared/utils/arrayUtils'
import { BufferGeometry, Camera, IUniform, Scene, WebGLRenderer } from 'three'

import { COLOR_WHITE } from '~/colors/colorLibrary'
import SimplePointMaterial from '~/materials/SimplePointMaterial'
import Points2D from '~/meshes/Points2D'
import { onNextFrame } from '~/utils/onNextFrame'
import { getCachedWebGLCommandColors } from '~/webGLDebugOptions'

import RenderDebugPointsGeometry from './geometry/RenderDebugPointsGeometry'

export default class RenderDebugPoints extends Points2D {
  set pointSize(value: number) {
    this._pointSizeUniform.value = value
  }
  get isTakingData() {
    return this._isTakingData
  }
  interval = 200
  commandNames: string[] = []
  wrapWidth = 10
  private _lastTimeUpdated = 0
  private _isTakingData: boolean
  private _pointSizeUniform: IUniform
  private _commands: string[][] = [[]]
  private _currentRenderCommands: string[]
  constructor() {
    super(
      new RenderDebugPointsGeometry([
        [[COLOR_WHITE, COLOR_WHITE, COLOR_WHITE, COLOR_WHITE]]
      ]),
      new SimplePointMaterial()
    )
    this._pointSizeUniform = (
      this.material as SimplePointMaterial
    ).pointSizeUniform
    this.name = 'debugPointsGeometry'
    this.frustumCulled = false
    this.renderOrder = 100000
  }
  markNewRender() {
    this._currentRenderCommands = []
    this._commands.push(this._currentRenderCommands)
  }
  markNewCommand(command: string) {
    this._currentRenderCommands.push(command)
  }
  onBeforeRender = (
    renderer: WebGLRenderer,
    scene: Scene,
    camera: Camera,
    geometry: BufferGeometry
  ) => {
    this._isTakingData = false
    const now = performance.now()
    if (now < this._lastTimeUpdated + this.interval) {
      return
    }
    this._lastTimeUpdated = now
    onNextFrame(() => geometry.dispose())
    const commandNames: string[] = []
    const allCmds = this._commands
    allCmds.forEach(cmds => cmds.map(s => addToArrayUnique(commandNames, s)))
    this.geometry = new RenderDebugPointsGeometry(
      allCmds.map(cmds => cmds.map(s => getCachedWebGLCommandColors(s))),
      this.wrapWidth
    )
    this.commandNames = commandNames
    this._currentRenderCommands = []
    this._commands = [this._currentRenderCommands]
    this._isTakingData = true
  }
}
