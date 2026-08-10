import { BufferAttribute, BufferGeometry, Color } from 'three'

import { getAssetsManager } from '~/assets/index'
import { TimeSync } from '~/controllers/skyTimerController'
import RectangleMaterial from '~/materials/RectangleMaterial'
import { Line2D } from '~/meshes/Line2D'
import Mesh2D from '~/meshes/Mesh2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import { simpleTweener } from '~/systems/animation/tweeners'
import TextMesh from '~/systems/text/TextMesh'

import { Pin, ReadonlyPin } from './LayoutHelpers'

const __days = 4
function __getWave(timeInDays: number) {
  const wave = -Math.sin(timeInDays * __days * Math.PI * 2)
  const antiWave = 1 - Math.abs(wave)
  const sign = wave > 0 ? 1 : -1
  return (1 - Math.pow(antiWave, 4)) * sign
}

/**
 * WARNING: This is broken and needs fixing before it'll be usable
 */
export default class SkyTimerTimelineHelper extends RectangleMesh {
  private _sunPin: Pin
  private _fastForwardTargetPin: Pin
  private _timeInDays: number = 0
  private _turnCounter: number = 0
  private _timeSyncIndicatorMeshPrototype: Mesh2D
  private _timesyncMeshes = new Map<TimeSync, Mesh2D>()
  private _timesyncs = new Array<TimeSync>()
  constructor(private _text?: TextMesh) {
    super(new RectangleMaterial({}))
    this.matrix.setColor(new Color(0x000000), 0.5)
    const day = new RectangleMesh(new RectangleMaterial({}))
    day.matrix.setColor(new Color(0x30b4f8), 0.5)
    this.add(day)
    day.matrix.setConstraints(
      new Pin(1, 0.5, -2, -2),
      ReadonlyPin.BottomLeft,
      ReadonlyPin.Left.cloneOffset(1, -1)
    )
    const night = new RectangleMesh(new RectangleMaterial({}))
    night.matrix.setColor(new Color(0x2a1189), 0.5)
    this.add(night)
    night.matrix.setConstraints(
      new Pin(1, 0.5, -2, -2),
      ReadonlyPin.TopLeft,
      ReadonlyPin.Left.cloneOffset(1, 1)
    )

    const lineGeo = new BufferGeometry()
    const totalVerts = 200
    const posArr = new Float32Array(totalVerts * 3)
    for (let i = 0, i3 = 0; i <= totalVerts; i++, i3 += 3) {
      const ratio = i / (totalVerts - 1)
      posArr[i3] = ratio
      posArr[i3 + 1] = __getWave(ratio)
      posArr[i3 + 2] = 0
    }
    lineGeo.setAttribute('position', new BufferAttribute(posArr, 3, false))
    const lineMesh = new Line2D(lineGeo)
    this.add(lineMesh)
    // TODO fix this object vvv
    // lineMesh.matrix.setConstraints(
    //   new Pin(1, 0.5, -2, -2),
    //   new Pin(0, 0),
    //   new Pin(0, 0.5)
    // )
    // TODO fix this object vvv
    const sun = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'circle-filled'
    )
    const sunPin = new Pin(0, 0)
    sun.matrix.setConstraints(new Pin(0, 0, 10, 10), ReadonlyPin.Center, sunPin)
    sun.matrix.setColor(new Color(0xff0000))
    this.add(sun)
    this._sunPin = sunPin
    // TODO fix this object vvv
    this._timeSyncIndicatorMeshPrototype =
      getAssetsManager().fetchMeshDeepClone('uiSmall', 'circle-filled')

    // TODO fix this object vvv
    const fastForwardTargetMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'circle-filled'
    )
    const fastForwardTargetPin = new Pin(0, 0)
    fastForwardTargetMesh.matrix.setConstraints(
      new Pin(0, 0, 12, 12),
      ReadonlyPin.Center,
      fastForwardTargetPin
    )
    fastForwardTargetMesh.matrix.setColor(new Color(0x7fff7f))
    this.add(fastForwardTargetMesh)
    this._fastForwardTargetPin = fastForwardTargetPin
  }
  set timeInDays(val: number) {
    this._timeInDays = val
    this._sunPin.x.scale = val / __days
    this._sunPin.y.scale = __getWave(val / __days) * 0.5 + 0.5
  }
  get timeInDays() {
    return this._timeInDays
  }
  set turnCounter(val: number) {
    this._turnCounter = val
    this._fastForwardTargetPin.x.scale = val / __days
    this._fastForwardTargetPin.y.scale = __getWave(val / __days) * 0.5 + 0.5
  }
  get turnCounter() {
    return this._turnCounter
  }
  addTimeSync = (ts: TimeSync) => {
    const mesh = this._timeSyncIndicatorMeshPrototype.clone()
    const ratio = ts.timeInDays / __days
    this.add(mesh)
    mesh.matrix.setConstraintsPosition(
      new Pin(ratio, __getWave(ratio) * 0.5 + 0.5)
    )
    this._timesyncMeshes.set(ts, mesh)
    this._timesyncs.push(ts)
    this._possiblyUpdateText()
  }
  removeTimeSync = (ts: TimeSync) => {
    const mesh = this._timesyncMeshes.get(ts)
    if (mesh) {
      const target = { val: 0 }
      // const y = mesh.position.y
      // const s = mesh.scale.x
      simpleTweener.to({
        description: 'skytimer timesync marker remove',
        target,
        propertyGoals: { val: 1 },
        duration: 500,
        onUpdate() {
          // const t = target.val
          // mesh.position.y = y + 100 * Easing.Quartic.Out(t)
          // const s2 = s * (1 - Easing.Quartic.In(t))
          // mesh.scale.set(s2, s2, s2)
        },
        onComplete: () => {
          mesh.parent?.remove(mesh)
        }
      })
    }
    this._timesyncMeshes.delete(ts)
    // removeFromArray(this._timesyncs, ts)
    this._possiblyUpdateText()
  }
  private _possiblyUpdateText() {
    if (this._text) {
      this._text.text = this._timesyncs.map(ts => ts.description).join('\n')
    }
  }
}
