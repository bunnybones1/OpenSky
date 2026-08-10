import os from 'os'
const talker: Promise<{
  speak(
    words: string,
    _: undefined,
    __: undefined,
    callback: (err: any) => void
  )
}> = isMacOs()
  ? import('say').then((s) => s.default)
  : Promise.resolve({
      speak() {
        // noop on other platforms
      }
    })

const speakingQueue: string[] = []
export function say(message: string) {
  speakingQueue.push(message)
  sayNext()
}
let speaking = false
async function sayNext() {
  if (speakingQueue.length > 0 && !speaking) {
    speaking = true
    const message: string = speakingQueue.shift()!
    const t = await talker
    t.speak(message, undefined, undefined, (err) => {
      speaking = false
      sayNext()
    })
  }
}

function isMacOs() {
  return os.platform() === 'darwin'
}
