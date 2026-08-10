
// TODO: I want to get all the tests into a build, will fix after
describe.skip('Conquest', function() {
  beforeEach(async(browser) => {
    await browser.openskyLogin();
  });

  test('Buying a Conquest Ticket with USDC', async function(browser) {
    const TICKETS_TO_BUY = 1;
    await browser
      .clearCart()
      .openskyGoTo('/play/conquest')
      .waitForElementVisible('*[data-id="purchaseTicket"]');

    const balance = await browser.getText('*[data-id="conquestBalance"]');

    await browser
      .click('*[data-id="purchaseTicket"]')
      .waitForElementVisible('*[data-id="chooseUsdc"]:enabled')
      .click('*[data-id="chooseUsdc"]')
      .waitForElementVisible('*[data-id="processOrder"]')
      .updateValue('*[data-id="ticketQuantity"] input', '\x08' + TICKETS_TO_BUY)
      .click('*[data-id="processOrder"]')
      .focusSequence()
      .sequenceConfirm()
      .focusOpenSky()
      .assert.not.elementPresent({
        selector: '*[data-id="processOrder"]',
        timeout: 120000
      })
      .openskyGoTo('/play/conquest')
      .assert.containsText('*[data-id="conquestBalance"]', Number(balance) + TICKETS_TO_BUY, `Balance incresed by ${TICKETS_TO_BUY}!`)
      .end();
  });

  test('Convert Silver Card Into Ticket', async function(browser) {
    const CARD = '2002';
    const beforeBuyCount = await browser.buyCard('silver', CARD);

    await browser
      .openskyGoTo('/play/conquest')
      .waitForElementVisible('*[data-id="purchaseTicket"]');

    const balance = await browser.getText('*[data-id="conquestBalance"]');

    await browser
      .click('*[data-id="purchaseTicket"]')
      .waitForElementVisible('*[data-id="chooseSilver"]:enabled')
      .click('*[data-id="chooseSilver"]')
      .waitForElementVisible('*[data-id="cardSorting"]')
      .click('*[data-id="cardSorting"]')
      .waitForElementVisible('*[data-key="MANA_ASCENDING"]')
      .click('*[data-key="MANA_ASCENDING"]')
      .waitForElementNotPresent('*[data-key="MANA_ASCENDING"]')
      .moveToElement(`*[data-card-id="${CARD}"]`, 50, 50)
      .waitForElementVisible(`*[data-card-id="${CARD}"]`)
      .pause(1000)
      .click(`*[data-card-id="${CARD}"] *[data-add-card-id]`)
      .waitForElementVisible('*[data-id="reviewOrder"]:enabled')
      .click('*[data-id="reviewOrder"]:enabled')
      .waitForElementVisible('*[data-id="processConvertSilver"]:enabled')
      .click('*[data-id="processConvertSilver"]:enabled')
      .waitForElementVisible('*[data-id="promptAlertConfirm"]:enabled')
      .click('*[data-id="promptAlertConfirm"]')
      .focusSequence()
      .sequenceConfirm()
      .focusOpenSky()
      .waitForElementNotPresent('*[data-id="promptAlertConfirm"]', 120000)
      .pause(2000)
      .assert.containsText('*[data-id="conquestBalance"]', Number(balance) + 1, 'Balance incresed by 1!');

    const afterConvertCount = await browser.cardBalance('silver', CARD);

    await browser
      .assert.equal(beforeBuyCount, afterConvertCount, 'Card consumed!')
      .end();
  });
});
