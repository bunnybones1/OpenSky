import { memo } from 'react'

import { FlexBox, Text } from '~/shared/components/Base'
import { ImageIcon } from '~/shared/components/ImageIcon/ImageIcon'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

interface Props {
  name: string
  artID: string
}

export const HeroSkinRow = memo(({ name, artID }: Props) => {
  const { getAssetUrl } = useGetAssetContext()

  return (
    <FlexBox
      height={[36, 42, 48, 48]}
      width="100%"
      py={['2px', '2px', 1]}
      type="start-row"
      position="relative"
      className="stickerRow"
      opacity={1}
    >
      <FlexBox
        left={[32, 32, 40]}
        style={{
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 2,
          position: 'absolute'
        }}
        type="centered-start-row"
      >
        <Text
          color="white"
          fontSize={[3, 3, 3, 4]}
          fontWeight="400"
          fontFamily="condensed"
        >
          {name}
        </Text>
      </FlexBox>
      <FlexBox position="absolute" left="0px" top="8px" zIndex={4}>
        <ImageIcon type="heroes-gold" height="32px" />
      </FlexBox>
      <FlexBox
        border="1px solid"
        borderColor={'gold'}
        ml={[12, 12, 15, 15]}
        flex={1}
        height="100%"
        alignItems="center"
        justifyContent="flex-start"
        bg="purple1"
        className="cardRowBox"
        overflow="hidden"
        position="relative"
        zIndex={1}
        p="2px"
      >
        <FlexBox
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            left: '0px',
            zIndex: 2,
            background: `linear-gradient(90deg, #452E14 0%, rgba(69, 52, 20,1) 30%, rgba(30, 20, 6, 0) 67.72%, rgba(69, 55, 20, 0.3) 79.29%,#453114 95%, #453114 100%)`
          }}
        />
        {!!getAssetUrl && (
          <img
            src={getAssetUrl(`webapp/heroes/art-rows/2x/${artID}@2x.webp`)}
            style={{
              height: '100%',
              position: 'absolute',
              right: '0px'
            }}
          />
        )}
      </FlexBox>
    </FlexBox>
  )
})

HeroSkinRow.displayName = 'HeroSkinRow'
