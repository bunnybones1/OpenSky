export const userInteraction = new Promise<void>(resolve => {
  function handleUserInteraction() {
    resolve()
    document.body.removeEventListener('click', handleUserInteraction)
    document.body.removeEventListener('touchstart', handleUserInteraction)
  }
  document.body.addEventListener('click', handleUserInteraction)
  document.body.addEventListener('touchstart', handleUserInteraction)
})
