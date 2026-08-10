import { Pin, PinVal } from '~/helpers/LayoutHelpers'
import Matrix2DUI from '~/meshes/Matrix2DUI'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'

const placedAtleastOnce = new Set<PinVal>()
export function attemptMovePinVal(target: PinVal, to: PinVal) {
  if (!placedAtleastOnce.has(target)) {
    target.copy(to)
    placedAtleastOnce.add(target)
  } else {
    if (target.scale !== to.scale || target.offset !== to.offset) {
      simpleTweener.killTweensOf(target)
      simpleTweener.to({
        description: 'animate pinval',
        target,
        propertyGoals: { scale: to.scale, offset: to.offset },
        duration: 500,
        easing: Easing.Custom.SnappyButSmooth
      })
    }
  }
}
export function attemptMovePin(target: Pin, to: Pin) {
  attemptMovePinVal(target.x, to.x)
  attemptMovePinVal(target.y, to.y)
}
export function attemptMoveMatrix(target: Matrix2DUI, to: Matrix2DUI) {
  attemptMovePin(target.size, to.size)
  attemptMovePin(target.offset, to.offset)
  attemptMovePin(target.anchor, to.anchor)
}
