import { FlagCodes } from '@opensky/shared/constants'
import { useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { produce } from 'immer'
import { noop } from 'lodash-es'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Account } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { BattleTag } from '~/shared/components/BattleTag/BattleTag'
import { Icon } from '~/shared/components/Icon/Icon'
import { PromptDialog } from '~/shared/components/PromptDialog/PromptDialog'
import { Text } from '~/shared/components/Text'
import { GameType } from '~/shared/constants/ranks'
import { getUseAccountKey } from '~/shared/constants/react-query-keys'
import { useAccountTagArtUrl } from '~/shared/hooks/useAccountTagArtUrl'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useAccount } from '~/shared/queries/useAccount'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CONFIRM_INVITED_BY_DIALOG_ID } from '../shared/constants'
import { ConfirmInvitedByDialogPromptText } from './ConfirmInvitedByDialog.css'

interface ConfirmInvitedByDialogProps {
  address: string | undefined
  onClose: () => void
}

const { closeDialog } = controlDialog(CONFIRM_INVITED_BY_DIALOG_ID)

export const ConfirmInvitedByDialog = memo(
  ({ address, onClose }: ConfirmInvitedByDialogProps) => {
    const { data: invitedByAccount } = useAccount(address)
    const { data: authedAccount } = useAuthedAccount()
    const queryClient = useQueryClient()
    const { t } = useTranslation()

    const handleConfirm = useCallback(() => {
      if (!!address && !!authedAccount) {
        queryClient.setQueryData<Account | undefined>(
          getUseAccountKey(authedAccount.address),
          (data) => {
            if (!data) return
            return produce(data, (draft) => {
              draft.invitedBy = address
            })
          }
        )

        APIClient.opensky.setInvitedBy({
          req: {
            address: authedAccount.address,
            invitedBy: address
          }
        })
      }

      closeDialog()
    }, [address, authedAccount, queryClient])

    const onDismiss = useCallback(() => {
      closeDialog()
      onClose()
    }, [onClose])

    const tagArtUrl = useAccountTagArtUrl(invitedByAccount?.tagArtID)

    const rank = useMemo(() => {
      const rankToUse = invitedByAccount?.stats?.rankedConstructed

      if (!rankToUse) return undefined

      return {
        playerRank: rankToUse.playerRank,
        playerRankStage: rankToUse.playerRankStage,
        rank: rankToUse.rank,
        text: t(`ranks.${rankToUse.playerRank}`),
        mode: GameType.CONSTRUCTED
      }
    }, [invitedByAccount?.stats?.rankedConstructed, t])

    const promptText = useMemo(() => {
      return (
        <div
          className={Sprinkles({
            width: 'full',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          })}
        >
          {!!invitedByAccount && (
            <div
              className={Sprinkles({
                width: 'full',
                marginBottom: '16px',
                marginLeft: '8px'
              })}
            >
              <BattleTag
                name={invitedByAccount.name}
                region={invitedByAccount.region as FlagCodes | undefined}
                skyTagTitle={invitedByAccount.titleID}
                crystalID={invitedByAccount.crystalID}
                rank={rank}
                artUrl={tagArtUrl?.raw}
              />
            </div>
          )}
          <div
            dangerouslySetInnerHTML={{
              __html: t('inviteFriends.confirmInvitedBy', {
                name: invitedByAccount ? invitedByAccount.name : t('play.yourFriend')
              })
            }}
            className={clsx(
              Sprinkles({
                color: 'purple9',
                fontSize: '14px',
                textAlign: 'center',
                fontWeight: '600'
              }),
              ConfirmInvitedByDialogPromptText
            )}
          />
        </div>
      )
    }, [invitedByAccount, rank, t, tagArtUrl?.raw])

    return (
      <PromptDialog
        confirmText={t('general.Confirm')}
        dismissText={t('general.cancel')}
        prompText={promptText}
        confirmColor="blue"
        dismissColor="default"
        onDismiss={onDismiss}
        onConfirm={!!address ? handleConfirm : noop}
      >
        <div
          className={Sprinkles({
            width: 'full',
            marginBottom: '16px',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          })}
        >
          <Icon color="warm8" height="12px" type="alert" />
          <Text color="warm8" marginLeft="4px" fontWeight="600" fontSize="14px">
            {t('inviteFriends.confirmInvitedByWarning')}
          </Text>
        </div>
      </PromptDialog>
    )
  }
)

ConfirmInvitedByDialog.displayName = 'ConfirmInvitedByDialog'
