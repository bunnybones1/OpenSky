export const getElementSize = (size: number, containerSize: number) => {
  //The size is taken from the figma designs
  return (size / containerSize) * 100
}
