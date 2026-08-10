describe('Market', function() {
  beforeEach(async(browser) => {
    await browser.openskyLogin();
  });

  test('Badge On Market Shows Cards in Cart', async function(browser) {
    const CARD_0 = '2002';
    const CARD_1 = '1072';

    await browser
      .resizeWindow(1079, 1079)
      .clearCart()
      .moveToElement(`*[data-card-id="${CARD_0}"]`, 50, 50)
      .waitForElementVisible(`*[data-card-id="${CARD_0}"] *[data-add-card-id]`)
      .pause(1000)
      .click(`*[data-card-id="${CARD_0}"] *[data-add-card-id]`)
      .assert.containsText('*[data-badge-to="/market/cards/buy"]', '1', 'Market badge text is 1!')
      .moveToElement(`*[data-card-id="${CARD_1}"]`, 50, 50)
      .waitForElementVisible(`*[data-card-id="${CARD_1}"] *[data-add-card-id]`)
      .pause(1000)
      .click(`*[data-card-id="${CARD_1}"] *[data-add-card-id]`)
      .assert.containsText('*[data-badge-to="/market/cards/buy"]', '2', 'Market badge text is 2!')
      .end();
  });

  const buySell = async function(grade, browser) {
    const CARD = '2002';
    // Buy
    const beforeBuyCount = await browser.buyCard(grade, CARD);
    const afterBuyCount = await browser.cardBalance(grade, CARD);

    await browser
      .assert.equal(Number(beforeBuyCount) + 1, afterBuyCount, `${grade} card purchased!`);
    // TODO: Cart is empty after purchase

    // Sell
    await browser
      .resizeWindow(1079, 1079)
      .openskyGoTo('/market/cards/sell')
      .waitForElementVisible('*[data-id="searchBox"]')
      .applyCardFilter(grade)
      .moveToElement(`*[data-card-id="${CARD}"]`, 50, 50)
      .waitForElementVisible(`*[data-card-id="${CARD}"]`)
      .pause(1000)
      .click(`*[data-card-id="${CARD}"] *[data-add-card-id]`);

    const beforeSellCount = await browser.getText(`*[data-card-id="${CARD}"] *[data-id="cardStock"]`);

    await browser
      .waitForElementVisible('*[data-id="reviewOrder"]:enabled')
      .click('*[data-id="reviewOrder"]:enabled')
      .assert.elementPresent(`*[data-card-row-id="${CARD}"]`)
      .assert.attributeEquals(`*[data-card-row-id="${CARD}"]`, 'data-card-row-grade', grade)
      .click('*[data-id="processOrder"]:enabled')
      .focusSequence()
      .sequenceConfirm()
      .focusOpenSky()
      .waitForElementNotPresent('*[data-id="processOrder"]', 120000);

    const afterSellCount = await browser.cardBalance(grade, CARD);

    await browser
      .assert.equal(afterSellCount, Number(beforeSellCount) - 1, `${grade} card sold!`)
      .end();
  };

  // TODO: buying cards with local SW is broken
  /* test('Buying/selling a single gold card', async(browser) => buySell('gold', browser));
  test('Buying/selling a single silver card', async(browser) => buySell('silver', browser)); */

  const getResultCount = async function(browser) {
    let count = await browser.getText('*[data-id="searchResults"]');
    count = count.replace(/[^0-9]/g, '');
    return Number(count);
  };

  const bulkBuySell = async function(grade, prism, browser) {
    const MAX_BULK = 100;

    await browser
      .resizeWindow(1079, 1079)
      .openskyGoTo('/market/cards/sell')
      .applyCardFilter(grade, prism);

    while (await getResultCount(browser) !== 0) {
      await browser
        .openskyGoTo('/market/cards/sell')
        .waitForElementVisible('*[data-id="searchBox"]')
        .applyCardFilter(grade, prism)
        .waitForElementVisible('*[data-id="addAllToOrder"]:not(.disabled)')
        .click('*[data-id="addAllToOrder"]:not(.disabled)')
        .waitForElementVisible('*[data-id="promptAlertConfirm"]')
        .click('*[data-id="promptAlertConfirm"]')
        .waitForElementVisible('*[data-id="reviewOrder"]:enabled')
        .pause(2000)
        .click('*[data-id="reviewOrder"]:enabled')
        .click('*[data-id="processOrder"]:enabled')
        .focusSequence()
        .sequenceConfirm()
        .focusOpenSky()
        .waitForElementNotPresent('*[data-id="processOrder"]', 120000);
    }

    // Bulk Buy
    await browser
      .openskyGoTo('/items/cards')
      .waitForElementVisible('*[data-id="searchBox"]')
      .applyCardFilter(grade, prism);

    const beforeBulkBuyCount = await getResultCount(browser);

    await browser
      .openskyGoTo('/market/cards/buy')
      .waitForElementVisible('*[data-id="searchBox"]')
      .applyCardFilter(grade, prism)
      .waitForElementVisible('*[data-id="addAllToOrder"]:not(.disabled)')
      .click('*[data-id="addAllToOrder"]:not(.disabled)')
      .waitForElementVisible('*[data-id="promptAlertConfirm"]')
      .click('*[data-id="promptAlertConfirm"]')
      .waitForElementVisible('*[data-id="reviewOrder"]:enabled')
      .pause(2000)
      .click('*[data-id="reviewOrder"]:enabled')
      .assert.elementPresent(`*[data-card-row-grade="${grade}"]`)
      .assert.not.elementPresent(`*[data-card-row-grade]:not([data-card-row-grade="${grade}"]`)
      .assert.containsText('*[data-id="cartTotal"]', MAX_BULK)
      .click('*[data-id="processOrder"]:enabled')
      .focusSequence()
      .sequenceConfirm()
      .focusOpenSky()
      .waitForElementNotPresent('*[data-id="processOrder"]', 120000)
      .openskyGoTo('/items/cards')
      .waitForElementVisible('*[data-id="searchBox"]')
      .applyCardFilter(grade, prism)
      .assert.containsText('*[data-id="searchResults"]', beforeBulkBuyCount + MAX_BULK, `Bulk bought ${MAX_BULK} ${grade} cards!`);

    // Bulk Sell
    const beforeBulkSellCount = await getResultCount(browser);

    await browser
      .openskyGoTo('/market/cards/sell')
      .waitForElementVisible('*[data-id="searchBox"]')
      .applyCardFilter(grade, prism)
      .waitForElementVisible('*[data-id="addAllToOrder"]:not(.disabled)')
      .click('*[data-id="addAllToOrder"]:not(.disabled)')
      .waitForElementVisible('*[data-id="promptAlertConfirm"]')
      .click('*[data-id="promptAlertConfirm"]')
      .waitForElementVisible('*[data-id="reviewOrder"]:enabled')
      .pause(2000)
      .click('*[data-id="reviewOrder"]:enabled')
      .assert.elementPresent(`*[data-card-row-grade="${grade}"]`)
      .assert.not.elementPresent(`*[data-card-row-grade]:not([data-card-row-grade="${grade}"]`)
      .assert.containsText('*[data-id="cartTotal"]', MAX_BULK)
      .click('*[data-id="processOrder"]:enabled')
      .focusSequence()
      .sequenceConfirm()
      .focusOpenSky()
      .waitForElementNotPresent('*[data-id="processOrder"]', 120000)
      .openskyGoTo('/items/cards')
      .waitForElementVisible('*[data-id="searchBox"]')
      .applyCardFilter(grade, prism)
      .assert.containsText('*[data-id="searchResults"]', beforeBulkSellCount - MAX_BULK, `Bulk sold ${MAX_BULK} ${grade} cards!`)
      .end();
  };

  // TODO: buying cards with local SW is broken
  /* test('Bulk buying/selling gold cards', async(browser) => bulkBuySell('gold', 'hrt', browser));
  test('Bulk buying/selling silver cards', async(browser) => bulkBuySell('silver', 'str', browser)); */
});
