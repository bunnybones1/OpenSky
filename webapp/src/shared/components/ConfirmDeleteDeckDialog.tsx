import { memo } from 'react'
import { useCallback } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { Text } from '~/__deprecated__/Text'
import { PromptDialog } from '~/shared/components/PromptDialog/PromptDialog'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useDeleteDeck } from '~/shared/mutations/decks/useDeleteDeck'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

const PromptText = memo(() => {
  const { t } = useTranslation()
  return (
    <>
      <div
        className={Sprinkles({
          width: 'full',
          flexWrap: 'wrap',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start'
        })}
      >
        <Trans
          t={t as any}
          i18nKey="deleteDeck"
          components={{
            normal: <Text color="purple9" fontSize="16px" fontWeight="400" />,
            scary: (
              <Text marginX="4px" color="warm9" fontSize="16px" fontWeight="700" />
            )
          }}
        />
      </div>
    </>
  )
})

PromptText.displayName = 'PromptText'

interface ConfirmDeleteDeckDialogProps {
  uuid: string | undefined
  onMutate: () => void
  id: string
}

export const ConfirmDeleteDeckDialog = memo(
  ({ uuid, onMutate, id }: ConfirmDeleteDeckDialogProps) => {
    const { getAssetUrl } = useGetAssetContext()

    const deleteDeck = useDeleteDeck(onMutate)

    const onDismiss = useCallback(() => {
      const { closeDialog } = controlDialog(id)
      closeDialog()
    }, [id])

    const handleDelete = useCallback(() => {
      if (uuid) {
        deleteDeck.mutate({ uuid })
        onDismiss()
      }
    }, [deleteDeck, onDismiss, uuid])

    return (
      <PromptDialog
        imageUrl={
          !!getAssetUrl
            ? getAssetUrl('webapp/backgrounds/bg-delete-modal.webp')
            : undefined
        }
        onDismiss={onDismiss}
        onConfirm={handleDelete}
        confirmColor="blue"
        dismissColor="default"
        prompText={<PromptText />}
      />
    )
  }
)

ConfirmDeleteDeckDialog.displayName = 'ConfirmDeleteDeckDialog'
