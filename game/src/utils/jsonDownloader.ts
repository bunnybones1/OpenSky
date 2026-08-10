export function downloadJson(json: string, filename: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const downloadLink = URL.createObjectURL(blob)
  const el = document.createElement('a')
  el.href = downloadLink
  el.download = filename
  document.body.appendChild(el)
  el.click()
  document.body.removeChild(el)
}

/**
 * Throws an error if a malformed JSON file is picked.
 * @returns parsed JSON
 */
export function uploadJson(): Promise<object> {
  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.style.display = 'none'
  fileInput.accept = '.json,application/json'

  return new Promise((res, rej) => {
    fileInput.onchange = e => {
      const file = (e.target as HTMLInputElement)?.files?.[0]
      if (!file) {
        rej(new Error('No files picked'))
      } else {
        const reader = new FileReader()
        reader.onload = e => {
          const contents = e.target?.result
          if (!contents) {
            rej(new Error("Target doesn't exist"))
          }
          if (typeof contents !== 'string') {
            rej(new Error('Invalid JSON file.'))
          }
          try {
            res(JSON.parse(contents as string))
          } catch (err) {
            rej(err)
          }
          document.body.removeChild(fileInput)
        }
        reader.readAsText(file)
      }
    }
    document.body.appendChild(fileInput)
    fileInput.click()
  })
}
