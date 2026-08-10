describe('Cards', function() {
  beforeEach(async(browser) => {
    await browser.openskyLogin();
  });

  test('Switching Card Types', async function(browser) {
    const card = '2064';
    const grades = ['silver', 'gold'];
    await browser
      .openskyGoTo(`/card/${card}/base`)
      .waitForElementVisible(`img[srcset*="${card}"]`)
      .assert.elementPresent('*[data-card-details-grade="base"]', 'Grade is base!');

    for (let ii = 0; ii < grades.length; ii++) {
      await browser
        .waitForElementVisible(`*[data-view-grade="${grades[ii]}"]:enabled`)
        .click(`*[data-view-grade="${grades[ii]}"]:enabled`)
        .assert.elementPresent(`*[data-card-details-grade="${grades[ii]}"]`, `Grade switched to ${grades[ii]}!`)
        .assert.elementPresent('*[data-id="cartButton"]', 'Add to Cart Button is present!');
    }

    await browser
      .end();
  });

  test('Remove Card From Cart On Card Detail Page', async function(browser) {
    const card = '2064';
    await browser
      .clearCart()
      .openskyGoTo(`/card/${card}/silver`)
      .waitForElementVisible(`img[srcset*="${card}"]`)
      .click('*[data-id="cartButton"]:enabled')
      .waitForElementVisible('*[data-id="reviewOrder"]:enabled')
      .click('*[data-id="reviewOrder"]:enabled')
      .assert.elementPresent(`*[data-card-row-id="${card}"]`, 'Card is in cart!')
      .openskyGoTo(`/card/${card}/silver`)
      .waitForElementVisible(`img[srcset*="${card}"]`)
      .click('*[data-id="cartButton"]')
      .assert.not.elementPresent('*[data-id="reviewOrder"]:enabled', 'Card was removed from cart!')
      .end();
  });

  test('Shows Related Card', async function(browser) {
    const card = '2064';
    await browser
      .clearCart()
      .openskyGoTo(`/card/${card}/base`)
      .waitForElementVisible(`img[srcset*="${card}"]`)
      .assert.elementPresent('*[data-card-id="2001"]', 'Moonbeam is related!')
      .end();
  });
});
