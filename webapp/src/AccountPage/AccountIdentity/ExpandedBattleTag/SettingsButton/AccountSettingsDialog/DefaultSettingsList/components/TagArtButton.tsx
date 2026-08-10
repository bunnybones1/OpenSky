import styled from '@emotion/styled'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { RowArt } from '~/__deprecated__/RowArt'
import { Box } from '~/shared/components/Base/Box'
import { Button } from '~/shared/components/Button'
import { useAccountTagArtUrl } from '~/shared/hooks/useAccountTagArtUrl'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'

interface Props {
  handleList: () => void
}

export const TagArtButton = memo(({ handleList }: Props) => {
  const { t } = useTranslation()

  const { data: account } = useAuthedAccount()

  const tagArtUrl = useAccountTagArtUrl(account?.tagArtID)

  return (
    <StyledTagArtButton
      height={50}
      width="100%"
      borderRadius="4px"
      overflow="hidden"
      position="relative"
      border="1px solid"
      borderColor="purple11"
      bg="purple3"
    >
      <Box
        position="absolute"
        top="50%"
        right="6px"
        zIndex={4}
        transform="translateY(-50%)"
      >
        <Button
          frameType="default"
          colorType="default"
          onClick={handleList}
          buttonClassName={FullWidthButtonStyle}
          className={FullWidthButtonStyle}
          buttonId="tag-art-settings"
          text={t('profile.changeCover')}
          data-id="tagArtButton"
        />
      </Box>
      {!!tagArtUrl?.parsed && <RowArt art={tagArtUrl.parsed} useHeight />}
    </StyledTagArtButton>
  )
})

TagArtButton.displayName = 'TagArtButton'

const StyledTagArtButton = styled(Box)`
  .tagArtWrapper {
    height: 100%;
  }
`
