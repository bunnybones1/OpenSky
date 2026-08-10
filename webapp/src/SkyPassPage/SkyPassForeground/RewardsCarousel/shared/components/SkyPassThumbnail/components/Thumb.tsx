import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Box, FlexBox, Text } from '~/shared/components/Base'

import { ThumbType } from '../shared/constants'
import { ThumbBorder, ThumbContainer, ThumbOverlay } from './Thumb.css'

interface Props {
  type: ThumbType
}

export const Thumb = memo(({ type }: Props) => {
  const { t } = useTranslation()

  return (
    <FlexBox
      type="centered-row"
      style={{ left: 0, right: 0, marginLeft: 'auto', marginRight: 'auto' }}
      className={clsx('thumbContainer', ThumbContainer[type.toLowerCase()])}
    >
      <FlexBox type="centered-row" bg="purple1" zIndex={3}>
        <Text
          fontSize={'11px'}
          color={type === ThumbType.FREE ? 'purple8' : 'cold5'}
          fontWeight="bold"
          style={{ lineHeight: '12px' }}
          mt={'1px'}
        >
          {t(`skypass.thumbs.${type}`)}
        </Text>
      </FlexBox>
      <FlexBox
        type="centered-row"
        className={clsx('thumbBorder', ThumbBorder[type.toLowerCase()])}
      />
      <Box className={clsx('thumbOverlay', ThumbOverlay)} />
    </FlexBox>
  )
})

Thumb.displayName = 'Thumb'
