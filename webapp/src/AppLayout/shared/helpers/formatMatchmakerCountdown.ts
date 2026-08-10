export const time = (seconds: number) =>
  seconds > 0
    ? `${~~((seconds % 3600) / 60)}:${(~~seconds % 60).toString().padStart(2, '0')}`
    : null
