import { UserStorageKeys } from '@opensky/shared/constants'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import Select from '~/__deprecated__/Select/Select'
import { Box, FlexBox, Grid, Text } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import { TitleDetail } from '~/shared/components/TitleDetail'
import { STATE_CONFIRMATION_DIALOG_ID } from '~/shared/constants/ui'
import { useCat3State } from '~/shared/hooks/useCategoryThreeState'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useUpdateUserStorage } from '~/shared/mutations/useUpdateUserStorage'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { StateConfirmationDialogStyle } from './StateConfirmationDialog.css'

const US_STATES = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming'
] as const

const { closeDialog } = controlDialog(STATE_CONFIRMATION_DIALOG_ID)

const StateConfirmationDialog = memo(() => {
  const { cat3State } = useCat3State()
  const { t } = useTranslation()

  const [localSelectedState, setLocalSelectedState] = useState<string | undefined>(
    cat3State
  )
  const updateUserStorage = useUpdateUserStorage()

  const options = useMemo(() => {
    const baseOptions = US_STATES.map((state) => ({
      value: state,
      selected: state === localSelectedState,
      label: state
    }))

    const isUS =
      !!window.sessStorage &&
      !!window.sessStorage.countryCode &&
      window.sessStorage.countryCode === 'US'

    return [
      ...(isUS
        ? []
        : [
            {
              value: 'No Longer US Citizen',
              selected: 'No Longer US Citizen' === localSelectedState,
              label: t('support.USconfirm.noLongerUScitizen')
            }
          ]),
      ...baseOptions
    ]
  }, [localSelectedState, t])

  useEffect(() => {
    if (!!cat3State && !localSelectedState) {
      setLocalSelectedState(cat3State)
    }
  }, [cat3State, localSelectedState])

  const handleSelectChange = (selected: any) => {
    setLocalSelectedState(selected)
  }

  const onClick = useCallback(() => {
    if (localSelectedState !== cat3State) {
      closeDialog()

      updateUserStorage.mutate({
        key: UserStorageKeys.CATEGORY_THREE_STATE,
        value: { state: localSelectedState }
      })
    }
    updateUserStorage.mutate({
      key: UserStorageKeys.CURRENT_US_STATE,
      value: localSelectedState ? { state: localSelectedState } : undefined
    })
  }, [cat3State, localSelectedState, updateUserStorage])

  return (
    <FlexBox
      type="centered-start-column"
      flexWrap="nowrap"
      className={StateConfirmationDialogStyle}
    >
      <Box
        height={[60, 60, 78, 78]}
        width="100%"
        borderBottom="1px solid"
        borderColor="purple7"
        bg={'purple2'}
      >
        <TitleDetail title={t('general.stateConfirmation')} />
      </Box>

      <Box
        height={['100vh', '100vh', '100vh', '500px']}
        width="100%"
        bg={['purple1']}
        padding={['16px', '16px', '16px', '48px']}
        overflow="auto"
        position={'relative'}
      >
        <Text textWrap={true} color="warm5" fontSize={'18x'} fontWeight="bold">
          {t('support.USconfirm.limitedAccessDisclaimerLineOne')}{' '}
          {t('support.USconfirm.limitedAccessDisclaimerLineTwo')}{' '}
          {t('support.USconfirm.limitedAccessDisclaimerLineThree')}
          {t('support.USconfirm.limitedAccessDisclaimerLineFour')}
        </Text>
        <Text color="purple8" fontSize={'16px'} mb={'8px'} mt={'8px'}>
          {t('support.USconfirm.limitedAccessDisclaimerLineFive')}:
        </Text>
        <Grid gridTemplateColumns={'1fr 1fr'} style={{ alignItems: 'center' }}>
          <Select
            options={options}
            onChange={handleSelectChange}
            placeholder={t('support.USconfirm.state')}
            clearable={false}
            maxListHeight={['140px', '140px', '140px', '200px']}
            className="quickfilter__select"
          />
          <Box>
            <Button
              frameType="default"
              colorType="default"
              text={t('general.CONFIRM')}
              onClick={onClick}
              buttonClassName={Sprinkles({
                paddingX: '32px',
                marginLeft: '16px'
              })}
            />
          </Box>
        </Grid>
      </Box>
    </FlexBox>
  )
})

StateConfirmationDialog.displayName = 'StateConfirmationDialog'

export default StateConfirmationDialog
