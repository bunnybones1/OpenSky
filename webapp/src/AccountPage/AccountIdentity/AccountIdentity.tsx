import { memo, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { Theme } from '~/__deprecated__/style/Theme'
import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { TAG_ART } from '~/shared/constants/tag-art'
import { useActiveAccount } from '~/shared/hooks/useActiveAccount'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { authenticationState } from '~/shared/state/authentication-state'

import { AccountIdentityStyle } from './AccountIdentity.css'
import ConquestSection from './components/ConquestSection'
import { ExpandedBattleTag } from './ExpandedBattleTag/ExpandedBattleTag'
import RankSection from './RankSection/RankSection'

const CrazyGradient = `linear-gradient(to bottom, ${Theme.colors.purple1}, rgba(12, 6, 30, 0) 50%, rgba(12, 6, 30, 0)), linear-gradient(to top, ${Theme.colors.purple1}, rgba(12, 6, 30, 0))`

export const AccountIdentity = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const { data: activeAccount } = useActiveAccount()
  const { userAddress } = useSnapshot(authenticationState)

  const tagArtBg = useMemo(() => {
    if (!activeAccount?.tagArtID) return

    const tagArt = TAG_ART.get(activeAccount.tagArtID)

    if (!!tagArt?.largeBg && !!getAssetUrl) {
      return getAssetUrl(tagArt.largeBg)
    } else {
      return
    }
  }, [activeAccount?.tagArtID, getAssetUrl])

  return (
    <Box height={'auto'} width="100%" position="relative" bg="purple1">
      <Box
        position="absolute"
        left={0}
        top={0}
        zIndex={1}
        height="50vh"
        width="100%"
        style={{
          backgroundImage: `${CrazyGradient}${
            tagArtBg !== undefined ? `, url(${tagArtBg})` : ''
          }`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundPosition: 'center center'
        }}
      />
      <FlexBox
        type="centered-start-column"
        className={AccountIdentityStyle}
        height="100%"
        width="100%"
        px={[40, 40, 40, 20]}
        position="relative"
        top={0}
        left={0}
        zIndex={2}
        flexWrap="nowrap"
      >
        <Box
          width="100%"
          height="auto"
          maxWidth={[620, 620, 620, 720, 800]}
          borderTop="1px solid"
          borderRight="1px solid"
          borderLeft="1px solid"
          borderColor="purple6"
          bg="purple1"
        >
          <ExpandedBattleTag />
        </Box>
        <Box
          width="100%"
          height="auto"
          maxWidth={[620, 620, 620, 720, 800]}
          borderTop="1px solid"
          borderRight="1px solid"
          borderLeft="1px solid"
          borderColor="purple6"
          bg="purple1"
        >
          <RankSection />
        </Box>

        <Box
          width="100%"
          height="auto"
          maxWidth={[620, 620, 620, 720, 800]}
          border="1px solid"
          borderColor="purple6"
          bg="purple1"
        >
          {!!userAddress &&
            !!activeAccount &&
            activeAccount.address === userAddress && <ConquestSection />}
        </Box>
      </FlexBox>
    </Box>
  )
})

AccountIdentity.displayName = 'AccountIdentity'
