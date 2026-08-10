import { FlagCodes } from '@opensky/shared/constants'
import { CrystalLibrary } from '@opensky/shared/cosmetics'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Theme } from '~/__deprecated__/style/Theme'
import { ThemeColorType } from '~/__deprecated__/style/types'
import { Text } from '~/__deprecated__/Text'
import { PlayerRank, PlayerRankStage } from '~/lib/proto'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { FlagIcon } from '~/shared/components/FlagIcon'
import { RankBadge } from '~/shared/components/RankBadge'
import { SkyTagTitle } from '~/shared/components/SkyTagTitle'
import { GameType } from '~/shared/constants/ranks'
import { doesRankHaveStages } from '~/shared/helpers/account/does-rank-have-stages'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

interface Props {
  playerRank?: PlayerRank
  playerRankStage?: PlayerRankStage
  name: string
  region?: FlagCodes
  mode?: GameType
  rank?: number
  showRankIcon?: boolean
  crystalID?: number
  skyTagTitle?: number
}

export const BattleTagPlayerInfo = memo(
  ({
    showRankIcon,
    playerRank,
    playerRankStage,
    region,
    name,
    mode,
    rank,
    crystalID,
    skyTagTitle
  }: Props) => {
    const showRank = playerRank !== undefined
    const shownRankIcon = playerRank || (showRankIcon && PlayerRank.WANDERER)
    const { t } = useTranslation()
    const rankColor = useMemo(() => {
      if (mode === GameType.CONSTRUCTED) return 'rgb(165, 221, 213)'
      if (mode === GameType.DISCOVERY) return 'rgb(229, 145, 141)'
      return Theme.colors.purple9
    }, [mode])

    return (
      <FlexBox
        width="100%"
        height="100%"
        position="absolute"
        type="start-row"
        zIndex={4}
        top={0}
        left={0}
        data-id="battleTagPlayerInfo"
      >
        {shownRankIcon && (
          <FlexBox
            width={60}
            className="playerRankBox"
            height="100%"
            type="centered-row"
            overflow="hidden"
            position="relative"
            bottom={doesRankHaveStages(shownRankIcon) ? '0px' : '2px'}
          >
            <FlexBox
              height={doesRankHaveStages(shownRankIcon) ? 'calc(100% - 4px)' : '100%'}
              width="100%"
              mt="1px"
              type="centered-row"
            >
              <RankBadge
                playerRank={shownRankIcon}
                playerRankStage={playerRankStage ?? PlayerRankStage.STAGE_NONE}
                mode={mode}
                rank={rank}
                useHeight={true}
              />
            </FlexBox>
          </FlexBox>
        )}
        <FlexBox
          className="battleTagPlayerInfoText"
          height="100%"
          pl={[1, 1, 2]}
          flex={1}
          overflow="hidden"
          flexWrap="nowrap"
          style={{
            flexDirection: !showRank ? 'row' : 'column',
            alignItems: !showRank ? 'center' : 'flex-start',
            justifyContent: !showRank ? 'flex-start' : 'center',
            paddingBottom: !showRank ? '12px' : '6px'
          }}
        >
          <FlexBox
            type="centered-start-row"
            width="100%"
            className="battleTagPlayerName"
          >
            <FlexBox maxWidth="calc(100% - 26px)" overflow="hidden" flexWrap="nowrap">
              <Text
                width="100%"
                color={
                  (CrystalLibrary.get(crystalID!)?.color as ThemeColorType) ?? 'white'
                }
                fontSize={[16, 16, 18]}
                fontWeight="bold"
                style={{ textShadow: '0px 0px 3px black, 0px 0px 2px black' }}
              >
                {name}
              </Text>
            </FlexBox>
            {!!region && (
              <FlexBox
                width={18}
                ml={2}
                type="centered-row"
                className="battleTagPlayerFlag"
              >
                <FlagIcon code={region} height="16px" />
              </FlexBox>
            )}
            {!!skyTagTitle && (
              <div
                className={Sprinkles({
                  marginLeft: '8px',
                  display: 'flex'
                })}
              >
                <SkyTagTitle id={skyTagTitle} fontSize="14px" />
              </div>
            )}
          </FlexBox>

          {showRank && (
            <Text
              style={{
                color: rankColor
              }}
              fontSize={[11, 11, 13]}
              className="battleTagPlayerRankName"
            >
              {t(`ranks.${playerRank}`)}
              {!!rank &&
                playerRank !== PlayerRank.MASTER &&
                playerRank !== PlayerRank.GRANDWEAVER &&
                ` #${rank}`}
            </Text>
          )}
        </FlexBox>
      </FlexBox>
    )
  }
)

BattleTagPlayerInfo.displayName = 'BattleTagPlayerInfo'
