import clsx from 'clsx'
import { CSSProperties, memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Box } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import { TitleDetail } from '~/shared/components/TitleDetail'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { AccountSettingsDialogStyle } from './AccountSettingsDialog.css'
import { AccountSettingsControls } from './components/AccountSettingsControls'
import { DefaultSettingsList } from './DefaultSettingsList/DefaultSettingsList'
import { RegionSettingsList } from './RegionSettingsList/RegionSettingsList'
import { TagSettingsList } from './TagSettingsList/TagSettingsList'
import { TitleSettingsList } from './TitleSettingsList/TitleSettingsList'

export const AccountSettingsDialog = memo(() => {
  const { getAssetUrl } = useGetAssetContext()
  const [listMode, setListMode] = useState<'default' | 'art' | 'country' | 'title'>(
    'default'
  )
  const isTabletWide = useResponsiveQuery('tabletWide')

  const { t } = useTranslation()

  const mainContainerStyle = useMemo<CSSProperties>(
    () => ({
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundImage: !!getAssetUrl
        ? `linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), linear-gradient(to top, rgba(12, 6, 30, 0.4), rgba(12, 6, 30, 0.9)), url(${getAssetUrl(
            'webapp/backgrounds/bg-dark-03.webp'
          )})`
        : undefined
    }),
    [getAssetUrl]
  )

  const goBack = useCallback(() => {
    setListMode('default')
  }, [])

  const list = useMemo(() => {
    switch (listMode) {
      case 'art': {
        return <TagSettingsList returnToDefaultPage={goBack} />
      }
      case 'country': {
        return <RegionSettingsList returnToDefaultPage={goBack} />
      }
      case 'title': {
        return <TitleSettingsList returnToDefaultPage={goBack} />
      }
      default:
        return <DefaultSettingsList setListMode={setListMode} />
    }
  }, [goBack, listMode])

  return (
    <div className={clsx(AccountSettingsDialogStyle, Sprinkles({ display: 'grid' }))}>
      <div
        className={Sprinkles({
          width: 'full',
          height: 'full',
          borderBottom: '1px solid',
          borderColor: 'purple7',
          backgroundColor: isTabletWide ? 'purple1' : 'purple4'
        })}
      >
        <TitleDetail title={t('generic.Settings')} />
      </div>
      <div
        style={mainContainerStyle}
        className={Sprinkles({
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          flexDirection: 'column',
          width: 'full',
          height: 'full',
          overflow: 'auto',
          flexWrap: 'nowrap',
          paddingY: '32px',
          pointerEvents: 'all'
        })}
      >
        {list}
      </div>
      <AccountSettingsControls />
      {listMode !== 'default' && (
        <Box position="absolute" top={[10, 10, 12, 12]} left={[10, 10, 12, 12]}>
          <Button
            frameType="default"
            colorType="default"
            onClick={goBack}
            buttonId="region-settings"
            text={t('general.Back')}
            leftAdornment={{ icon: 'chevron-left' }}
          />
        </Box>
      )}
    </div>
  )
})

AccountSettingsDialog.displayName = 'AccountSettingsDialog'
