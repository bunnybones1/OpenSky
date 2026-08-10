import debounce from 'lodash-es/debounce'
import {
  ChangeEvent,
  KeyboardEvent,
  memo,
  useCallback,
  useMemo,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import { useUnmount } from 'react-use'

import { Input } from '~/__deprecated__/Input/Input'
import { Box, FlexBox } from '~/shared/components/Base'

import { TagSettingsTags } from './TagSettingsTags/TagSettingsTags'

interface TagSettingsListProps {
  returnToDefaultPage: () => void
}

export const TagSettingsList = memo(
  ({ returnToDefaultPage }: TagSettingsListProps) => {
    const { t } = useTranslation()

    const [inputText, setInputText] = useState('')
    const [searchText, setSearchText] = useState('')

    const handleSearchTextChange = useCallback((text: string) => {
      setSearchText(text)
    }, [])

    const debouncedHandleSearchTextChange = useMemo(
      () => debounce(handleSearchTextChange, 400),
      [handleSearchTextChange]
    )

    const handleInputTextChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        setInputText(e.target.value)
        debouncedHandleSearchTextChange(e.target.value)
      },
      [debouncedHandleSearchTextChange]
    )

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
      }
    }, [])

    const handleClear = useCallback(() => {
      setInputText('')
      setSearchText('')
    }, [])

    useUnmount(() => {
      debouncedHandleSearchTextChange.cancel()
    })

    return (
      <FlexBox
        width="100%"
        height="100%"
        type="centered-start-column"
        flexWrap="nowrap"
      >
        <FlexBox
          pb={[16, 16, 20]}
          px={16}
          width="100%"
          alignItems="center"
          zIndex={2}
          justifyContent="flex-start"
        >
          <Box height={36} width={252}>
            <Input
              value={inputText}
              onChange={handleInputTextChange}
              placeholder={t(`profile.tagArtSearch`)}
              rounded={true}
              autoFocus={true}
              submitDisabled={true}
              onKeyDown={handleKeyDown}
              onClear={handleClear}
              height={36}
              data-id="tagSettingsListControlsSearch"
            />
          </Box>
        </FlexBox>
        <Box width="100%" flex={1}>
          <TagSettingsTags
            search={searchText}
            returnToDefaultPage={returnToDefaultPage}
          />
        </Box>
      </FlexBox>
    )
  }
)

TagSettingsList.displayName = 'TagSettingsList'
