const callbacks: Array<() => void> = []

export function nextFrameUpdate() {
  if (callbacks.length > 0) {
    // Note: This must be a `for of` loop, since each of these callbacks
    // might push more work into our `callbacks` array.
    // If they do, a for-of loop will pick them up,
    // but a .forEach would stop early.
    // Then when the list is flushed, the .forEach version would throw away some callbacks.
    for (const callback of callbacks) {
      callback()
    }
    callbacks.length = 0
  }
}

export function onNextFrame(callback: () => void) {
  callbacks.push(callback)
}

export async function waitForNextFrame() {
  return new Promise<void>(onNextFrame)
}
