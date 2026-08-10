// Group A starts with 0x0 to 0x7
// Group B starts with 0x8 to 0xf
export const getTestGroupByAddress = (address: string) => {
  if (Number(address.substring(0, 3)) <= 7) {
    return 'A'
  } else {
    return 'B'
  }
}
