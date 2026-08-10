//go:build integration

package payments_test

import (
	"context"
	"fmt"
	"math/big"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stripe/stripe-go/v74"
	"github.com/upper/db/v4"
	"go.uber.org/mock/gomock"

	"github.com/horizon-games/OpenSky/api/apitest"
	"github.com/horizon-games/OpenSky/api/data"
	analyticsMock "github.com/horizon-games/OpenSky/api/lib/analytics/mock"
	"github.com/horizon-games/OpenSky/api/lib/contracts"
	"github.com/horizon-games/OpenSky/api/lib/jobqueue"
	"github.com/horizon-games/OpenSky/api/lib/payments"
	"github.com/horizon-games/OpenSky/api/lib/payments/mock"
	"github.com/horizon-games/OpenSky/api/proto"
)

func TestEventHandler(t *testing.T) {
	var accountID, anotherAccountID proto.AccountID

	var address proto.Hash

	var stripeEventGetter *mock.MockStripeEventGetter

	var productConverter *mock.MockProductConverter

	var itemTokenGetter *mock.MockItemTokenGetter

	var itemGainer *mock.MockItemGainer

	var analyticsTracker *analyticsMock.MockTracker

	var metricsCollector *mock.MockMetricsCollector

	// Setup
	{
		// Account
		{
			var err error

			accountID, address, err = apitest.CreateRandomAccount("TestEventHandler")
			require.NoError(t, err)

			anotherAccountID, _, err = apitest.CreateRandomAccount("TestEventHandler-another")
			require.NoError(t, err)
		}

		// Mocks
		{
			ctrl := gomock.NewController(t)

			stripeEventGetter = mock.NewMockStripeEventGetter(ctrl)
			productConverter = mock.NewMockProductConverter(ctrl)
			itemTokenGetter = mock.NewMockItemTokenGetter(ctrl)
			itemGainer = mock.NewMockItemGainer(ctrl)
			analyticsTracker = analyticsMock.NewMockTracker(ctrl)
			metricsCollector = mock.NewMockMetricsCollector(ctrl)

			metricsCollector.EXPECT().TrackPayment(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).AnyTimes()
		}
	}

	handler := payments.NewEventHandler(
		stripeEventGetter,
		productConverter,
		itemTokenGetter,
		itemGainer,
		analyticsTracker,
		metricsCollector,
	)

	ctx := context.Background()

	productID := "conquest_tickets_0001"
	itemType := proto.ItemType_SW_CONQUEST_TICKET
	amount := int64(2)
	tokenID := data.ConquestTicketTokenID

	someError := fmt.Errorf("some error")

	t.Run("handle stripe event", func(t *testing.T) {
		eventID := "event-id"
		provider := proto.PaymentProvider_STRIPE

		intentRequestDataType := "payments.IntentRequest"
		stripeEventDataType := "*stripe.Event"

		stripeEvent := &stripe.Event{
			Data: &stripe.EventData{
				Object: map[string]interface{}{
					"amount_total": 1.2,
					"currency":     "usd",
				},
			},
			ID: eventID,
		}

		expectedAnalyticsItemPurchase := proto.AnalyticsItemPurchase{
			AccountID:    accountID,
			ProductID:    productID,
			Currency:     "usd",
			PricePerUnit: 0.6,
			Quantity:     uint32(amount),
			TotalPrice:   1.2,
			Platform:     "stripe",
			Token:        "conquest_tickets",
			ItemType:     itemType,
		}

		t.Run("grants item", func(t *testing.T) {
			tests := []string{"checkout.session.completed", "checkout.session.async_payment_succeeded"}

			for _, tt := range tests {
				t.Run(fmt.Sprintf("for event type %s", tt), func(t *testing.T) {
					transactionID := uuid.NewString()

					// Setup
					{
						var payment *data.Payment

						// Payments
						{
							payment = &data.Payment{
								Payment: &proto.Payment{
									AccountID:     accountID,
									Status:        proto.PaymentStatusPtr(proto.PaymentStatus_PENDING),
									Provider:      &provider,
									ExternalTxnID: transactionID,
								},
							}
							err := data.DB.Save(payment)
							require.NoError(t, err)
						}

						// Payment Logs
						{
							paymentLog, err := data.NewPaymentLog(payment.ID, payments.IntentRequest{
								ProductID: productID,
							})
							require.NoError(t, err)
							err = data.DB.Save(paymentLog)
							require.NoError(t, err)
						}
					}

					stripeEvent.Data.Object["id"] = transactionID
					stripeEvent.Type = tt

					expectedAnalyticsItemPurchase.TransactionID = transactionID

					stripeEventGetter.EXPECT().GetEvent(gomock.Any(), eventID).Return(stripeEvent, nil)

					productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
					productConverter.EXPECT().ToAmount(productID).Return(amount)

					itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

					itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenID uint64, amount int64) {
						assert.Greater(t, int(payment.ID), 0)
						assert.Equal(t, accountID, payment.AccountID)
						assert.Equal(t, transactionID, payment.ExternalTxnID)
					})

					analyticsTracker.EXPECT().TrackItemPurchase(gomock.Any(), &expectedAnalyticsItemPurchase)

					err := handler.HandleStripeEvent(ctx, eventID)
					require.NoError(t, err)

					paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_SUCCEEDED)
					checkPaymentLogs(t, paymentID, []string{intentRequestDataType, stripeEventDataType})
				})
			}
		})

		t.Run("set payment as failed", func(t *testing.T) {
			tests := []string{"checkout.session.expired", "checkout.session.async_payment_failed"}

			for _, tt := range tests {
				t.Run(fmt.Sprintf("for event type %s", tt), func(t *testing.T) {
					transactionID := uuid.NewString()

					// Setup
					{
						var payment *data.Payment

						// Payments
						{
							payment = &data.Payment{
								Payment: &proto.Payment{
									AccountID:     accountID,
									Status:        proto.PaymentStatusPtr(proto.PaymentStatus_PENDING),
									Provider:      &provider,
									ExternalTxnID: transactionID,
								},
							}
							err := data.DB.Save(payment)
							require.NoError(t, err)
						}
					}

					stripeEvent.Data.Object["id"] = transactionID
					stripeEvent.Type = tt

					stripeEventGetter.EXPECT().GetEvent(gomock.Any(), eventID).Return(stripeEvent, nil)

					err := handler.HandleStripeEvent(ctx, eventID)
					require.NoError(t, err)

					paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_FAILED)
					checkPaymentLogs(t, paymentID, []string{stripeEventDataType})
				})
			}
		})

		t.Run("only stores a log when type of event is not supported", func(t *testing.T) {
			transactionID := uuid.NewString()

			// Setup
			{
				var payment *data.Payment

				// Payments
				{
					payment = &data.Payment{
						Payment: &proto.Payment{
							AccountID:     accountID,
							Status:        proto.PaymentStatusPtr(proto.PaymentStatus_PENDING),
							Provider:      &provider,
							ExternalTxnID: transactionID,
						},
					}
					err := data.DB.Save(payment)
					require.NoError(t, err)
				}
			}

			stripeEvent.Data.Object["id"] = transactionID
			stripeEvent.Type = "other.type"

			stripeEventGetter.EXPECT().GetEvent(gomock.Any(), eventID).Return(stripeEvent, nil)

			err := handler.HandleStripeEvent(ctx, eventID)
			require.NoError(t, err)

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_PENDING)
			checkPaymentLogs(t, paymentID, []string{stripeEventDataType})
		})

		t.Run("does nothing when payment is already successful", func(t *testing.T) {
			transactionID := uuid.NewString()

			// Setup
			{
				var payment *data.Payment

				// Payments
				{
					payment = &data.Payment{
						Payment: &proto.Payment{
							AccountID:     accountID,
							Status:        proto.PaymentStatusPtr(proto.PaymentStatus_SUCCEEDED),
							Provider:      &provider,
							ExternalTxnID: transactionID,
						},
					}
					err := data.DB.Save(payment)
					require.NoError(t, err)
				}

				// Payment Logs
				{
					paymentLog, err := data.NewPaymentLog(payment.ID, payments.IntentRequest{
						ProductID: productID,
					})
					require.NoError(t, err)
					err = data.DB.Save(paymentLog)
					require.NoError(t, err)
				}
			}

			stripeEvent.Data.Object["id"] = transactionID
			stripeEvent.Type = "checkout.session.completed"

			stripeEventGetter.EXPECT().GetEvent(gomock.Any(), eventID).Return(stripeEvent, nil)

			err := handler.HandleStripeEvent(ctx, eventID)
			require.NoError(t, err)

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_SUCCEEDED)
			checkPaymentLogs(t, paymentID, []string{intentRequestDataType})
		})

		t.Run("fails when gaining item fails", func(t *testing.T) {
			transactionID := uuid.NewString()

			// Setup
			{
				var payment *data.Payment

				// Payments
				{
					payment = &data.Payment{
						Payment: &proto.Payment{
							AccountID:     accountID,
							Status:        proto.PaymentStatusPtr(proto.PaymentStatus_PENDING),
							Provider:      &provider,
							ExternalTxnID: transactionID,
						},
					}
					err := data.DB.Save(payment)
					require.NoError(t, err)
				}

				// Payment Logs
				{
					paymentLog, err := data.NewPaymentLog(payment.ID, payments.IntentRequest{
						ProductID: productID,
					})
					require.NoError(t, err)
					err = data.DB.Save(paymentLog)
					require.NoError(t, err)
				}
			}

			stripeEvent.Data.Object["id"] = transactionID
			stripeEvent.Type = "checkout.session.completed"

			stripeEventGetter.EXPECT().GetEvent(gomock.Any(), eventID).Return(stripeEvent, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(tokenID, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Return(someError)

			err := handler.HandleStripeEvent(ctx, eventID)
			require.ErrorIs(t, err, someError)

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_PENDING)
			checkPaymentLogs(t, paymentID, []string{intentRequestDataType})
		})

		t.Run("fails when getting token fails", func(t *testing.T) {
			transactionID := uuid.NewString()

			// Setup
			{
				var payment *data.Payment

				// Payments
				{
					payment = &data.Payment{
						Payment: &proto.Payment{
							AccountID:     accountID,
							Status:        proto.PaymentStatusPtr(proto.PaymentStatus_PENDING),
							Provider:      &provider,
							ExternalTxnID: transactionID,
						},
					}
					err := data.DB.Save(payment)
					require.NoError(t, err)
				}

				// Payment Logs
				{
					paymentLog, err := data.NewPaymentLog(payment.ID, payments.IntentRequest{
						ProductID: productID,
					})
					require.NoError(t, err)
					err = data.DB.Save(paymentLog)
					require.NoError(t, err)
				}
			}

			stripeEvent.Data.Object["id"] = transactionID
			stripeEvent.Type = "checkout.session.completed"

			stripeEventGetter.EXPECT().GetEvent(gomock.Any(), eventID).Return(stripeEvent, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(&itemType, nil)
			productConverter.EXPECT().ToAmount(productID).Return(amount)

			itemTokenGetter.EXPECT().GetToken(itemType).Return(uint64(0), someError)

			err := handler.HandleStripeEvent(ctx, eventID)
			require.ErrorIs(t, err, someError)

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_PENDING)
			checkPaymentLogs(t, paymentID, []string{intentRequestDataType})
		})

		t.Run("fails when product to item type conversion fails", func(t *testing.T) {
			transactionID := uuid.NewString()

			// Setup
			{
				var payment *data.Payment

				// Payments
				{
					payment = &data.Payment{
						Payment: &proto.Payment{
							AccountID:     accountID,
							Status:        proto.PaymentStatusPtr(proto.PaymentStatus_PENDING),
							Provider:      &provider,
							ExternalTxnID: transactionID,
						},
					}
					err := data.DB.Save(payment)
					require.NoError(t, err)
				}

				// Payment Logs
				{
					paymentLog, err := data.NewPaymentLog(payment.ID, payments.IntentRequest{
						ProductID: productID,
					})
					require.NoError(t, err)
					err = data.DB.Save(paymentLog)
					require.NoError(t, err)
				}
			}

			stripeEvent.Data.Object["id"] = transactionID
			stripeEvent.Type = "checkout.session.completed"

			stripeEventGetter.EXPECT().GetEvent(gomock.Any(), eventID).Return(stripeEvent, nil)

			productConverter.EXPECT().ToItemType(provider, productID).Return(nil, someError)

			err := handler.HandleStripeEvent(ctx, eventID)
			require.ErrorIs(t, err, someError)

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_PENDING)
			checkPaymentLogs(t, paymentID, []string{intentRequestDataType})
		})

		t.Run("fails when intent request in logs does not exist", func(t *testing.T) {
			transactionID := uuid.NewString()

			// Setup
			{
				var payment *data.Payment

				// Payments
				{
					payment = &data.Payment{
						Payment: &proto.Payment{
							AccountID:     accountID,
							Status:        proto.PaymentStatusPtr(proto.PaymentStatus_PENDING),
							Provider:      &provider,
							ExternalTxnID: transactionID,
						},
					}
					err := data.DB.Save(payment)
					require.NoError(t, err)
				}
			}

			stripeEvent.Data.Object["id"] = transactionID
			stripeEvent.Type = "checkout.session.completed"

			stripeEventGetter.EXPECT().GetEvent(gomock.Any(), eventID).Return(stripeEvent, nil)

			err := handler.HandleStripeEvent(ctx, eventID)
			require.ErrorContains(t, err, "intent request does not exist in payment logs")

			paymentID := checkPaymentStatus(t, accountID, provider, transactionID, proto.PaymentStatus_PENDING)
			checkPaymentLogs(t, paymentID, []string{})
		})

		t.Run("fails when payment with the transaction ID does not exist", func(t *testing.T) {
			transactionID := uuid.NewString()

			stripeEvent.Data.Object["id"] = transactionID
			stripeEvent.Type = "checkout.session.completed"

			stripeEventGetter.EXPECT().GetEvent(gomock.Any(), eventID).Return(stripeEvent, nil)

			err := handler.HandleStripeEvent(ctx, eventID)
			require.ErrorContains(t, err, "payment with the transaction ID does not exist")
		})

		t.Run("fails when event has empty checkout session ID", func(t *testing.T) {
			stripeEvent.Data.Object["id"] = ""
			stripeEvent.Type = "checkout.session.completed"

			stripeEventGetter.EXPECT().GetEvent(gomock.Any(), eventID).Return(stripeEvent, nil)

			err := handler.HandleStripeEvent(ctx, eventID)
			require.ErrorContains(t, err, "event does not contain checkout session ID")
		})

		t.Run("fails when getting event fails", func(t *testing.T) {
			stripeEventGetter.EXPECT().GetEvent(gomock.Any(), eventID).Return(nil, someError)

			err := handler.HandleStripeEvent(ctx, eventID)
			require.ErrorIs(t, err, someError)
		})

		t.Run("fails when event ID is empty", func(t *testing.T) {
			err := handler.HandleStripeEvent(ctx, "")
			require.ErrorContains(t, err, "event ID cannot be empty")
		})
	})

	t.Run("handle on-chain item purchase event", func(t *testing.T) {
		provider := proto.PaymentProvider_SEQUENCE

		onChainEventDataType := "payments.OnChainEvent"

		transferEvent := &contracts.ERC20TransferEvent{
			To:    apitest.RandomAddress(),
			Value: big.NewInt(1200000),
		}
		itemPurchaseEvent := &contracts.PaymentProxyItemPurchaseEvent{
			Spender:       address,
			ItemRecipient: address,
			Nonce:         big.NewInt(2),
			ItemIDsPurchased: []*big.Int{
				big.NewInt(int64(tokenID)),
				big.NewInt(int64(tokenID)),
			},
		}

		expectedAnalyticsItemPurchase := proto.AnalyticsItemPurchase{
			AccountID:    accountID,
			ProductID:    productID,
			Currency:     "usdc",
			PricePerUnit: 0.6,
			Quantity:     uint32(amount),
			TotalPrice:   1.2,
			Platform:     "on-chain",
			Token:        "conquest_tickets",
			ItemType:     itemType,
		}

		productQuantity := int64(1)
		priceItemType := proto.ItemType_USDC
		productPrice := big.NewFloat(0.6)

		t.Run("grants item when pending payment exists", func(t *testing.T) {
			nonce := big.NewInt(2)

			var payment *data.Payment

			// Setup
			{
				// Payments
				{
					payment = &data.Payment{
						Payment: &proto.Payment{
							AccountID:     accountID,
							Status:        proto.PaymentStatusPtr(proto.PaymentStatus_PENDING),
							Provider:      &provider,
							ExternalTxnID: nonce.String(),
						},
					}
					err := data.DB.Save(payment)
					require.NoError(t, err)
				}
			}

			txHash := apitest.RandomTxnHash()
			expectedAnalyticsItemPurchase.TransactionID = txHash.String()

			productConverter.EXPECT().ToProductID(provider, &itemType, productQuantity).Return(productID, nil)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(productPrice, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenID uint64, amount int64) {
				assert.Greater(t, int(payment.ID), 0)
				assert.Equal(t, accountID, payment.AccountID)
				assert.Equal(t, txHash.String(), payment.ExternalTxnID)
			})

			analyticsTracker.EXPECT().TrackItemPurchase(gomock.Any(), &expectedAnalyticsItemPurchase)

			err := handler.HandleOnChainItemPurchaseEvent(ctx, txHash, transferEvent, itemPurchaseEvent)
			require.NoError(t, err)

			paymentID := checkPaymentStatus(t, accountID, provider, txHash.String(), proto.PaymentStatus_SUCCEEDED)
			assert.Equal(t, payment.ID, paymentID)
			checkPaymentLogs(t, paymentID, []string{onChainEventDataType})
		})

		t.Run("grants item when no payment exists", func(t *testing.T) {
			txHash := apitest.RandomTxnHash()
			expectedAnalyticsItemPurchase.TransactionID = txHash.String()

			productConverter.EXPECT().ToProductID(provider, &itemType, productQuantity).Return(productID, nil)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(productPrice, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenID uint64, amount int64) {
				assert.Greater(t, int(payment.ID), 0)
				assert.Equal(t, accountID, payment.AccountID)
				assert.Equal(t, txHash.String(), payment.ExternalTxnID)
			})

			analyticsTracker.EXPECT().TrackItemPurchase(gomock.Any(), &expectedAnalyticsItemPurchase)

			err := handler.HandleOnChainItemPurchaseEvent(ctx, txHash, transferEvent, itemPurchaseEvent)
			require.NoError(t, err)

			paymentID := checkPaymentStatus(t, accountID, provider, txHash.String(), proto.PaymentStatus_SUCCEEDED)
			checkPaymentLogs(t, paymentID, []string{onChainEventDataType})
		})

		t.Run("does nothing when the payment is already successful before the process is done", func(t *testing.T) {
			txHash := apitest.RandomTxnHash()
			expectedAnalyticsItemPurchase.TransactionID = txHash.String()

			productConverter.EXPECT().ToProductID(provider, &itemType, productQuantity).Return(productID, nil)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(productPrice, nil)

			var existingPaymentStored bool

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenID uint64, amount int64) {
				if !existingPaymentStored {
					existingPayment := &data.Payment{
						Payment: &proto.Payment{
							AccountID:     anotherAccountID,
							Status:        proto.PaymentStatusPtr(proto.PaymentStatus_SUCCEEDED),
							Provider:      payment.Provider,
							ExternalTxnID: payment.ExternalTxnID,
						},
					}
					err := sess.Save(existingPayment)
					require.NoError(t, err)

					existingPaymentStored = true
				}
			})

			analyticsTracker.EXPECT().TrackItemPurchase(gomock.Any(), &expectedAnalyticsItemPurchase)

			err := handler.HandleOnChainItemPurchaseEvent(ctx, txHash, transferEvent, itemPurchaseEvent)
			require.NoError(t, err)

			checkNoPayment(t, accountID, provider, txHash.String())
		})

		t.Run("fails when gaining item fails", func(t *testing.T) {
			txHash := apitest.RandomTxnHash()

			productConverter.EXPECT().ToProductID(provider, &itemType, productQuantity).Return(productID, nil)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(productPrice, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Return(someError)

			err := handler.HandleOnChainItemPurchaseEvent(ctx, txHash, transferEvent, itemPurchaseEvent)
			require.ErrorIs(t, err, someError)

			checkNoPayment(t, accountID, provider, txHash.String())
		})

		t.Run("fails when price conversion fails", func(t *testing.T) {
			txHash := apitest.RandomTxnHash()

			productConverter.EXPECT().ToProductID(provider, &itemType, productQuantity).Return(productID, nil)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(nil, someError)

			err := handler.HandleOnChainItemPurchaseEvent(ctx, txHash, transferEvent, itemPurchaseEvent)
			require.ErrorIs(t, err, someError)

			checkNoPayment(t, accountID, provider, txHash.String())
		})

		t.Run("fails when product ID conversion fails", func(t *testing.T) {
			txHash := apitest.RandomTxnHash()

			productConverter.EXPECT().ToProductID(provider, &itemType, productQuantity).Return("", someError)

			err := handler.HandleOnChainItemPurchaseEvent(ctx, txHash, transferEvent, itemPurchaseEvent)
			require.ErrorIs(t, err, someError)

			checkNoPayment(t, accountID, provider, txHash.String())
		})

		t.Run("fails when transfer event value does not fit", func(t *testing.T) {
			txHash := apitest.RandomTxnHash()
			transferEvent.Value = big.NewInt(999)

			productConverter.EXPECT().ToProductID(provider, &itemType, productQuantity).Return(productID, nil)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(productPrice, nil)

			err := handler.HandleOnChainItemPurchaseEvent(ctx, txHash, transferEvent, itemPurchaseEvent)
			require.ErrorContains(t, err, "price of products is not the same as the paid value")

			checkNoPayment(t, accountID, provider, txHash.String())
		})

		t.Run("fails when token ID is wrong", func(t *testing.T) {
			txHash := apitest.RandomTxnHash()
			itemPurchaseEvent.ItemIDsPurchased = []*big.Int{big.NewInt(15073281)}

			err := handler.HandleOnChainItemPurchaseEvent(ctx, txHash, transferEvent, itemPurchaseEvent)
			require.ErrorContains(t, err, "invalid item type")

			checkNoPayment(t, accountID, provider, txHash.String())
		})

		t.Run("fails when there are no items", func(t *testing.T) {
			txHash := apitest.RandomTxnHash()
			itemPurchaseEvent.ItemIDsPurchased = nil

			err := handler.HandleOnChainItemPurchaseEvent(ctx, txHash, transferEvent, itemPurchaseEvent)
			require.ErrorContains(t, err, "there are no valid products")

			checkNoPayment(t, accountID, provider, txHash.String())
		})

		t.Run("fails when item purchase event is nil", func(t *testing.T) {
			txHash := apitest.RandomTxnHash()

			err := handler.HandleOnChainItemPurchaseEvent(ctx, txHash, transferEvent, nil)
			require.ErrorContains(t, err, "item purchase event is nil")

			checkNoPayment(t, accountID, provider, txHash.String())
		})

		t.Run("fails when transfer event is nil", func(t *testing.T) {
			txHash := apitest.RandomTxnHash()

			err := handler.HandleOnChainItemPurchaseEvent(ctx, txHash, nil, itemPurchaseEvent)
			require.ErrorContains(t, err, "transfer event is nil")

			checkNoPayment(t, accountID, provider, txHash.String())
		})

		t.Run("fails when tx hash is not valid", func(t *testing.T) {
			txHash := apitest.RandomAddress()

			err := handler.HandleOnChainItemPurchaseEvent(ctx, txHash, transferEvent, itemPurchaseEvent)
			require.ErrorContains(t, err, "invalid tx hash")

			checkNoPayment(t, accountID, provider, txHash.String())
		})
	})

	t.Run("handle on-chain item burn event", func(t *testing.T) {
		provider := proto.PaymentProvider_SEQUENCE

		onChainEventDataType := "payments.OnChainEvent"

		transferBatchEvent := &contracts.ERC1155TransferBatchEvent{
			To: apitest.RandomAddress(),
			IDs: []*big.Int{
				big.NewInt(jobqueue.ConquestTicketV1ID),
				big.NewInt(jobqueue.ConquestTicketV1ID),
			},
			Amounts: []*big.Int{
				big.NewInt(100),
				big.NewInt(100),
			},
		}
		itemBurnEvent := &contracts.PaymentProxyItemBurnEvent{
			Spender:       address,
			ItemRecipient: address,
			Nonce:         big.NewInt(2),
			ItemIDsPurchased: []*big.Int{
				big.NewInt(int64(tokenID)),
				big.NewInt(int64(tokenID)),
			},
		}

		expectedAnalyticsItemPurchase := proto.AnalyticsItemPurchase{
			AccountID:    accountID,
			ProductID:    productID,
			Currency:     proto.ItemType_SW_CONQUEST_TICKET.String(),
			PricePerUnit: 1,
			Quantity:     uint32(amount),
			TotalPrice:   2,
			Platform:     "on-chain",
			Token:        "conquest_tickets",
			ItemType:     itemType,
		}

		productQuantity := int64(1)
		priceItemType := proto.ItemType_SW_CONQUEST_TICKET
		productPrice := big.NewFloat(1)

		t.Run("grants item when pending payment exists", func(t *testing.T) {
			nonce := big.NewInt(2)

			var payment *data.Payment

			// Setup
			{
				// Payments
				{
					payment = &data.Payment{
						Payment: &proto.Payment{
							AccountID:     accountID,
							Status:        proto.PaymentStatusPtr(proto.PaymentStatus_PENDING),
							Provider:      &provider,
							ExternalTxnID: nonce.String(),
						},
					}
					err := data.DB.Save(payment)
					require.NoError(t, err)
				}
			}

			txHash := apitest.RandomTxnHash()
			expectedAnalyticsItemPurchase.TransactionID = txHash.String()

			productConverter.EXPECT().ToProductID(provider, &itemType, productQuantity).Return(productID, nil)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(productPrice, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenID uint64, amount int64) {
				assert.Greater(t, int(payment.ID), 0)
				assert.Equal(t, accountID, payment.AccountID)
				assert.Equal(t, txHash.String(), payment.ExternalTxnID)
			})

			analyticsTracker.EXPECT().TrackItemPurchase(gomock.Any(), &expectedAnalyticsItemPurchase)

			err := handler.HandleOnChainItemBurnEvent(ctx, txHash, transferBatchEvent, itemBurnEvent)
			require.NoError(t, err)

			paymentID := checkPaymentStatus(t, accountID, provider, txHash.String(), proto.PaymentStatus_SUCCEEDED)
			assert.Equal(t, payment.ID, paymentID)
			checkPaymentLogs(t, paymentID, []string{onChainEventDataType})
		})

		t.Run("grants item when no payment exists", func(t *testing.T) {
			txHash := apitest.RandomTxnHash()
			expectedAnalyticsItemPurchase.TransactionID = txHash.String()

			productConverter.EXPECT().ToProductID(provider, &itemType, productQuantity).Return(productID, nil)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(productPrice, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenID uint64, amount int64) {
				assert.Greater(t, int(payment.ID), 0)
				assert.Equal(t, accountID, payment.AccountID)
				assert.Equal(t, txHash.String(), payment.ExternalTxnID)
			})

			analyticsTracker.EXPECT().TrackItemPurchase(gomock.Any(), &expectedAnalyticsItemPurchase)

			err := handler.HandleOnChainItemBurnEvent(ctx, txHash, transferBatchEvent, itemBurnEvent)
			require.NoError(t, err)

			paymentID := checkPaymentStatus(t, accountID, provider, txHash.String(), proto.PaymentStatus_SUCCEEDED)
			checkPaymentLogs(t, paymentID, []string{onChainEventDataType})
		})

		t.Run("does nothing when the payment is already successful before the process is done", func(t *testing.T) {
			txHash := apitest.RandomTxnHash()
			expectedAnalyticsItemPurchase.TransactionID = txHash.String()

			productConverter.EXPECT().ToProductID(provider, &itemType, productQuantity).Return(productID, nil)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(productPrice, nil)

			var existingPaymentStored bool

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Do(func(sess db.Session, payment *data.Payment, tokenID uint64, amount int64) {
				if !existingPaymentStored {
					existingPayment := &data.Payment{
						Payment: &proto.Payment{
							AccountID:     anotherAccountID,
							Status:        proto.PaymentStatusPtr(proto.PaymentStatus_SUCCEEDED),
							Provider:      payment.Provider,
							ExternalTxnID: payment.ExternalTxnID,
						},
					}
					err := sess.Save(existingPayment)
					require.NoError(t, err)

					existingPaymentStored = true
				}
			})

			analyticsTracker.EXPECT().TrackItemPurchase(gomock.Any(), &expectedAnalyticsItemPurchase)

			err := handler.HandleOnChainItemBurnEvent(ctx, txHash, transferBatchEvent, itemBurnEvent)
			require.NoError(t, err)

			checkNoPayment(t, accountID, provider, txHash.String())
		})

		t.Run("fails when gaining item fails", func(t *testing.T) {
			txHash := apitest.RandomTxnHash()

			productConverter.EXPECT().ToProductID(provider, &itemType, productQuantity).Return(productID, nil)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(productPrice, nil)

			itemGainer.EXPECT().Gain(gomock.Any(), gomock.Any(), tokenID, amount).Return(someError)

			err := handler.HandleOnChainItemBurnEvent(ctx, txHash, transferBatchEvent, itemBurnEvent)
			require.ErrorIs(t, err, someError)

			checkNoPayment(t, accountID, provider, txHash.String())
		})

		t.Run("fails when price conversion fails", func(t *testing.T) {
			txHash := apitest.RandomTxnHash()

			productConverter.EXPECT().ToProductID(provider, &itemType, productQuantity).Return(productID, nil)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(nil, someError)

			err := handler.HandleOnChainItemBurnEvent(ctx, txHash, transferBatchEvent, itemBurnEvent)
			require.ErrorIs(t, err, someError)

			checkNoPayment(t, accountID, provider, txHash.String())
		})

		t.Run("fails when product ID conversion fails", func(t *testing.T) {
			txHash := apitest.RandomTxnHash()

			productConverter.EXPECT().ToProductID(provider, &itemType, productQuantity).Return("", someError)

			err := handler.HandleOnChainItemBurnEvent(ctx, txHash, transferBatchEvent, itemBurnEvent)
			require.ErrorIs(t, err, someError)

			checkNoPayment(t, accountID, provider, txHash.String())
		})

		t.Run("fails when paid price is not the same as a price of products", func(t *testing.T) {
			txHash := apitest.RandomTxnHash()

			productConverter.EXPECT().ToProductID(provider, &itemType, productQuantity).Return(productID, nil)
			productConverter.EXPECT().ToPrice(provider, productID, priceItemType).Return(big.NewFloat(0.1), nil)

			err := handler.HandleOnChainItemBurnEvent(ctx, txHash, transferBatchEvent, itemBurnEvent)
			require.ErrorContains(t, err, "price of products is not the same as the paid value")

			checkNoPayment(t, accountID, provider, txHash.String())
		})

		t.Run("fails when purchased token is wrong", func(t *testing.T) {
			txHash := apitest.RandomTxnHash()
			itemBurnEvent.ItemIDsPurchased = []*big.Int{big.NewInt(15073281)}

			err := handler.HandleOnChainItemBurnEvent(ctx, txHash, transferBatchEvent, itemBurnEvent)
			require.ErrorContains(t, err, "invalid item type")

			checkNoPayment(t, accountID, provider, txHash.String())
		})

		t.Run("fails when there are no items", func(t *testing.T) {
			txHash := apitest.RandomTxnHash()
			itemBurnEvent.ItemIDsPurchased = nil

			err := handler.HandleOnChainItemBurnEvent(ctx, txHash, transferBatchEvent, itemBurnEvent)
			require.ErrorContains(t, err, "there are no valid products")

			checkNoPayment(t, accountID, provider, txHash.String())
		})

		t.Run("fails when paid tokens are mix type", func(t *testing.T) {
			txHash := apitest.RandomTxnHash()
			transferBatchEvent.IDs = []*big.Int{
				big.NewInt(int64(data.ItemTypeAndID2SWTokenID(proto.ItemType_SW_CONQUEST_TICKET, 1))),
				big.NewInt(int64(data.ItemTypeAndID2SWTokenID(proto.ItemType_SW_SILVER_CARDS, 1))),
			}

			err := handler.HandleOnChainItemBurnEvent(ctx, txHash, transferBatchEvent, itemBurnEvent)
			require.ErrorContains(t, err, "transferred tokens cannot be mix type")

			checkNoPayment(t, accountID, provider, txHash.String())
		})

		t.Run("fails when item burn event is nil", func(t *testing.T) {
			txHash := apitest.RandomTxnHash()

			err := handler.HandleOnChainItemBurnEvent(ctx, txHash, transferBatchEvent, nil)
			require.ErrorContains(t, err, "item burn event is nil")

			checkNoPayment(t, accountID, provider, txHash.String())
		})

		t.Run("fails when transfer batch event is nil", func(t *testing.T) {
			txHash := apitest.RandomTxnHash()

			err := handler.HandleOnChainItemBurnEvent(ctx, txHash, nil, itemBurnEvent)
			require.ErrorContains(t, err, "transfer batch event is nil")

			checkNoPayment(t, accountID, provider, txHash.String())
		})

		t.Run("fails when tx hash is not valid", func(t *testing.T) {
			txHash := apitest.RandomAddress()

			err := handler.HandleOnChainItemBurnEvent(ctx, txHash, transferBatchEvent, itemBurnEvent)
			require.ErrorContains(t, err, "invalid tx hash")

			checkNoPayment(t, accountID, provider, txHash.String())
		})
	})
}
