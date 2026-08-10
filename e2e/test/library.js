describe('Filters and Sorting', function() {
  beforeEach(async(browser) => {
    await browser.openskyLogin();
  });

  test('Card quick filter', async function(browser) {
    await browser
      .resizeWindow(1079, 1079)
      .openskyGoTo('/items/cards')
      .waitForElementVisible('#app *[data-id="searchBox"]')
      .waitForElementVisible('*[data-id="mobileQuickFilter"]')
      .click({
        selector: '*[data-id="mobileQuickFilter"]',
        timeout: 120000
      })
      .waitForElementVisible('*[data-key="ALL"]')
      .click('*[data-key="ALL"]')
      .waitForElementNotPresent('*[data-key="OWNED"]');

    const options = ['OWNED', 'LOCKED'];
    const notPresent = ['img[srcset*="-locked.png"]', 'img[srcset]:not([srcset*="-locked.png"])'];
    for (let ii = 0; ii < options.length; ii++) {
      await browser
        .click({
          selector: '*[data-id="mobileQuickFilter"]',
          timeout: 120000
        })
        .waitForElementVisible(`*[data-key="${options[ii]}"]`)
        .click(`*[data-key="${options[ii]}"]`)
        .waitForElementNotPresent('*[data-key="OWNED"]')
        .pause(1000)
        .assert.not.elementPresent(notPresent[ii]);
    }
    await browser
      .end();
  });

  test('Ensure card grade filter works', async function(browser) {
    await browser
      .resizeWindow(1079, 1079)
      .openskyGoTo('/items/cards')
      .waitForElementVisible('#app *[data-id="searchBox"]')
      .waitForElementVisible('*[data-id="mobileQuickFilter"]');

    const grades = ['SW_BASE_CARDS', 'SW_SILVER_CARDS', 'SW_GOLD_CARDS'];
    const presents = ['2002.png', '2002-silver.png', '2002-gold.png'];
    const notPresent0 = ['silver', 'gold', '2002'];
    const notPresent1 = ['gold', '2002', 'silver'];
    for (let ii = 0; ii < grades.length; ii++) {
      await browser
        .click({
          selector: '*[data-id="cardFilter"]',
          timeout: 120000
        })
        .waitForElementVisible('*[data-id="cardFilterClear"]')
        .pause(2000)
        .click(`*[data-key="${grades[ii]}"]`)
        .click('.filterpanel_underlay')
        .click('*[data-id="mobileQuickFilter"]')
        .click('*[data-id="mobileQuickFilter"] *[data-key="ALL"]')
        .waitForElementVisible(`img[srcset*="${presents[ii]}"]`)
        .assert.elementPresent(`img[srcset*="${presents[ii]}"]`, `Found a ${grades[ii]} card!`)
        .assert.not.elementPresent(`img[srcset*="${notPresent0[ii]}.png"]`)
        .assert.not.elementPresent(`img[srcset*="${notPresent1[ii]}.png"]`);
    }
    await browser
      .end();
  });

  test('Ensure prisms filter works', async function(browser) {
    await browser
      .resizeWindow(1079, 1079)
      .openskyGoTo('/items/cards')
      .waitForElementVisible('#app *[data-id="searchBox"]')
      .waitForElementVisible('*[data-id="mobileQuickFilter"]');

    const prisms = ['str', 'wis', 'agy', 'hrt', 'int'];
    const presents = ['/51', '/2002', '/1072', '/3000', '/4074'];
    const notPresent0 = ['/2002', '/51', '/51', '/4074', '/3000'];
    const notPresent1 = ['/1072', '/1072', '/2002', '/2002', '/51'];
    for (let ii = 0; ii < prisms.length; ii++) {
      await browser
        .click({
          selector: '*[data-id="cardFilter"]',
          timeout: 120000
        })
        .waitForElementVisible('*[data-id="cardFilterClear"]')
        .pause(500)
        .click({
          selector: '*[data-id="cardFilterClear"]:enabled',
          timeout: 500,
          suppressNotFoundErrors: true
        })
        .click(`*[data-key="${prisms[ii]}"]`)
        .click('.filterpanel_underlay')
        .click('*[data-id="mobileQuickFilter"]')
        .click('*[data-id="mobileQuickFilter"] *[data-key="ALL"]')
        .waitForElementNotVisible('*[data-id="cardFilterClear"]')
        .waitForElementVisible(`img[srcset*="${presents[ii]}"]`)
        .assert.elementPresent(`img[srcset*="${presents[ii]}"]`, `Found a ${prisms[ii]} card!`)
        .assert.not.elementPresent(`img[srcset*="${notPresent0[ii]}.png"]`)
        .assert.not.elementPresent(`img[srcset*="${notPresent1[ii]}.png"]`);
    }
    await browser
      .end();
  });

  test('Ensure Card Type filter works', async function(browser) {
    await browser
      .resizeWindow(1079, 1079)
      .openskyGoTo('/items/cards')
      .waitForElementVisible('#app *[data-id="searchBox"]')
      .waitForElementVisible('*[data-id="mobileQuickFilter"]');

    const types = ['Spell', 'Unit'];
    const presents = ['/4016', '/33'];
    const notPresent0 = ['/33', '/4016'];
    const notPresent1 = ['/4020', '/32'];
    for (let ii = 0; ii < types.length; ii++) {
      await browser
        .click({
          selector: '*[data-id="cardFilter"]',
          timeout: 120000
        })
        .waitForElementVisible('*[data-id="cardFilterClear"]')
        .pause(500)
        .click({
          selector: '*[data-id="cardFilterClear"]:enabled',
          timeout: 500,
          suppressNotFoundErrors: true
        })
        .click(`*[data-key="${types[ii]}"]`)
        .click('.filterpanel_underlay')
        .click('*[data-id="mobileQuickFilter"]')
        .click('*[data-id="mobileQuickFilter"] *[data-key="ALL"]')
        .waitForElementNotVisible('*[data-id="cardFilterClear"]')
        .waitForElementVisible(`img[srcset*="${presents[ii]}"]`)
        .assert.elementPresent(`img[srcset*="${presents[ii]}"]`, `Found a ${types[ii]} card!`)
        .assert.not.elementPresent(`img[srcset*="${notPresent0[ii]}.png"]`)
        .assert.not.elementPresent(`img[srcset*="${notPresent1[ii]}.png"]`);
    }
    await browser
      .end();
  });

  test('Ensure element filter works', async function(browser) {
    await browser
      .resizeWindow(1079, 1079)
      .openskyGoTo('/items/cards')
      .waitForElementVisible('#app *[data-id="searchBox"]', 120000)
      .waitForElementVisible('*[data-id="mobileQuickFilter"]');

    const elements = ['air', 'dark', 'earth', 'fire', 'light', 'metal', 'mind', 'water'];
    const presents = ['/2085', '/3051', '/2054', '/27', '/4020', '/3016', '/3025', '/2010'];
    const notPresent0 = ['/3051', '/2054', '/27', '/4020', '/3016', '/3025', '/2010', '/2085'];
    const notPresent1 = ['/2054', '/27', '/4020', '/3016', '/3025', '/2010', '/2085', '/3051'];
    for (let ii = 0; ii < elements.length; ii++) {
      await browser
        .click({
          selector: '*[data-id="cardFilter"]',
          timeout: 120000
        })
        .waitForElementVisible('*[data-id="cardFilterClear"]')
        .pause(500)
        .click({
          selector: '*[data-id="cardFilterClear"]:enabled',
          timeout: 500,
          suppressNotFoundErrors: true
        })
        .click(`*[data-key="${elements[ii]}"]`)
        .click('.filterpanel_underlay')
        .click('*[data-id="mobileQuickFilter"]')
        .click('*[data-id="mobileQuickFilter"] *[data-key="ALL"]')
        .waitForElementNotVisible('*[data-id="cardFilterClear"]')
        .waitForElementVisible(`img[srcset*="${presents[ii]}"]`)
        .assert.elementPresent(`img[srcset*="${presents[ii]}"]`, `Found a ${elements[ii]} card!`)
        .assert.not.elementPresent(`img[srcset*="${notPresent0[ii]}.png"]`)
        .assert.not.elementPresent(`img[srcset*="${notPresent1[ii]}.png"]`);
    }
    await browser
      .end();
  });

  test('Ensure traits filter works', async function(browser) {
    await browser
      .resizeWindow(1079, 1079)
      .openskyGoTo('/items/cards')
      .waitForElementVisible('#app *[data-id="searchBox"]')
      .waitForElementVisible('*[data-id="mobileQuickFilter"]');

    const traits = ['Stealth', 'Wither', 'Guard', 'Banner', 'Lifesteal', 'Armor'];
    const presents = ['/4073', '/2031', '/2054', '/33', '/3069', '/4080'];
    const notPresent0 = ['/2031', '/2054', '/33', '/3069', '/4080', '/4073'];
    const notPresent1 = ['/2054', '/33', '/3069', '/4080', '/4073', '/2031'];
    for (let ii = 0; ii < traits.length; ii++) {
      await browser
        .click({
          selector: '*[data-id="cardFilter"]',
          timeout: 120000
        })
        .waitForElementVisible('*[data-id="cardFilterClear"]')
        .pause(500)
        .click({
          selector: '*[data-id="cardFilterClear"]:enabled',
          timeout: 500,
          suppressNotFoundErrors: true
        })
        .click(`*[data-key="${traits[ii]}"]`)
        .click('.filterpanel_underlay')
        .click('*[data-id="mobileQuickFilter"]')
        .click('*[data-id="mobileQuickFilter"] *[data-key="ALL"]')
        .waitForElementNotVisible('*[data-id="cardFilterClear"]')
        .waitForElementVisible(`img[srcset*="${presents[ii]}"]`)
        .assert.elementPresent(`img[srcset*="${presents[ii]}"]`, `Found a(n) ${traits[ii]} card!`)
        .assert.not.elementPresent(`img[srcset*="${notPresent0[ii]}.png"]`)
        .assert.not.elementPresent(`img[srcset*="${notPresent1[ii]}.png"]`);
    }
    await browser
      .end();
  });

  test('Ensure triggers filter works', async function(browser) {
    await browser
      .resizeWindow(1079, 1079)
      .openskyGoTo('/items/cards')
      .waitForElementVisible('#app *[data-id="searchBox"]')
      .waitForElementVisible('*[data-id="mobileQuickFilter"]');

    const triggers = ['Play', 'Summon', 'Inspire', 'Glory', 'Sunset', 'Sunrise', 'Mulligan', 'Draw', 'Dust', 'Death'];
    const presents = ['/33', '/41', '/4067', '/4073', '/3067', '/4098', '/4000', '/4016', '/2099', '/34'];
    const notPresent0 = ['/41', '/4067', '/4073', '/3067', '/4098', '/4000', '/4016', '/2099', '/34', '/4000'];
    const notPresent1 = ['/4067', '/4073', '/3067', '/4098', '/4000', '/4016', '/2099', '/34', '/4000', '/4098'];
    for (let ii = 0; ii < triggers.length; ii++) {
      await browser
        .click({
          selector: '*[data-id="cardFilter"]',
          timeout: 120000
        })
        .waitForElementVisible('*[data-id="cardFilterClear"]')
        .pause(500)
        .click({
          selector: '*[data-id="cardFilterClear"]:enabled',
          timeout: 500,
          suppressNotFoundErrors: true
        })
        .click(`*[data-key="${triggers[ii]}"]`)
        .click('.filterpanel_underlay')
        .click('*[data-id="mobileQuickFilter"]')
        .click('*[data-id="mobileQuickFilter"] *[data-key="ALL"]')
        .waitForElementNotVisible('*[data-id="cardFilterClear"]')
        .waitForElementVisible(`img[srcset*="${presents[ii]}"]`)
        .assert.elementPresent(`img[srcset*="${presents[ii]}"]`, `Found a ${triggers[ii]} card!`)
        .assert.not.elementPresent(`img[srcset*="${notPresent0[ii]}.png"]`)
        .assert.not.elementPresent(`img[srcset*="${notPresent1[ii]}.png"]`);
    }
    await browser
      .end();
  });

  test('Ensure mana cost filter works', async function(browser) {
    await browser
      .resizeWindow(1079, 1079)
      .openskyGoTo('/items/cards')
      .waitForElementVisible('#app *[data-id="searchBox"]')
      .waitForElementVisible('*[data-id="mobileQuickFilter"]');

    const costs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, -1];
    const presents = ['/2002', '/1072', '/4088', '/82', '/4094', '/88', '/3034', '/3002', '/3063', '/4012', '/4070', '/4019'];
    const notPresent0 = ['/1072', '/4088', '/82', '/4094', '/88', '/3034', '/3002', '/3063', '/4012', '/4070', '/3063', '/3002'];
    const notPresent1 = ['/4088', '/82', '/4094', '/88', '/3034', '/3002', '/3063', '/4012', '/4070', '/3063', '/4012', '/3063'];
    for (let ii = 0; ii < costs.length; ii++) {
      await browser
        .click({
          selector: '*[data-id="cardFilter"]',
          timeout: 120000
        })
        .waitForElementVisible('*[data-id="cardFilterClear"]')
        .pause(500)
        .click({
          selector: '*[data-id="cardFilterClear"]:enabled',
          timeout: 500,
          suppressNotFoundErrors: true
        })
        .click(`*[data-key="${costs[ii]}"]`)
        .click('.filterpanel_underlay')
        .click('*[data-id="mobileQuickFilter"]')
        .click('*[data-id="mobileQuickFilter"] *[data-key="ALL"]')
        .waitForElementNotVisible('*[data-id="cardFilterClear"]');

      if (presents[ii] !== null) {
        await browser
          .waitForElementVisible(`img[srcset*="${presents[ii]}"]`)
          .assert.elementPresent(`img[srcset*="${presents[ii]}"]`, `Found a ${costs[ii]} cost card!`);
      }

      await browser
        .assert.not.elementPresent(`img[srcset*="${notPresent0[ii]}.png"]`)
        .assert.not.elementPresent(`img[srcset*="${notPresent1[ii]}.png"]`);
    }
    await browser
      .end();
  });
});

