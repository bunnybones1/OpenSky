import styled from '@emotion/styled'
import { memo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMount } from 'react-use'

import { Button } from '~/__deprecated__/Button'
import { AccountStatus, ActionType, GMIsAccountBannedReturn } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { Box, FlexBox } from '~/shared/components/Base'
import CopyButton from '~/shared/components/CopyButton'
import { makeAccountRoute } from '~/shared/helpers/routes/general'
import { captureError } from '~/shared/helpers/sentry'

import {
  AdminDetails,
  AdminDetailsContent,
  AdminDetailsList,
  AdminDetailsListItem
} from '../../shared/components/AdminDetails'
import AdminPlayerScore from '../../shared/components/AdminPlayerScore'
import { UserAccount } from '../shared/types'
import AdminUserRename from './components/AdminUserRename'

interface AdminUserDetailsProps {
  account: UserAccount
  setAccount: React.Dispatch<React.SetStateAction<UserAccount | null>>
  reloadAccount: () => Promise<void>
}

const AdminUserDetails = memo(
  ({ account, setAccount, reloadAccount }: AdminUserDetailsProps) => {
    const [error, setError] = useState('')
    const [isBanActionPending, setIsBanActionPending] = useState(false)
    const navigate = useNavigate()

    const checkBanStatus = () =>
      APIClient.opensky
        .gMIsAccountBanned({ account: account.account.address })
        .then((banStatus) => setAccount({ ...account, banStatus }))
        .catch((err: Error) =>
          captureError(err, 'Error in admin user details', true, false)
        )

    useMount(() => {
      checkBanStatus()
    })

    const navigateAccount = () => navigate(makeAccountRoute(account.account.address))

    const unlockBaseCards = async () => {
      const confirmMessage = [
        `Are you sure you want to unlock all base cards for account ${account.account.name} ( ${account.account.address} )?`,
        `NOTE: This will *not* unlock base cards for which the user has a gold or silver version.`
      ].join('\n')

      if (!confirm(confirmMessage)) return

      try {
        await APIClient.opensky.gMUnlockAllBaseCards({
          accountAddress: account.account.address
        })
        alert('Success!')
      } catch (err) {
        alert('Error trying to unlock base cards, ' + err)
      }
    }

    const resetStarterDecks = async () => {
      try {
        const confirmMessage = [
          `Are you sure you want to reset starter decks for account ${account.account.name} (${account.account.address})?`,
          `NOTE: This will re-add any starter decks that have been deleted or edit. It will not unlock locked decks`
        ].join('\n')

        if (!confirm(confirmMessage)) return

        await APIClient.opensky.gMResetStarterDecks({
          address: account.account.address
        })

        if (confirm('Success! Reload page?')) {
          window.location.reload()
        }
      } catch (error) {
        alert('Error trying to reset starter decks, ' + error)
      }
    }

    const blessAccount = async () => {
      const confirmMessage = [
        `Bless user ${account.account.name} ( ${account.account.address} )?`,
        `This unlocks base cards, sets warmup games to 3, and gives 20 levels.`
      ].join('\n')

      if (!confirm(confirmMessage)) return

      try {
        await APIClient.opensky.gMUnlockAllBaseCards({
          accountAddress: account.account.address
        })
        await APIClient.opensky.gMGiveLevels(
          {
            accountAddress: account.account.address,
            levels: 20
          },
          { 'x-cloud-weasel-operation-key': crypto.randomUUID() }
        )
        await APIClient.opensky.gMSetWarmupGamesCompleted({
          accountAddress: account.account.address,
          numGamesCompleted: 3
        })
        alert('Success!')
      } catch (err) {
        alert('Error trying to unlock base cards, ' + err)
      }
    }

    const banOrUnBan = async (
      actionType: ActionType.MOD_BAN | ActionType.MOD_FLAG | ActionType.MOD_VET
    ) => {
      const addr = account.account.address
      let banText =
        actionType === ActionType.MOD_BAN
          ? account.banStatus.banned
            ? 'unban'
            : 'ban'
          : account.banStatus.accountActions.some(
              (a) =>
                a.isActive &&
                (a.actionType === ActionType.MOD_FLAG ||
                  a.actionType === ActionType.AUTO_FLAG)
            )
          ? 'un-flag'
          : 'flag'

      if (actionType === ActionType.MOD_VET) {
        banText = 'vet'
      }

      const confirmMessage = `Are you sure you want to ${banText} ${account.account.name} ( ${account.account.address} )?`
      const banActions = account.banStatus.accountActions.filter((action) => {
        const auto =
          actionType === ActionType.MOD_BAN
            ? action.actionType === ActionType.AUTO_BAN
            : action.actionType === ActionType.AUTO_FLAG
        const mod =
          actionType === ActionType.MOD_BAN
            ? action.actionType === ActionType.MOD_BAN
            : action.actionType === ActionType.MOD_FLAG
        return action.isActive && (auto || mod)
      })

      if (!confirm(confirmMessage)) return

      setIsBanActionPending(true)
      setError('')

      if (banActions.length) {
        // Now redundant?
        // await Promise.all(
        //   banActions.map(a =>
        //     APIClient.opensky
        //       .gMDisableAccountAction(
        //         { actionID: a.id }
        //       )
        //       .then(checkBanStatus)
        //   )
        // )
        //   .catch((err: Error) => setError(err.message))
        //   .finally(() => setIsBanActionPending(false))

        APIClient.opensky
          .gMCreateAccountAction({
            action: {
              id:
                Math.max(0, ...account.banStatus.accountActions.map((a) => a.id)) + 1,
              accountAddress: addr,
              actionType: ActionType.MOD_VET,
              isActive: true
            }
          })
          .then(checkBanStatus)
          .catch((err: Error) => setError(err.message))
          .finally(() => setIsBanActionPending(false))
      } else {
        await APIClient.opensky
          .gMCreateAccountAction({
            action: {
              id:
                Math.max(0, ...account.banStatus.accountActions.map((a) => a.id)) + 1,
              accountAddress: addr,
              actionType,
              isActive: true
            }
          })
          .then(checkBanStatus)
          .catch((err: Error) => setError(err.message))
          .finally(() => setIsBanActionPending(false))
      }
    }

    const isBanned = account.banStatus.status === AccountStatus.BANNED
    const isFlagged = account.banStatus.accountActions.some(
      (a) =>
        a.isActive &&
        (a.actionType === ActionType.MOD_FLAG ||
          a.actionType === ActionType.AUTO_FLAG)
    )
    return (
      <AdminDetails>
        <AdminDetailsContent>
          <FlexBox justifyContent="space-between">
            <FlexBox type="start-column" style={{ gap: 16 }}>
              <FlexBox type="start-column" style={{ gap: 8 }}>
                <AccountName account={account} />
                <AccountAddress account={account} />
              </FlexBox>
              <AdminUserRename account={account.account} onRename={reloadAccount} />
              <FlexBox type="centered-start-column" style={{ gap: 16 }}>
                Bot Score:
                <AdminPlayerScore score={account.score.signals[0]?.score ?? 0} />
              </FlexBox>
              {error && <Box color="warm9">{error}</Box>}
            </FlexBox>

            <FlexBox type="centered-start-column" style={{ gap: 16 }}>
              <Button onClick={navigateAccount} width={150} height={32}>
                Account Page
              </Button>
              <Button onClick={unlockBaseCards} width={150} height={32}>
                Unlock All Base Cards
              </Button>
              <Button onClick={blessAccount} width={150} height={32}>
                Dev Helper Unlocks 🌈
              </Button>
              <Button
                width={150}
                height={32}
                buttonStyle={isBanned ? 'secondary' : 'error'}
                onClick={() => banOrUnBan(ActionType.MOD_BAN)}
                disabled={isBanActionPending}
              >
                {isBanned ? 'Unban 🕊' : 'Ban 🔨'}
              </Button>
              <Button
                width={150}
                height={32}
                buttonStyle={isFlagged ? 'secondary' : 'error'}
                onClick={() => banOrUnBan(ActionType.MOD_FLAG)}
                disabled={isBanActionPending}
              >
                {isFlagged ? 'Un-flag 🕊' : 'Flag 👻'}
              </Button>
              <Button
                width={150}
                height={32}
                onClick={resetStarterDecks}
                buttonStyle="secondary"
              >
                Reset Starter Decks
              </Button>
              {renderVetButton(account.banStatus) && (
                <Button
                  width={150}
                  height={32}
                  buttonStyle={'secondary'}
                  onClick={() => banOrUnBan(ActionType.MOD_VET)}
                >
                  Vet ♥
                </Button>
              )}
            </FlexBox>
          </FlexBox>
        </AdminDetailsContent>

        <AdminDetailsList>
          <AdminDetailsListItem title="Created">
            {new Date(account.account.createdAt).toLocaleString()}
          </AdminDetailsListItem>

          <AdminDetailsListItem
            title={`Global level ${account.account.level} | Season level ${account.account.seasonLevel}`}
          >
            {`${account.account.experience} / ${account.account.levelUpXP} XP`}
          </AdminDetailsListItem>

          <AdminDetailsListItem title="Ban Status">
            {getBanText(account.banStatus)}
          </AdminDetailsListItem>

          <AdminDetailsListItem title="Total Matches">
            {/* {pagination.totalRecords} */}
          </AdminDetailsListItem>
        </AdminDetailsList>
      </AdminDetails>
    )
  }
)

