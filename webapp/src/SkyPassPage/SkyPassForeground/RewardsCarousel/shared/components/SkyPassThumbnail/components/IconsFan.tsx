import { memo, useMemo } from 'react'
import { v4 } from 'uuid'

import { Box } from '~/shared/components/Base'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

interface Props {
  amount: number
  primaryImg: string
  secondaryImg?: string
}

export const IconsFan = memo(({ amount, primaryImg, secondaryImg }: Props) => {
  const { getAssetUrl } = useGetAssetContext()

  const renderIcons = useMemo(() => {
    const list = Array(amount - 1).fill(secondaryImg ? secondaryImg : primaryImg)
    list.unshift(primaryImg)
    return list?.map((value, index) => {
      let rotation = 0
      const first = index === 0

      if (first) rotation = -15
      else rotation = index === 1 ? 0 : 15 * (index - 1)
      if (amount === 2 && index === 1) rotation = 15

      return (
        <Box
          key={v4()}
          style={{
            position: 'relative',
            display: 'flex',
            zIndex: amount - index,
            left: `${index * -30 - Math.pow(index, 2) + amount}px`,
            top: `${index / 2}px`,
            transform: `rotate(${rotation}deg)`
          }}
          width="48px"
        >
          {index === 1 && (
            <Box
              style={{
                position: 'absolute',
                height: '54px',
                left: '8px',
                width: `${amount * 15}px`,
                opacity: 0.9,
                background:
                  'radial-gradient(36.33% 39.58% at 59.37% 50%, rgba(12, 6, 30, 0.6) 0%, rgba(12, 6, 30, 0.4) 56.98%, rgba(12, 6, 30, 0) 95.35%), radial-gradient(20.31% 40.63% at 35% 50%, rgba(12, 6, 30, 0.4) 0%, rgba(12, 6, 30, 0.39) 52.7%, rgba(12, 6, 30, 0) 100%)'
              }}
            ></Box>
          )}
          {!!getAssetUrl && (
            <img
              width="100%"
              src={getAssetUrl(`webapp/${value}`)}
              style={{ height: '100%', width: '48px', objectFit: 'contain' }}
            />
          )}
        </Box>
      )
    })
  }, [amount, primaryImg, secondaryImg, getAssetUrl])

  return <>{renderIcons}</>
})

IconsFan.displayName = 'IconsFan'
