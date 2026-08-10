import { UserStorageKeys } from '@opensky/shared/constants'
import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { SoundClient } from '~/shared/clients'
import { Icon } from '~/shared/components/Icon/Icon'
import { Slider } from '~/shared/components/Slider'
import { Text } from '~/shared/components/Text'
import { useUpdateUserStorage } from '~/shared/mutations/useUpdateUserStorage'
import { useUserStorage } from '~/shared/queries/useUserStorage'
import { soundState, updateSoundState } from '~/shared/state/sound-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ContainerSoundSettings, SeparatorSoundSettings } from './SoundSettings.css'

export const SoundSettings = memo(() => {
  const { t } = useTranslation()
  const { data: soundSettings } = useUserStorage(UserStorageKeys.SOUND_SETTINGS)
  const { musicVolume, queueVolume, interfaceVolume } = useSnapshot(soundState)
  const updateUserStorage = useUpdateUserStorage()

  const onSaveSoundSettings = useCallback(() => {
    updateUserStorage.mutate({
      key: UserStorageKeys.SOUND_SETTINGS,
      value: {
        interface: soundState.interfaceVolume,
        music: soundState.musicVolume,
        queue: soundState.queueVolume
      }
    })
  }, [updateUserStorage])

  const onMusicVolumeUpdate = useCallback((volume) => {
    updateSoundState('musicVolume', volume)
  }, [])

  const onQueueVolumeUpdate = useCallback((volume) => {
    updateSoundState('queueVolume', volume)
    SoundClient.playSound('MatchFound')
  }, [])

  const onInterfaceVolumeUpdate = useCallback((volume) => {
    updateSoundState('interfaceVolume', volume)
    SoundClient.playSound('CursorMainClick')
  }, [])

  return (
    <div
      className={Sprinkles({
        paddingTop: '32px',
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'column',
        justifyContent: 'center',
        width: 'full'
      })}
    >
      <div
        className={clsx(
          Sprinkles({ backgroundColor: 'purple7', marginY: '16px' }),
          SeparatorSoundSettings
        )}
      />
      <Text fontSize="22px" color="purple8" fontWeight={'600'}>
        {t('profile.audio')}
      </Text>
      {soundSettings === undefined ? (
        <div className={Sprinkles({ paddingTop: '32px', paddingBottom: '16px' })}>
          <Icon type="spinner" height="32px" color="purple9" />
        </div>
      ) : (
        <>
          <div
            className={clsx(
              Sprinkles({
                paddingTop: '36px',
                display: 'flex',
                alignItems: 'center'
              }),
              ContainerSoundSettings
            )}
          >
            <Slider
              clickSound={null}
              value={musicVolume}
              leftLabel={t('profile.musicVolume')}
              onChange={onSaveSoundSettings}
              onCallback={onMusicVolumeUpdate}
            />
          </div>
          <div
            className={clsx(
              Sprinkles({
                paddingTop: '36px',
                display: 'flex',
                alignItems: 'center'
              }),
              ContainerSoundSettings
            )}
          >
            <Slider
              clickSound={null}
              value={interfaceVolume}
              leftLabel={t('profile.interfaceVolume')}
              onChange={onSaveSoundSettings}
              onCallback={onInterfaceVolumeUpdate}
            />
          </div>
          <div
            className={clsx(
              Sprinkles({
                paddingY: '36px',
                display: 'flex',
                alignItems: 'center'
              }),
              ContainerSoundSettings
            )}
          >
            <Slider
              clickSound={null}
              value={queueVolume}
              leftLabel={t('profile.queueVolume')}
              onChange={onSaveSoundSettings}
              onCallback={onQueueVolumeUpdate}
            />
          </div>
        </>
      )}
      <div
        className={clsx(
          Sprinkles({ backgroundColor: 'purple7', marginY: '16px' }),
          SeparatorSoundSettings
        )}
      />
    </div>
  )
})

SoundSettings.displayName = 'SoundSettings'
