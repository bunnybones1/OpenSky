import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Item, Tab } from '~/__deprecated__/Tab'
import { FlexBox, Text } from '~/shared/components/Base'
import { Icon } from '~/shared/components/Icon/Icon'
import { useIsExternalProfile } from '~/shared/hooks/useIsExternalProfile'

import { PublicSpectateCode } from './components/PublicSpectateCode'
import { SpectateCode } from './SpectateCode/SpectateCode'

type State = 'private' | 'public'

export const SpectateInfo = memo(() => {
  const [boxState, setBoxState] = useState<State>('public')

  const { t } = useTranslation()

  const tabItems = useMemo<Item[]>(
    () => [
      {
        text: t('profile.spectate.headerTabPublic'),
        icon: 'link-public',
        value: 'public'
      },
      {
        text: t('profile.spectate.headerTabPrivate'),
        icon: 'link-secret',
        value: 'private'
      }
    ],
    [t]
  )

  const onTabSelect = useCallback(
    (selected: Array<string | number>) => setBoxState(selected[0] as State),
    [setBoxState]
  )

  const isExternalProfile = useIsExternalProfile()

  return (
    <FlexBox
      width="100%"
      flexDirection="column"
      alignItems="flex-start"
      justifyContent="flex-start"
      mt={16}
    >
      <FlexBox
        height={52}
        width="100%"
        bg="purple4"
        borderTop="1px solid"
        borderBottom="1px solid"
        borderColor="purple6"
        alignItems="center"
        justifyContent="space-between"
        pl={12}
        pr={12}
      >
        <Text
          fontWeight="medium"
          fontFamily="condensed"
          fontSize={26}
          color="purple9"
        >
          {t(
            !isExternalProfile
              ? 'profile.spectate.headerPlural'
              : 'profile.spectate.headerSingular'
          )}
        </Text>
        {!isExternalProfile ? (
          <Tab
            buttonWidth={130}
            items={tabItems}
            selected={[boxState]}
            allowNoSelection={false}
            allowMultiSelection={false}
            onChange={onTabSelect}
            component={(item: Item) => <TabItemComponent {...item} />}
          />
        ) : null}
      </FlexBox>
      <FlexBox
        width="100%"
        alignItems="flex-start"
        justifyContent="flex-start"
        flexDirection="column"
        flexWrap="nowrap"
        p={16}
        bg="purple2"
      >
        {boxState === 'private' ? <SpectateCode /> : <PublicSpectateCode />}
        <FlexBox width="100%" mt="10px" alignItems="center" justifyContent="centter">
          <Text
            fontSize={12}
            color="purple8"
            fontWeight="medium"
            textAlign="center"
            width="100%"
            textWrap
          >
            {t(
              isExternalProfile
                ? 'profile.spectate.disclaimerOtherPlayerPublic'
                : boxState === 'private'
                ? 'profile.spectate.disclaimer'
                : 'profile.spectate.disclaimerPublic'
            )}
          </Text>
        </FlexBox>
      </FlexBox>
    </FlexBox>
  )
})

SpectateInfo.displayName = 'SpectateInfo'

const _TabItemComponent = ({ text, icon, iconColor }: Item) => {
  return (
    <FlexBox width="100%" height="100%" type="centered-row">
      {!!icon && (
        <Icon
          className="tab-icon"
          type={icon}
          color={iconColor || 'white'}
          height="24px"
        />
      )}
      <Text fontSize={16} color="white" fontFamily="condensed" pl={1}>
        {text}
      </Text>
    </FlexBox>
  )
}
const TabItemComponent = memo(_TabItemComponent)
