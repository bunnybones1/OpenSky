//imported from git@github.com:sindresorhus/copy-text-to-clipboard.git

// MIT License
// Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

export function copyTextToClipboard(input: string) {
  const element = document.createElement('textarea')

  element.value = input

  // Prevent keyboard from showing on mobile
  element.setAttribute('readonly', '')

  // @ts-ignore
  element.style.contain = 'strict'
  element.style.position = 'absolute'
  element.style.left = '-9999px'
  element.style.fontSize = '12pt' // Prevent zooming on iOS

  const selection = document.getSelection()

  let originalRange: Range | undefined
  if (selection && selection.rangeCount > 0) {
    originalRange = selection.getRangeAt(0)
  }

  document.body.append(element)
  element.select()

  // Explicit selection workaround for iOS
  element.selectionStart = 0
  element.selectionEnd = input.length

  let isSuccess = false
  try {
    // eslint-disable-next-line deprecation/deprecation
    isSuccess = document.execCommand('copy')
  } catch (err) {
    //
  }

  element.remove()

  if (selection && originalRange) {
    selection.removeAllRanges()
    selection.addRange(originalRange)
  }

  return isSuccess
}