describe('Card Search', function() {
  beforeEach(async(browser) => {
    await browser.openskyLogin();
  });

  test('Ensure card name matches', async function(browser) {
    await browser
      .resizeWindow(1079, 1079)
      .openskyGoTo('/items/cards')
      .waitForElementVisible('#app *[data-id="searchBox"]', 120000)
      .waitForElementVisible('*[data-id="mobileQuickFilter"]')
      .click({
        selector: '*[data-id="mobileQuickFilter"]',
        timeout: 120000
      })
      .click('*[data-id="mobileQuickFilter"] *[data-key="ALL"]')
      .setValue('#app *[data-id="searchBox"] input', 'Gato')
      .waitForElementVisible('*[data-card-id="4042"]') // Gato
      .assert.elementPresent('*[data-card-id="4042"]', 'Gato found!')
      .assert.not.elementPresent('*[data-card-id="1098"]') // Makes sure Blitz is not visible
      .end();
  });

  test('Ensure card has trait', async function(browser) {
    await browser
      .resizeWindow(1079, 1079)
      .openskyGoTo('/items/cards')
      .waitForElementVisible('#app *[data-id="searchBox"]')
      .waitForElementVisible('*[data-id="mobileQuickFilter"]')
      .click({
        selector: '*[data-id="mobileQuickFilter"]',
        timeout: 120000
      })
      .click('*[data-id="mobileQuickFilter"] *[data-key="ALL"]')
      .setValue('*[data-id="searchBox"] input', 'banner')
      .waitForElementVisible('*[data-card-id="1072"]') // Air Rune
      .assert.elementPresent('*[data-card-id="1072"]', 'Banner found!')
      .assert.not.elementPresent('*[data-card-id="1098"]') // Makes sure Blitz is not visible
      .end();
  });

  test('Ensure card has attachment', async function(browser) {
    await browser
      .resizeWindow(1079, 1079)
      .openskyGoTo('/items/cards')
      .waitForElementVisible('#app *[data-id="searchBox"]', 120000)
      .waitForElementVisible('*[data-id="mobileQuickFilter"]')
      .click({
        selector: '*[data-id="mobileQuickFilter"]',
        timeout: 120000
      })
      .click('*[data-id="mobileQuickFilter"] *[data-key="ALL"]')
      .setValue('*[data-id="searchBox"] input', 'vapors')
      .waitForElementVisible('*[data-card-id="4067"]') // Bubbles
      .assert.elementPresent('*[data-card-id="4067"]', 'Vapors found!')
      .assert.not.elementPresent('*[data-card-id="1098"]') // Makes sure Blitz is not visible
      .end();
  });
});

