import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { resetHeroFeatureState } from '~/HeroFeaturePage/shared/state'
import { FlexBox, Text } from '~/shared/components/Base'
import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { MINT_HEROES_DIALOG_ID } from '~/shared/constants/ui'
import { formatUSDCBalance } from '~/shared/helpers/market/format-usdc-balance'
import { makeSelectGoldsRoute } from '~/shared/helpers/routes/general'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useConquestAndUSDCBalances } from '~/shared/queries/useConquestAndUSDCBalances'
import { useDispatch, useReduxStore } from '~/shared/redux'
import { heroFeatureIdSelector } from '~/shared/redux/router/selectors'
import {
  selectGoldsState,
  updateSelectGoldsState
} from '~/shared/state/select-golds/select-golds-state'

import { useMintHeroesTotal } from '../shared/hooks/useMintHeroesTotal'
import { useConfirmHeroMintOrder } from './useConfirmHeroMintOrder/useConfirmHeroMintOrder'

const { closeDialog } = controlDialog(MINT_HEROES_DIALOG_ID)

export const MintHeroesModalControls = memo(() => {
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const { selectedCards } = useSnapshot(selectGoldsState)
  const store = useReduxStore()
  const { getAssetUrl } = useGetAssetContext()

  const { data: balances } = useConquestAndUSDCBalances()
  const { total, totalGoldReduction } = useMintHeroesTotal(selectedCards)

  const onGoldCardButtonClick = useCallback(() => {
    const id = heroFeatureIdSelector(store.getState())

    if (!!id) {
      updateSelectGoldsState('previousFeatureId', id)
    }
    closeDialog()

    dispatch(push(makeSelectGoldsRoute()))
  }, [dispatch, store])

  const isButtonDisabled = useMemo(() => {
    // eslint-disable-next-line valtio/state-snapshot-rule
    if (!!selectedCards.length && totalGoldReduction.loading) return true
    if (!balances || !total) return true

    const actualTotal = !!totalGoldReduction.value
      ? total - totalGoldReduction.value
      : total

    const formattedTotal = formatUSDCBalance(actualTotal)

    return balances.USDCBalance < formattedTotal
  }, [
    selectedCards.length,
    totalGoldReduction.loading,
    totalGoldReduction.value,
    balances,
    total
  ])

  const { confirmHeroMintOrder, isConfirming } = useConfirmHeroMintOrder()

  const onClearAll = useCallback(() => {
    resetHeroFeatureState()
  }, [])

  return (
    <>
      <FlexBox type="centered-start-row">
        <FlexBox type="centered-start-row" onClick={onClearAll} mr="16px">
          <Icon type="trash" color="white" height="16px" />
          <Text color="white" fontSize={14} fontWeight="medium" ml="4px">
            {t('general.clearAll')}
          </Text>
        </FlexBox>
        <Button
          frameType="default"
          colorType="default"
          onClick={onGoldCardButtonClick}
          disabled={isButtonDisabled || isConfirming}
          text={t('heroFeature.goldCardsButton')}
          leftAdornment={
            !!getAssetUrl
              ? {
                  image: getAssetUrl('webapp/icons/gold-card-with-letter.webp')
                }
              : undefined
          }
        />
      </FlexBox>
      <Button
        frameType="default"
        colorType="blue"
        onClick={confirmHeroMintOrder}
        disabled={isButtonDisabled || isConfirming}
        text={isConfirming ? undefined : t('shop.confirmBuy')}
        leftAdornment={{ icon: isConfirming ? 'spinner' : undefined }}
      />
    </>
  )
})

MintHeroesModalControls.displayName = 'MintHeroesModalControls'
