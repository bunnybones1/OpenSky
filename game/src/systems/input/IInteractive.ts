import { CursorType } from './CursorType'

export type InputMethod = (x: number, y: number) => void

export default interface IInteractive {
  onSelect?: InputMethod
  onOver?: InputMethod
  onOut?: InputMethod
  onDown?: InputMethod
  onUp?: InputMethod
  onDragStart?: InputMethod
  onHoldStart?: InputMethod
  onHoldEnd?: InputMethod
  onRightPressEnd?: InputMethod
  cursor: CursorType
  disabled?: boolean
}
