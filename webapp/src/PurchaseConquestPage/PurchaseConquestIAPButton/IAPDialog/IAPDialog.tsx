// import * as Sentry from '@sentry/browser'
import clsx from 'clsx'
import { BigNumber } from 'ethers'
import orderBy from 'lodash-es/orderBy'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useSnapshot } from 'valtio'

import { AuthenticationClient, MobileClient } from '~/shared/clients'
import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { updateConquestTicketsSelectorState } from '~/shared/state/conquest-tickets-state'
import { mobileState, updateMobileState } from '~/shared/state/mobile-state'
import { addToast } from '~/shared/state/toast-state'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { IAP_DIALOG_ID } from '../shared/constants'
import IAPQuantityRow from './components/IAPQuantityRow'
import {
  IAPDialogControlsRow,
  IAPDialogHeader,
  IAPDialogStyle,
  IAPDialogSubmitButtonWrapper,
  IAPDialogTotalRow
} from './IAPDialog.css'

const { closeDialog } = controlDialog(IAP_DIALOG_ID)

export const IAPDialog = memo(() => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [conquestProducts, setConquestProducts] = useState(undefined as any)
  const { getAssetUrl } = useGetAssetContext()
  const { IAPs, isConquestTransactionLoading } = useSnapshot(mobileState)

  const ConquestIAPData = useMemo(() => {
    return orderBy(
      IAPs.filter((product) => product.iapType === 'conquest'),
      ['quantity'],
      ['asc']
    )
  }, [IAPs])

  useEffect(() => {
    if (!conquestProducts) {
      if (ConquestIAPData) {
        // Sentry.captureMessage(
        //   'Conquest IAP Data: ' + JSON.stringify(ConquestIAPData),
        //   'info'
        // )
        // setConquestProducts(
        //   ConquestIAPData.map((iapProduct, i) => {
        //     return {
        //       value: iapProduct.productId,
        //       label: iapProduct.quantity,
        //       selected: i === 0 ? true : false
        //     }
        //   })
        // )
      } else {
        setConquestProducts(null)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ConquestIAPData])

  const selectedProduct = useMemo(() => {
    if (conquestProducts) {
      const filteredProductOption = conquestProducts.find(
        (product) => product.selected
      )

      if (filteredProductOption) {
        const filteredProduct = ConquestIAPData.find(
          (product) => product.productId === filteredProductOption?.value
        )
        return filteredProduct
      }
    }

    return null
  }, [ConquestIAPData, conquestProducts])

  const processOrder = useCallback(async () => {
    /**
     * #TODO: Once this function is called show a loading screen, then send a postMessage to the mobile app indicating the productID the user has purchased. The order will be handled on the mobile app side. Upon completion:
     * 1. A finished transaction action will be sent back in a message to the webapp, including a transactionId
     * 2. Return to the home page and display the Prompt which shows the transaction is processing (the user of course and also view it in their wallet.)
     * 3. User should be able to click "Transaction Order Processing" and view that transaction
     * 4. Track the transaction on web3 and when it is complete, update the database using this transactionId.
     *
     */

    const contracts = AuthenticationClient.wallet?.contracts

    if (!contracts) {
      throw new Error('Unable to process order; no contracts.')
    }

    const availableSupply =
      await contracts.FreeConquestEntriesFactory.getAvailableSupply()

    // Sentry.captureMessage(
    //   'Available Remaining Supply: ' + BigNumber.from(availableSupply).toString(),
    //   'info'
    // )

    // #TODO: Temporary checks until we open IAP up to the public
    if (availableSupply.lte(BigNumber.from(50 * 100))) {
      // Sentry.captureMessage(
      //   'Not enough supply to purchase:' + BigNumber.from(availableSupply).toString(),
      //   'warning'
      // )
      closeDialog()
      updateMobileState('shouldShowConquestIAPModal', true)
    } else {
      updateMobileState('isConquestTransactionLoading', true)
      updateConquestTicketsSelectorState('hasPurchasedConquest', true)
      const productID = String(selectedProduct?.productId).trim()

      MobileClient.purchaseIAPProduct(productID)

      // Sentry.captureMessage(
      //   'Purchasing Conquest ticket with product ID: ' + productID,
      //   'info'
      // )

      addToast({
        text: t('notification.conquestTicketPurchased'),
        secondaryText: t('notification.conquestTicketLoadingSecondary'),
        icon: 'spinner',
        iconColor: 'white',
        isEvergreen: true
      })

      updateMobileState('isConquestTransactionLoading', true)
      navigate(ROUTES_CONFIG.routes.PLAY.routes.CONQUEST.directPath)
      closeDialog()
    }
  }, [navigate, selectedProduct?.productId, t])

  //#TODO: Use mobileUI.iap.products and map the array onto the rows (showing units and updating with the quantity)

  /**
   *
   * An IAP product is has the following (and more) in the struct... for more info see https://react-native-iap.dooboolab.com/docs/api_reference/product
   *  title: string;
      iapType: string;
      description: string;
      price: string;
      currency: string;
      localizedPrice: string;
      productID: string;
      quantity: number;
   */
  return (
    <div
      className={clsx(
        Sprinkles({
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          flexDirection: 'column'
        }),
        IAPDialogStyle
      )}
    >
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            borderBottom: '1px solid',
            borderColor: 'purple7',
            backgroundColor: 'purple1',
            position: 'relative',
            alignItems: 'center',
            display: 'flex',
            justifyContent: 'space-between'
          }),
          IAPDialogHeader
        )}
      >
        <div
          className={Sprinkles({
            color: 'white',
            fontFamily: 'condensed',
            fontWeight: '600',
            fontSize: { base: '22px', tabletWide: '26px' },
            paddingLeft: { base: '16px', tabletWide: '0px' }
          })}
        >
          {t('shop.buyTicketsWithInAppPurchase')}
        </div>
      </div>
      {ConquestIAPData && conquestProducts && (
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'flex-start',
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'flex-start',
            width: 'full',
            position: 'relative',
            backgroundColor: 'purple1'
          })}
        >
          <IAPQuantityRow
            showHeader={true}
            customCurrency={selectedProduct?.currency}
            customTitle={selectedProduct?.title}
            products={conquestProducts}
            setProducts={setConquestProducts}
            selectedProduct={selectedProduct}
          />
        </div>
      )}

      {!ConquestIAPData && (
        <div
          className={Sprinkles({
            backgroundColor: 'purple1',
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            width: 'full'
          })}
        >
          <Icon type="spinner" color="white" height="24px" />
        </div>
      )}

      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            paddingX: '16px',
            borderColor: 'purple7',
            borderTop: '1px solid',
            backgroundColor: 'purple3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end'
          }),
          IAPDialogTotalRow
        )}
      >
        <Text
          fontSize={{ base: '14px', tablet: '16px' }}
          color="white"
          marginRight="16px"
        >
          {t('generic.total')}:
        </Text>
        <Text
          fontSize={{ base: '14px', tablet: '16px' }}
          color="white"
          marginLeft="4px"
          fontWeight="600"
        >
          {!selectedProduct && <>{t('shop.selectProduct')} </>}{' '}
          {selectedProduct && <>{selectedProduct?.localizedPrice} </>}
        </Text>
      </div>
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            borderTop: '1px solid',
            backgroundColor: 'purple1',
            borderColor: 'purple7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingX: '12px'
          }),
          IAPDialogControlsRow
        )}
      >
        <div className={IAPDialogSubmitButtonWrapper}>
          <Button
            height="36px"
            colorType="blue"
            frameType="default"
            className={FullWidthButtonStyle}
            buttonClassName={FullWidthButtonStyle}
            text={
              isConquestTransactionLoading ? t('shop.processing') : t('shop.purchase')
            }
            disabled={!selectedProduct || isConquestTransactionLoading}
            onClick={processOrder}
            leftAdornment={
              isConquestTransactionLoading || !getAssetUrl
                ? { icon: 'spinner' }
                : { image: getAssetUrl('webapp/icons/conquest-ticket.webp') }
            }
          />
        </div>
      </div>
    </div>
  )
})

IAPDialog.displayName = 'IAPDialog'
