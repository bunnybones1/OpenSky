import styled from '@emotion/styled'
import { GameMode } from '@opensky/proto'
import { memo } from 'react'

import Checkbox from '~/__deprecated__/Checkbox'
import { Box, FlexBox } from '~/shared/components/Base'
import { Icon } from '~/shared/components/Icon/Icon'

import {
  AdminDetails,
  AdminDetailsContainer,
  AdminDetailsContent
} from '../../../shared/components/AdminDetails'
import {
  AdminCell,
  AdminHeaderRow,
  AdminRow,
  AdminTable
} from '../../../shared/components/AdminTable'
import useQueuesEnabled from './hooks/useQueuesEnabled'

type ContainerProps = {
  children: JSX.Element
  loading: boolean
}

const Container = ({ children, loading }: ContainerProps) => {
  return (
    <AdminDetails>
      <AdminDetailsContent>
        <FlexBox justifyContent="space-between" alignItems="center" pr={8}>
          <SubTitle>Queues</SubTitle>
          {loading && <Icon type="spinner" height="24px" color="purple7" />}
        </FlexBox>
      </AdminDetailsContent>

      <AdminDetailsContainer>{children}</AdminDetailsContainer>
    </AdminDetails>
  )
}

const AdminQueues = memo(() => {
  const { queues, loading, setQueueEnabled } = useQueuesEnabled()
  return (
    <Container loading={loading}>
      <>
        <Box p={'16px'} style={{ userSelect: 'text' }}>
          <FlexBox style={{ fontWeight: 600 }} py={'4px'}>
            Unchecking one of these boxes will disable the respective queue.
          </FlexBox>
          Please use this only in dire circumstances, and add a banner in the Banners
          tab to explain why the queue is diasbled.
        </Box>
        <AdminQueuesTable style={{ borderTop: '1px solid #4d3c7b' }}>
          {queues && loading === false && (
            <>
              <AdminQueuesHeaderRow>
                <AdminQueuesCell>Queue</AdminQueuesCell>
                <AdminQueuesCell>Toggle</AdminQueuesCell>
                <AdminQueuesCell>Enabled?</AdminQueuesCell>
              </AdminQueuesHeaderRow>

              {(Object.entries(queues) as Array<[GameMode, boolean]>).map(
                ([gameMode, enabled]) => (
                  <AdminQueuesRow key={gameMode}>
                    <AdminQueuesCell
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'flex-start',
                        alignItems: 'center'
                      }}
                    >
                      {enabled ? (
                        gameMode
                      ) : (
                        <strong style={{ fontWeight: 'bold', color: 'warm9' }}>
                          {gameMode}
                        </strong>
                      )}
                    </AdminQueuesCell>
                    <AdminQueuesCell>
                      <Checkbox
                        checked={enabled}
                        onClick={() => {
                          setQueueEnabled(gameMode, !enabled)
                        }}
                      ></Checkbox>
                    </AdminQueuesCell>
                    <AdminQueuesCell>
                      {enabled ? (
                        'Enabled'
                      ) : (
                        <strong style={{ fontWeight: 'bold', color: 'warm9' }}>
                          Disabled
                        </strong>
                      )}
                    </AdminQueuesCell>
                  </AdminQueuesRow>
                )
              )}
            </>
          )}
        </AdminQueuesTable>
      </>
    </Container>
  )
})

const columns = '1fr 0.2fr 0.3fr'
const AdminQueuesTable = styled(AdminTable)`
  border: 0;
`
const AdminQueuesCell = styled(AdminCell)`
  user-select: text;
`
const AdminQueuesHeaderRow = styled(AdminHeaderRow)`
  grid-template-columns: ${columns};
`
const AdminQueuesRow = styled(AdminRow)`
  grid-template-columns: ${columns};

  &:last-child {
    border-bottom: 0;
  }
  &:nth-child(even) {
    background-color: #221549;
  }
`
const SubTitle = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.purple9};
`

export default AdminQueues

AdminQueues.displayName = 'AdminQueues'