describe('Deck Building', function() {
  beforeEach(async(browser) => {
    await browser.openskyLogin();
  });

  test('Create, edit, then delete a new deck', async function(browser) {
    const now = Date.now().toString();
    // Create Deck
    await browser
      .resizeWindow(1079, 1079)
      .openskyGoTo('/items/decks')
      .waitForElementVisible('a[href="/create-deck"]')
      .click('a[href="/create-deck"]')
      .waitForElementVisible('*[data-id="constructDeck"]')
      .click('*[data-id="constructDeck"]')
      .waitForElementVisible('*[data-id="deckName"]')
      .click('*[data-id="deckName"]')
      .waitForElementVisible('*[data-id="modalDeckName"]')
      .updateValue('*[data-id="modalDeckName"] input', '\x08\x08\x08\x08\x08\x08\x08\x08' + now)
      .click('*[data-id="modalDeckSave"]')
      .waitForElementVisible('*[data-id="saveDeck"]')
      .click('*:nth-child(1) > div[data-card-id]')
      .assert.elementPresent('*[data-id="deckBuilderCardRow"]', 'Card added!')
      .waitForElementVisible('*[data-id="saveDeck"]:not([disabled])')
      .pause(1000)
      .click('*[data-id="saveDeck"]')
      .waitForElementVisible('*[style*="bg-randomization-modal"]')
      .waitForElementVisible('*[data-id="promptAlertConfirm"]')
      .click('*[data-id="promptAlertConfirm"]')
      .waitForElementVisible('a[href="/create-deck"]')
      .assert.containsText('body', now, 'Deck created successfully!');

    // Edit deck
    const CARD_COUNT_XPATH = `//*[contains(text(),"${now}")]/ancestor::*[contains(@class, "griddeck__container")]/..//*[contains(@class, "deckCardsCount")]/div[1]`;
    await browser
      .useXpath()
      .waitForElementVisible(CARD_COUNT_XPATH)
      .assert.not.containsText(CARD_COUNT_XPATH, '2') // Find the deck with the matching name, checks that card count not 2
      .click(`//*[contains(text(),"${now}")]/ancestor::*[contains(@class, "griddeck__container")]/..//*[contains(@class, "griddeck__cards")]`)
      .useCss()
      .waitForElementVisible('*[data-id="saveDeck"]')
      .click('*[data-id="saveDeck"]')
      .waitForElementVisible('*[data-id="deckName"]')
      .click('*:nth-child(2) > div[data-card-id]')
      .pause(1000)
      .click('*[data-id="saveDeck"]')
      .waitForElementVisible('a[href="/create-deck"]')
      .useXpath()
      .assert.containsText(CARD_COUNT_XPATH, '2') // Find the deck with the matching name, checks that card count is 2
      .useCss()
      .assert.containsText('body', now, 'Deck updated successfully!');

    // Delete Deck
    await browser
      .waitForElementVisible('a[href="/create-deck"]')
      .useXpath()
      .click(`//*[contains(text(),"${now}")]/ancestor::*[contains(@class, "griddeck__container")]/../button`) // Find the deck with the matching name, then find the gear button for it.
      .useCss()
      .assert.elementPresent(`input[value="${now}"]`)
      .click('*[data-id="modalDeckDelete"]')
      .waitForElementVisible('*[style*="bg-delete-modal"]')
      .click('*[data-id="promptAlertConfirm"]')
      .assert.not.containsText('body', now, 'Deck deleted successfully!')
      .end();
  });

  test('Import a deck', async function(browser) {
    const deck = 'SWxSTR026Ky';
    await browser
      .resizeWindow(1079, 1079)
      .openskyGoTo('/items/decks')
      .waitForElementVisible('a[href="/create-deck"]')
      .click('a[href="/create-deck"]')
      .waitForElementVisible('*[data-id="constructDeck"]')
      .updateValue('*[data-id="deckStringInput"] input', deck)
      .click('*[data-id="constructDeck"]')
      .waitForElementVisible('*[data-id="saveDeck"]:enabled')
      .click('*[data-id="saveDeck"]:enabled')
      .waitForElementVisible('*[data-id="promptAlertConfirm"]:enabled')
      .click('*[data-id="promptAlertConfirm"]:enabled')
      .waitForElementVisible('a[href="/create-deck"]')
      .assert.containsText('body', 'Imported Deck', 'Deck imported successfully!');

    // Delete Deck
    await browser
      .waitForElementVisible('a[href="/create-deck"]')
      .useXpath()
      .click('//*[contains(text(),"Imported Deck")]/ancestor::*[contains(@class, "griddeck__container")]/../button') // Find the deck with the matching name, then find the gear button for it.
      .useCss()
      .assert.elementPresent('input[value="Imported Deck"]')
      .assert.containsText('.modalWrapper', deck)
      .click('*[data-id="modalDeckDelete"]')
      .waitForElementVisible('*[style*="bg-delete-modal"]')
      .click('*[data-id="promptAlertConfirm"]')
      .assert.not.containsText('body', 'Imported Deck', 'Deck deleted successfully!')
      .end();
  });

  // TODO: This requires having at least one locked card, but without database scripts, this is rather difficult to do consistently.
  test.skip('Marketplace Order Button for Unowned Cards', async function(browser) {
    await browser
      .resizeWindow(1079, 1079)
      .clearCart()
      .openskyGoTo('/items/decks')
      .waitForElementVisible('a[href="/create-deck"]')
      .click('a[href="/create-deck"]')
      .waitForElementVisible('*[data-id="constructDeck"]')
      .click('*[data-id="constructDeck"]')
      .click({
        selector: '*[data-id="mobileQuickFilter"]',
        timeout: 120000
      })
      .click('*[data-id="mobileQuickFilter"] *[data-key="LOCKED"]')
      .waitForElementVisible('*[data-id="saveDeck"]')
      .assert.not.elementPresent('*[data-id="buyDeck"]')
      .click('*:nth-child(1) > div[data-card-id]')
      .assert.elementPresent('*[data-id="buyDeck"]', 'Add To Order button present!')
      .click('*[data-id="buyDeck"]')
      .waitForElementVisible('*[style*="bg-add-to-cart-modal"]')
      .click('*[data-id="promptAlertConfirm"]')
      .waitForElementVisible('*[style*="bg-leave-modal"]')
      .click('*[data-id="promptAlertConfirm"]')
      .assert.elementPresent('*[data-card-row-id]', 'Card added to cart!')
      .click('*[data-id="clearCart"]')
      .end();
  });
});
