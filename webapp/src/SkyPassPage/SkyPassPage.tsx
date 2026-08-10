import { memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { FlexBox } from '~/shared/components/Base'
import { FancyBackButton } from '~/shared/components/FancyBackButton/FancyBackButton'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useSkyPassInfo } from '~/shared/queries/useSkyPassInfo'
import { HeightOneHundredVhMinusOffset } from '~/shared/style/TopOffsetStyle.css'

import { Background } from './components/Background'
import { SkyPassForeground } from './SkyPassForeground/SkyPassForeground'

const SkyPass = memo(() => {
  const navigate = useNavigate()
  const { data: skyPassInfo } = useSkyPassInfo()

  const onBackClick = useCallback(
    () => navigate(ROUTES_CONFIG.routes.HOME.directPath),
    [navigate]
  )

  return (
    <FlexBox
      width="100%"
      className={HeightOneHundredVhMinusOffset}
      overflow="hidden"
      flexDirection="column"
      alignItems="center"
      justifyContent="flex-start"
      position="relative"
    >
      <FlexBox
        width={['75px', '75px', '75px', '102px']}
        position="absolute"
        left="0px"
        top={0}
        zIndex={99}
      >
        <FancyBackButton onClick={onBackClick} />
      </FlexBox>
      <Background id={skyPassInfo?.seasonArtistName as string} />
      <SkyPassForeground />
    </FlexBox>
  )
})

SkyPass.displayName = 'SkyPass'

export default SkyPass
