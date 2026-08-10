import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Box, FlexBox } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import { Portal } from '~/shared/components/Portal'

const BackToTopButton = memo(() => {
  const { t } = useTranslation()
  const [showScroll, setShowScroll] = useState(false)

  const checkScrollTop = () => {
    if (!showScroll && window.pageYOffset > 400) {
      setShowScroll(true)
    } else if (showScroll && window.pageYOffset <= 400) {
      setShowScroll(false)
    }
  }
  window.addEventListener('scroll', checkScrollTop)

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return (
    <Portal>
      {showScroll && (
        <Box
          width="100px"
          height="40px"
          position="fixed"
          zIndex={9}
          bottom="20px"
          right="20px"
        >
          <FlexBox
            height="100%"
            width="100%"
            type="centered-row"
            color="white"
            position="relative"
          >
            <Button
              frameType="default"
              colorType="default"
              text={t('navigation.backToTop')}
              leftAdornment={{ icon: 'arrow-up' }}
              onClick={scrollTop}
            />
          </FlexBox>
        </Box>
      )}
    </Portal>
  )
})

export default BackToTopButton

BackToTopButton.displayName = 'BackToTopButton'
