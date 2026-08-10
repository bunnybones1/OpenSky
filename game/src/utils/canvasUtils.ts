import renderer from '~/renderer'

export function setCanvasSize(width: string, height: string) {
  const canvas = renderer.getContext().canvas
  if (!('style' in canvas)) {
    throw new Error("can't set size of offscreen canvas")
  }
  const style = canvas.style
  style.width = width
  style.height = height
}
