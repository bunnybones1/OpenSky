import styled from '@emotion/styled'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Text } from '~/__deprecated__/Text'
import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { Button } from '~/shared/components/Button'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'

interface Props {
  textKey: 'Heroes' | 'Stickers' | 'CardBacks'
  imageKey: string
  redirectRoute?: string
  width?: string
}

export const EmptyList = memo(({ textKey, imageKey, redirectRoute }: Props) => {
  const { getAssetUrl } = useGetAssetContext()
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <FlexBox type="centered-column" height="100%" width="100%" mt={[0, 0, 32]}>
      <FlexBox
        height={[180 + 88, 180 + 88, 200 + 88, 250 + 88]}
        style={{
          width: '100%',
          position: 'relative'
        }}
        pb={[88]}
        type="centered-column"
      >
        {!!getAssetUrl && <Asset src={getAssetUrl(imageKey)} />}
        <FlexBox
          style={{
            position: 'absolute',
            zIndex: 2,
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%'
          }}
          px={'16px'}
          type="centered-column"
        >
          <FlexBox
            type="centered-row"
            style={{
              width: '100%'
            }}
          >
            <Text
              fontSize={[18, 20, 22, 28]}
              color="purple9"
              fontFamily="condensed"
              fontWeight="medium"
              dangerouslySetInnerHTML={{
                __html: t(`search.noResults${textKey}`)
              }}
            />
          </FlexBox>
          <FlexBox
            type="centered-row"
            style={{
              paddingTop: '16px'
            }}
          >
            <Button
              frameType="default"
              colorType="blue"
              text={t(`search.noResults${textKey}Button`)}
              disabled={!redirectRoute}
              onClick={() => {
                if (redirectRoute) {
                  navigate(redirectRoute)
                }
              }}
            />
          </FlexBox>
        </FlexBox>
      </FlexBox>
      <FlexBox type="start-row" width="50%">
        <Box width="100%" pt="calc((26 / 135) * 100%)" position="relative">
          {!!getAssetUrl && (
            <img
              style={{
                width: '100%',
                position: 'absolute',
                top: 0,
                left: 0
              }}
              src={getAssetUrl('webapp/misc/end-of-list.webp')}
            />
          )}
        </Box>
      </FlexBox>
    </FlexBox>
  )
})

const Asset = styled.img`
  height: 100%;
  ${({ theme }) => theme.mediaQueries.mobile} {
    height: initial;
    width: 100%;
  }
`

EmptyList.displayName = 'EmptyList'
