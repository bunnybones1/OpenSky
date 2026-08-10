export function listenForMessage(
  listener: (e: MessageEvent<any>) => any
): void {
  window.addEventListener('message', listener)
  // @ts-ignore
  document.addEventListener('message', listener)
}

export function stopListeningForMessage(
  listener: (e: MessageEvent<any>) => any
): void {
  window.removeEventListener('message', listener)
  // @ts-ignore
  document.removeEventListener('message', listener)
}
