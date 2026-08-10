import { useMemo } from 'react'

export const useSkypassItemRotations = (
  amount: number,
  cardBack: string,
  imgList?: number[]
) => {
  const listLength = amount >= 5 ? 5 : amount

  const { list, reversed } = useMemo(() => {
    const _list = imgList ? imgList : (Array(listLength).fill(cardBack) as string[])

    return {
      reversed: [...Array(_list?.length).keys()].reverse(),
      list: _list
    }
  }, [cardBack, imgList, listLength])

  const centerRotation = useMemo(() => {
    return list?.map((_id, index) => {
      let rotation = 0
      const currIndex = reversed[index]
      let rightOffset = () => '0vh'
      if (listLength === 2) {
        if (currIndex === 0) rotation = -10
        else rotation = 12
        rightOffset = () => {
          if (currIndex === 0) return `30vh`
          return `12vh`
        }
      } else {
        if (currIndex === 0) rotation = -12
        else if (currIndex === 1 && listLength > 2) rotation = 4
        else rotation = 4 * currIndex + 8 * (currIndex - 1)
        rightOffset = () => {
          if (currIndex === 0) return `${32 + (listLength - 2)}vh`
          else if (currIndex === 4) return `2vh`
          return `${
            34 + (listLength - 2) - currIndex / 0.064 + Math.pow(currIndex, 2) / 0.6
          }vh`
        }
      }
      return { rightOffset: rightOffset(), rotation }
    })
  }, [list, listLength, reversed])

  const leftStartRotation = useMemo(() => {
    return list?.map((_id, index) => {
      let rotation = 0
      const currIndex = reversed[index]
      if (currIndex === 0) rotation = 0
      else rotation = 10 * currIndex
      return {
        rightOffset: currIndex === 0 ? `${12 * index + 1}vh` : `${11 * index + 1}vh`,
        rotation
      }
    })
  }, [list, reversed])

  return { centerRotation, leftStartRotation, list, reversed }
}