function renderVetButton(status: GMIsAccountBannedReturn) {
  const vetFilter = status.accountActions.filter(
    (accountAction) => accountAction.actionType === ActionType.MOD_VET
  )

  if (vetFilter && vetFilter.length > 0) {
    return false
  }

  return true
}

// NOTE: previously it was possible to know when a player was unbanned, unclear if this is possible with new system
function getBanText(status: GMIsAccountBannedReturn) {
  return status.accountActions.length
    ? status.accountActions.map((s, i) => {
        let banText
        switch (s.actionType) {
          case ActionType.AUTO_BAN:
            banText = 'Automatically banned'
            break
          case ActionType.MOD_BAN:
            banText = `Banned by ${s.createdBy}`
            break
          case ActionType.AUTO_FLAG:
            banText = `Automatically flagged`
            break
          case ActionType.MOD_FLAG:
            banText = `Flagged by ${s.createdBy}`
            break
          case ActionType.MOD_VET:
            banText = `Vetted by ${s.createdBy}`
            break
          default:
            banText = `${s.actionType} by ${s.createdBy}`
        }

        const getTextColor = () => {
          if (s.actionType === ActionType.MOD_VET) {
            return 'forest4'
          }
          if (s.isActive) {
            return 'warm9'
          }

          return 'gray'
        }

        return (
          <div key={`${s.id}-${i}`} style={{ color: getTextColor() }}>
            {banText}
            {` at ${formatTime(status.accountActions[0].createdAt)}`}
          </div>
        )
      })
    : 'Not Banned'
}

const formatTime = (value?: string) =>
  value ? new Date(value).toLocaleString() : null

export default AdminUserDetails

const AccountName = ({ account }: { account: UserAccount }) => {
  return (
    <FlexBox type="centered-start-row" style={{ gap: 8 }}>
      <Title>{account.account.name}</Title>
      <CopyButton width={62} height={36} value={account.account.name} />
    </FlexBox>
  )
}

const AccountAddress = ({ account }: { account: UserAccount }) => {
  return (
    <FlexBox type="centered-start-row" style={{ fontFamily: 'monospace', gap: 8 }}>
      <SubTitle>{account.account.address}</SubTitle>
      <CopyButton width={62} height={36} value={account.account.address} />
    </FlexBox>
  )
}

const Title = styled.h2`
  margin: 0;
  font-size: 32px;
  font-weight: bold;
  display: inline-block;
  color: white;
`

const SubTitle = styled.h2`
  margin: 0;
  font-size: 100%;
  font-weight: bold;
  display: inline-block;
  color: ${({ theme }) => theme.colors.purple9};
`

AdminUserDetails.displayName = 'AdminUserDetails'
