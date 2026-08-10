import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { TitleDetail } from '~/shared/components/TitleDetail'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { ThemeVars } from '~/shared/style/Theme.css'

import { SEQUENCE_SIGNATURE_INFO_DIALOG_ID } from '../shared/constants'
import {
  Container,
  InfoText,
  TitleContainer
} from './SequenceSignatureInfoDialog.css'

const { closeDialog } = controlDialog(SEQUENCE_SIGNATURE_INFO_DIALOG_ID)

export const SequenceSignatureInfoDialog = memo(() => {
  const { t } = useTranslation()
  const { getAssetUrl } = useGetAssetContext()
  return (
    <div className={Container}>
      <div
        className={Sprinkles({
          width: 'full',
          display: 'flex',
          alignItems: 'center',
          position: 'relative'
        })}
        style={{
          border: `1px solid ${ThemeVars.color.purple7}`,
          height: '78px',
          backgroundColor: ThemeVars.color.purple1
        }}
      >
        <TitleDetail title={t('signTransaction.whySignTitle').toLocaleUpperCase()} />
        <div
          className={Sprinkles({
            position: 'absolute'
          })}
          style={{
            right: '4px',
            top: '4px',
            cursor: 'pointer'
          }}
          onClick={closeDialog}
        >
          <Icon type="close" height="20px" color="white" />
        </div>
      </div>
      <div
        className={TitleContainer}
        style={{
          backgroundImage: !!getAssetUrl
            ? `linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), linear-gradient(to top, rgba(12, 6, 30, 0.4), rgba(12, 6, 30, 0.9)), url(${getAssetUrl(
                'webapp/backgrounds/bg-dark-03.webp'
              )})`
            : undefined
        }}
      >
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column',
            paddingRight: '48px'
          })}
        >
          <div
            className={Sprinkles({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px'
            })}
            style={{
              width: '120px',
              backgroundColor: ThemeVars.color.purple5,
              borderRadius: '4px'
            }}
          >
            {!!getAssetUrl && (
              <img
                src={getAssetUrl('webapp/icons/silver-gold-cards.webp')}
                style={{
                  height: '60px',
                  marginRight: '4px'
                }}
              />
            )}
            <Icon type="lock" height="32px" color="purple8" />
          </div>
          {!!getAssetUrl && (
            <img
              src={getAssetUrl('webapp/icons/sequence-block-large.webp')}
              style={{
                height: '120px',
                marginTop: '8px'
              }}
            />
          )}
        </div>
        <Text className={InfoText} color="purple9" fontWeight="500">
          {t('signTransaction.whySignDescription')}
        </Text>
      </div>
    </div>
  )
})

SequenceSignatureInfoDialog.displayName = 'SequenceSignatureInfoDialog'
