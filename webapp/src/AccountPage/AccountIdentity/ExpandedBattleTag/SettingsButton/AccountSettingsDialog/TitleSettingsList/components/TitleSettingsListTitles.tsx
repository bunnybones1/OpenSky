import { SkyTagTitlesLibrary } from '@opensky/shared/cosmetics'
import clsx from 'clsx'
import { memo, useCallback } from 'react'

import { SoundClient } from '~/shared/clients'
import { SkyTagTitle } from '~/shared/components/SkyTagTitle'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useUpdatedAuthedAccount } from '~/shared/mutations/useUpdateAuthedAccount'
import { useSkyTagTitleBalances } from '~/shared/queries/useSkyTagTitleBalances'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { SkyTagTitleSelectorStyle } from '../shared/SkyTagTitleSelectorStyle.css'

interface SkyTagTitleSelectorProps {
  id: number
  isSelected: boolean
  returnToDefaultPage: () => void
}

const SkyTagTitleSelector = memo(
  ({ id, isSelected, returnToDefaultPage }: SkyTagTitleSelectorProps) => {
    const skyTagTitle = SkyTagTitlesLibrary.get(id)

    const updateAuthedAccount = useUpdatedAuthedAccount()

    const onClick = useCallback(() => {
      updateAuthedAccount.mutate({
        titleID: id
      })
      returnToDefaultPage()
    }, [id, returnToDefaultPage, updateAuthedAccount])

    if (!skyTagTitle) return null

    return (
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            height: 'full',
            backgroundColor: 'purple4',
            border: '1px solid',
            borderColor: 'purple7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }),
          SkyTagTitleSelectorStyle,
          { isSelected }
        )}
        onClick={onClick}
        onMouseDown={() => SoundClient.playSound('CursorMainClick')}
        onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
      >
        <SkyTagTitle id={id} fontSize="12px" />
      </div>
    )
  }
)

SkyTagTitleSelector.displayName = 'SkyTagTitleSelector'

interface TitleSettingsListTitlesProps {
  returnToDefaultPage: () => void
}

export const TitleSettingsListTitles = memo(
  ({ returnToDefaultPage }: TitleSettingsListTitlesProps) => {
    const { data: titles } = useSkyTagTitleBalances()
    const { data: authedAccount } = useAuthedAccount()

    if (!titles || !titles.length) return null

    return (
      <>
        {titles.map((title) => (
          <SkyTagTitleSelector
            isSelected={title.tokenID === authedAccount?.titleID}
            id={title.tokenID}
            key={title.tokenID}
            returnToDefaultPage={returnToDefaultPage}
          />
        ))}
      </>
    )
  }
)

TitleSettingsListTitles.displayName = 'TitleSettingsListTitles'
