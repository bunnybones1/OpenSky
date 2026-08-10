export const time = {
  value: 0
}

export function timeStamp() {
  return {
    stamp: time.value,
    current: time
  }
}
