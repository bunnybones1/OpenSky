import clsx from 'clsx'
import { memo } from 'react'

import { DeckClass, ItemType } from '~/lib/proto'
import { Button } from '~/shared/components/Button'
import { Text } from '~/shared/components/Text'
import { useResponsiveQuery } from '~/shared/hooks/ui/useResponsiveQuery'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { useSkypassRewardTitle } from '~/SkyPassPage/SkyPassForeground/SkyPassClaimReward/RewardInfo/hooks/useSkypassRewardTitle'

import { TitleLabel } from './components/TitleLabel'
import {
  RewardInfoButton,
  RewardInfoLock,
  RewardInfoTitleStyle
} from './RewardInfo.css'

const FontSize = { base: '26px', tablet: '32px', tabletWide: '42px' } as const

interface Props {
  itemType: ItemType
  unlockedDecks?: DeckClass[]
  name: string
  buttonText: string
  amount: number
  rewardTokens: number[]
  isButtonDisabled: boolean
  isEarned?: boolean
  isLoading: boolean
  onClick: () => void
}

export const RewardInfo = memo(
  ({
    itemType,
    unlockedDecks,
    name,
    amount,
    rewardTokens,
    isButtonDisabled,
    isEarned,
    buttonText,
    isLoading,
    onClick
  }: Props) => {
    const rewardTitle = useSkypassRewardTitle(
      name,
      itemType,
      amount,
      rewardTokens,
      unlockedDecks
    )
    const { getAssetUrl } = useGetAssetContext()

    const isTabletWide = useResponsiveQuery('tabletWide')
    const isDesktop = useResponsiveQuery('desktop')

    const isLocked = isButtonDisabled && !isEarned

    return (
      <>
        <TitleLabel type={itemType} unlockedDecks={!!unlockedDecks} />
        {rewardTitle && (
          <Text
            color="white"
            fontSize={FontSize}
            fontFamily="condensed"
            fontWeight="600"
            className={clsx(
              RewardInfoTitleStyle,
              Sprinkles({
                paddingBottom: isTabletWide ? '20px' : !isLocked ? '8px' : '16px',
                zIndex: 5
              })
            )}
          >
            {rewardTitle}
          </Text>
        )}
        <div className={Sprinkles({ zIndex: 5, position: 'relative' })}>
          {isLocked && !!getAssetUrl && (
            <img
              src={getAssetUrl('webapp/misc/card-lock-no-padding.webp')}
              className={clsx(
                Sprinkles({ position: 'absolute', zIndex: 5 }),
                RewardInfoLock
              )}
            />
          )}
          <Button
            disabled={isButtonDisabled}
            height={isDesktop ? '76px' : isTabletWide ? '52px' : '36px'}
            onClick={onClick}
            buttonId="claim-reward"
            colorType="blue"
            frameType="default"
            text={buttonText}
            isUppercase={true}
            leftAdornment={isLoading ? { icon: 'spinner' } : {}}
            className={clsx(RewardInfoButton, Sprinkles({ height: 'full' }))}
          />
        </div>
      </>
    )
  }
)

RewardInfo.displayName = 'RewardInfo'
