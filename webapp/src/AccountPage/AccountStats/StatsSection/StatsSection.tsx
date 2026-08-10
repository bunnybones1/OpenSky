import styled from '@emotion/styled'
import { memo } from 'react'

import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'

import CollectionStats from './CollectionStats/CollectionStats'
import RankStats from './components/RankStats'
import GameStats from './GameStats/GameStats'

export const StatsSection = memo(() => (
  <FlexBox width="100%" type="centered-start-column">
    <StatsSectionBox pt={3} px={5} pb={48} mb={5}>
      <CollectionStats />
    </StatsSectionBox>
    <StatsSectionBox pt={3} px={5} pb={48} mb={5}>
      <GameStats />
    </StatsSectionBox>
    <RankStats />
  </FlexBox>
))

export const StatsSectionBox = styled(Box)`
  width: 100%;
  height: auto;
  border: 1px solid ${(props) => props.theme.colors.purple7};
  background-image: linear-gradient(
    to bottom,
    ${(props) => props.theme.colors.purple1},
    ${(props) => props.theme.colors.purple1} 80%,
    ${(props) => props.theme.colors.purple2}
  );
`

StatsSection.displayName = 'StatsSection'
