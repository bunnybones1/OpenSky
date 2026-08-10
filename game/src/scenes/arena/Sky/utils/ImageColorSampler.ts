import { Color } from 'three'

export default class ImageColorSampler {
  imageData: ImageData
  constructor(image: CanvasImageSource) {
    const canvas = document.createElement('canvas')
    const w = 'width' in image ? (image.width as number) : 0
    const h = 'height' in image ? (image.height as number) : 0
    canvas.width = w
    canvas.height = h
    const context2d = canvas.getContext('2d')
    if (context2d) {
      context2d.drawImage(image, 0, 0)
      this.imageData = context2d.getImageData(0, 0, w, h)
    } else {
      throw new Error('Could not get context2d')
    }
  }
  sample(x: number, y: number, target: Color): Color {
    const index = y * this.imageData.width + x
    const i = index * 4
    const d = this.imageData.data

    target.setRGB(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255)

    return target
  }
}
