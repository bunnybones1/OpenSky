import styled from '@emotion/styled'
import { FlagCodes } from '@opensky/shared/constants'
import { memo } from 'react'

import { RowArt } from '~/__deprecated__/RowArt'
import env from '~/env'
import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { ExperienceBar } from '~/shared/components/ExperienceBar/ExperienceBar'
import { useAccountTagArtUrl } from '~/shared/hooks/useAccountTagArtUrl'
import { useActiveAccount } from '~/shared/hooks/useActiveAccount'

import { BattleTagPlayerInfo } from './components/BattleTagPlayerInfo'
import SettingsButton from './SettingsButton/SettingsButton'
import { SpectateInfo } from './SpectateInfo/SpectateInfo'
import WalletInfo from './WalletInfo/WalletInfo'

export const ExpandedBattleTag = memo(() => {
  const { data: activeAccount } = useActiveAccount()

  const tagArtUrl = useAccountTagArtUrl(activeAccount?.tagArtID)

  return (
    <>
      <FlexBox
        type="centered-column"
        width="100%"
        height={108}
        bg="purple4"
        borderBottom="1px solid"
        position="relative"
        borderColor="purple6"
      >
        <SettingsButton />

        <BattleTagIdentityWrapper
          flex={1}
          width="100%"
          position="relative"
          type="centered-start-column"
          overflow="hidden"
        >
          <FlexBox
            position="absolute"
            top={0}
            left={0}
            zIndex={2}
            height="100%"
            width="100%"
            type="start-column"
          >
            <Box
              position="relative"
              width={['calc(100% - 98px)', 'calc(100% - 98px)', 'calc(100% - 118px)']}
              flex={1}
            >
              {!!activeAccount && (
                <BattleTagPlayerInfo
                  region={
                    !activeAccount.region || activeAccount.region === ''
                      ? undefined
                      : (activeAccount.region as FlagCodes)
                  }
                  name={activeAccount.name}
                  crystalID={activeAccount.crystalID}
                  skyTagTitle={activeAccount.titleID}
                />
              )}
            </Box>
            {!!activeAccount && (
              <ExperienceBar
                level={activeAccount.seasonLevel}
                levelUpXP={activeAccount.levelUpXP}
                experience={activeAccount.experience}
              />
            )}
          </FlexBox>
          <FlexBox
            position="absolute"
            right="20%"
            top={0}
            zIndex={1}
            pb={30}
            height="100%"
            width="82%"
            type="centered-end-row"
          >
            {!!tagArtUrl?.parsed && (
              <RowArt art={tagArtUrl.parsed} useHeight={true} />
            )}
          </FlexBox>
        </BattleTagIdentityWrapper>
      </FlexBox>
      {env.AUTH_MODE !== 'google' && <WalletInfo />}
      {env.AUTH_MODE !== 'google' && <SpectateInfo />}
    </>
  )
})

ExpandedBattleTag.displayName = 'ExpandedBattleTag'

const BattleTagIdentityWrapper = styled(FlexBox)`
  .playerRankBox {
    width: 80px;
    height: 80px;
  }
  .tagArtWrapper {
    height: calc(100% - 30px);
    padding-right: 60px;
  }
  .battleTagPlayerInfoText {
    justify-content: center;
    padding: 0px 0px 0px 16px;
    .battleTagPlayerName {
      height: auto;
      .sequence-platforms-text {
        font-size: 30px;
      }
    }
    .battleTagPlayerRankName {
      font-size: 20px;
    }
    .battleTagPlayerFlag {
      width: 22px;
    }
  }
`
