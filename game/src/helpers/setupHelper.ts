export let markSetupDone: () => void

export const setupDone = new Promise<void>(res => {
  markSetupDone = res
})
