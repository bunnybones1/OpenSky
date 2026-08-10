import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { RowArt } from '~/__deprecated__/RowArt'
import { Theme } from '~/__deprecated__/style/Theme'
import { SoundClient } from '~/shared/clients'
import { Box, FlexBox } from '~/shared/components/Base'
import { Icon } from '~/shared/components/Icon/Icon'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useUpdatedAuthedAccount } from '~/shared/mutations/useUpdateAuthedAccount'

interface Props {
  id: string
  isLocked: boolean
  type: 'bg' | 'unit' | 'spell'
  bg?: string
  onClick: () => void
}

export const TagSettingsTag = memo(({ id, isLocked, type, onClick }: Props) => {
  const { t } = useTranslation()
  const { data: authedAccount } = useAuthedAccount()
  const { getAssetUrl } = useGetAssetContext()

  const isActive = id === authedAccount?.tagArtID

  const updateAuthedAccount = useUpdatedAuthedAccount()

  const onSelect = useCallback(() => {
    if (isLocked || isActive) return
    updateAuthedAccount.mutate({
      tagArtID: id
    })
    onClick()
  }, [id, isActive, isLocked, onClick, updateAuthedAccount])

  return (
    <Box
      height="100%"
      width="100%"
      onClick={onSelect}
      position="relative"
      bg="purple1"
      data-tag-art-id={id}
      data-tag-art-active={isActive}
      onMouseDown={() => SoundClient.playSound('CursorMainClick')}
      onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
    >
      <Box
        zIndex={2}
        className="dimIfLocked"
        position="absolute"
        top="0px"
        left="0px"
        width="100%"
        height="100%"
        style={{
          border: isActive
            ? `2px solid ${Theme.colors.purple9}`
            : `1px solid ${Theme.colors.purple7}`
        }}
      />
      <FlexBox
        position="absolute"
        top={0}
        left={0}
        width="100%"
        height="100%"
        zIndex={1}
        type="centered-row"
        overflow="hidden"
      >
        {!!getAssetUrl && (
          <RowArt
            art={getAssetUrl(
              `webapp/cards/art-rows/${type.toLowerCase()}s/2x/${id}@2x.webp`
            )}
          />
        )}
      </FlexBox>
      {isLocked && (
        <>
          <Tooltip placement="top" tooltip={t('tooltip.skytagRequirement')}>
            <Box
              zIndex={4}
              left={12}
              position="absolute"
              top="50%"
              className="lockIcon"
              transform="translateY(-50%)"
            >
              <Icon type="lock" height="12px" color="purple9" />
            </Box>
            <Box
              width="100%"
              height="100%"
              position="absolute"
              top={0}
              left={0}
              opacity={0.65}
              bg="purple1"
              zIndex={3}
            />
          </Tooltip>
        </>
      )}
    </Box>
  )
})

TagSettingsTag.displayName = 'TagSettingsTag'
