const widthsFile = `0000322232414
2322222222322
2222222242220
1222222220222
2222232242240
2222222220222
0000410220022
3300000000000`
const charsFile = ` "#%'()+,-./:
0123456789;=?
ABCDEFGHIJKLM
NOPQRSTUVWXYZ
abcdefghijklm
nopqrstuvwxyz
→←↑↓!\\_<>@□{}
[]&©         `

const widths = widthsFile
  .split('\n')
  .map((line) => line.split('').map((char) => parseInt(char)))
const numCharsPerLine = widths[0].length
const chars = charsFile.split('\n').map((line) => [...line])
const numLines = widths.length

const textureWidth = 91
const textureHeight = 64

const fontWidth = textureWidth / numCharsPerLine
const fontHeight = textureHeight / numLines
if (!Number.isInteger(fontWidth) || !Number.isInteger(fontHeight)) {
  throw new Error(`Invalid font size: ${fontWidth}x${fontHeight}`)
}

console.log(fontWidth, fontHeight)
console.log(numCharsPerLine, numLines)

const baseline = 6

const textureFilename = 'cdogs.png'
const fontName = 'cdogs_7x8'

const charset = new Set(chars.flat())
const output = {
  pages: [textureFilename],
  chars: [...charset].map((char) => {
    const row = chars.find((row) => row.includes(char))
    const x = row.indexOf(char)
    const y = chars.indexOf(row)
    const charWidth = fontWidth - widths[y][x]
    return {
      id: char.charCodeAt(0),
      x: x * fontWidth,
      y: y * fontHeight,
      width: charWidth,
      height: fontHeight,
      xoffset: 0,
      yoffset: 0,
      xadvance: charWidth,
      page: 0,
      chnl: 0
    }
  }),
  info: {
    face: fontName,
    size: fontHeight,
    bold: 0,
    italic: 0,
    charset: 'ascii',
    stretchH: 100,
    smooth: 0,
    aa: 1,
    padding: [0, 0, 0, 0],
    spacing: [0, 0]
  },
  common: {
    lineHeight: fontHeight,
    base: baseline,
    scaleW: textureWidth,
    scaleH: textureHeight,
    pages: 1,
    packed: 0,
    alphaChnl: 0,
    redChnl: 0,
    greenChnl: 0,
    blueChnl: 0
  }
}
console.log(JSON.stringify(output))
