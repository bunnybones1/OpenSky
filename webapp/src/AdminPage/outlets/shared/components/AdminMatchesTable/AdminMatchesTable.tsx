import styled from '@emotion/styled'
import { memo } from 'react'
import { Link } from 'react-router-dom'

import Checkbox from '~/__deprecated__/Checkbox'
import {
  formatDuration,
  formatTime,
  toTitleCase,
  trimAddress
} from '~/AdminPage/outlets/shared/helpers'
import env from '~/env'
import { GMMatch } from '~/lib/proto'
import { Box, FlexBox } from '~/shared/components/Base'
import { Icon } from '~/shared/components/Icon/Icon'
import Pagination from '~/shared/components/Pagination'
import { CursorPage } from '~/shared/constants/misc'
import { makeAdminUserRoute } from '~/shared/helpers/routes/general'

import {
  AdminDetails,
  AdminDetailsContainer,
  AdminDetailsContent
} from '../../../shared/components/AdminDetails'
import {
  AdminCell,
  AdminHeaderRow,
  AdminRow,
  AdminSortButton,
  AdminTable,
  AdminTableEmptyContainer,
  AdminTableEmptyMessage
} from '../../../shared/components/AdminTable'
import useMatches from './hooks/useMatches'

const AdminMatches = memo(({ address }: { address?: string }) => {
  const { matches, loading, error, toggleReviewed, pagination, fetchMatches } =
    useMatches(address)

  const SortIcon = () => (
    <Icon
      type={pagination.sortOrder === 'ASC' ? 'caret-up' : 'caret-down'}
      color="purple7"
      height="16px"
    />
  )

  const handlePageChange = (navTo: CursorPage) => {
    fetchMatches(navTo)
  }

  const hasAfter =
    pagination.page && pagination.page.hasAfter ? pagination.page.hasAfter : false

  const hasBefore =
    pagination.page && pagination.page.hasBefore ? pagination.page.hasBefore : false

  return (
    <FlexBox type="start-column" width="100%" style={{ gap: 32 }}>
      <Container loading={loading}>
        <AdminMatchesTable>
          <AdminMatchesHeaderRow>
            <AdminMatchesCell>Winner</AdminMatchesCell>
            <AdminMatchesCell>Loser</AdminMatchesCell>
            <AdminMatchesCell>Mode</AdminMatchesCell>
            <AdminMatchesCell>Status</AdminMatchesCell>
            <AdminMatchesCell>Turns</AdminMatchesCell>
            <AdminMatchesCell>
              <AdminSortButton onClick={pagination.toggleSortStarted}>
                Started
                {pagination.isSortStarted && <SortIcon />}
              </AdminSortButton>
            </AdminMatchesCell>
            <AdminMatchesCell>
              <AdminSortButton onClick={pagination.toggleSortEnded}>
                Ended
                {pagination.isSortEnded && <SortIcon />}
              </AdminSortButton>
            </AdminMatchesCell>
            <AdminMatchesCell>Duration</AdminMatchesCell>
            <AdminMatchesCell>Reviewed</AdminMatchesCell>
            <AdminMatchesCell>Replay</AdminMatchesCell>
          </AdminMatchesHeaderRow>

          {matches.map((match, i) => {
            return (
              <AdminMatchesRow key={i}>
                <AdminPlayersCells match={match} />
                <AdminMatchesCell>
                  {toTitleCase(match.match.player1GameMode.toLowerCase())} /
                  {toTitleCase(match.match.player2GameMode.toLowerCase())}
                </AdminMatchesCell>
                <AdminMatchesCell>
                  {toTitleCase(match.match.status.toLowerCase())}
                </AdminMatchesCell>
                <AdminMatchesCell>{match.match.turnNonce}</AdminMatchesCell>
                <AdminMatchesCell>
                  {formatTime(match.match.startedAt)}
                </AdminMatchesCell>
                <AdminMatchesCell>{formatTime(match.match.endedAt)}</AdminMatchesCell>
                <AdminMatchesCell>
                  {formatDuration(match.match.startedAt, match.match.endedAt)}
                </AdminMatchesCell>
                <AdminMatchesCell
                  style={{
                    opacity: loading ? 0.5 : 1,
                    pointerEvents: loading ? 'none' : 'all'
                  }}
                >
                  <Checkbox
                    checked={match.reviewed}
                    onClick={() => {
                      toggleReviewed(match.match.id, !match.reviewed)
                    }}
                  />
                </AdminMatchesCell>
                <AdminMatchesCell>
                  <a
                    href={`${env.GAME_URL}?mode=REPLAY&replayMatchID=${match.match.id}&replayID=${match.match.replayID}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Watch
                  </a>
                </AdminMatchesCell>
              </AdminMatchesRow>
            )
          })}
          {!matches.length && !loading && (
            <AdminTableEmptyContainer>
              <AdminTableEmptyMessage>No Matches</AdminTableEmptyMessage>
            </AdminTableEmptyContainer>
          )}
          {error && !loading && (
            <AdminTableEmptyContainer>
              <AdminTableEmptyMessage>
                <Box color="warm9">{error}</Box>
              </AdminTableEmptyMessage>
            </AdminTableEmptyContainer>
          )}
        </AdminMatchesTable>
      </Container>
      {pagination.showPagination && (
        <FlexBox
          position="relative"
          width="100%"
          style={{
            placeContent: 'center',
            pointerEvents: loading ? 'none' : 'all',
            opacity: loading ? 0.5 : 1,
            transition: 'opacity 0.2s ease-in-out'
          }}
        >
          <Pagination
            onPageChange={handlePageChange}
            preventReset={true}
            hasBefore={hasBefore}
            hasAfter={hasAfter}
          />
        </FlexBox>
      )}
    </FlexBox>
  )
})

type ContainerProps = {
  children: JSX.Element
  loading: boolean
}

const Container = ({ children, loading }: ContainerProps) => {
  return (
    <AdminDetails>
      <AdminDetailsContent>
        <FlexBox justifyContent="space-between" alignItems="center" pr={8}>
          <Title>Matches</Title>
          {loading && <Icon type="spinner" height="24px" color="purple7" />}
        </FlexBox>
      </AdminDetailsContent>

      <AdminDetailsContainer>{children}</AdminDetailsContainer>
    </AdminDetails>
  )
}

const AdminPlayersCells = ({ match }: { match: GMMatch }) => {
  const cell1 = match.match.winningPlayer === 1 ? 'player1' : 'player2'
  const cell2 = match.match.winningPlayer === 1 ? 'player2' : 'player1'

  return (
    <>
      <AdminPlayerCell match={match} player={cell1} />
      <AdminPlayerCell match={match} player={cell2} />
    </>
  )
}

type AdminPlayerCellProps = {
  match: GMMatch
  player: 'player1' | 'player2'
}

const AdminPlayerCell = ({ match, player }: AdminPlayerCellProps) => {
  const { name, address } = match.match[player]

  return (
    <AdminMatchesCell>
      <Link to={makeAdminUserRoute(address)}>
        <p>{name}</p>
        <small>{trimAddress(address)}</small>
      </Link>
    </AdminMatchesCell>
  )
}

const columns = '1.5fr 1.5fr 1.1fr 1fr 0.66fr 1fr 1fr 1fr 0.8fr 0.66fr'
const AdminMatchesTable = styled(AdminTable)`
  border: 0;
`
const AdminMatchesCell = styled(AdminCell)``
const AdminMatchesHeaderRow = styled(AdminHeaderRow)`
  grid-template-columns: ${columns};
`
const AdminMatchesRow = styled(AdminRow)`
  grid-template-columns: ${columns};

  &:last-child {
    border-bottom: 0;
  }
`

const Title = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.purple9};
`

export default AdminMatches

AdminMatches.displayName = 'AdminMatches'
