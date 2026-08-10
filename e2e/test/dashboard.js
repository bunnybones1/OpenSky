describe('Dashboard', function() {
  beforeEach(async(browser) => {
    await browser.openskyLogin();
  });

  test('Game Modes', async function(browser) {
    const gameModes = ['gameModeRanked', 'gameModePrivate', 'gameModePractice', 'gameModeTutorial'];
    const gameUrls = ['/play/ranked', '/play/private', '/play/practice', '/play/tutorial'];
    await browser
      .openskyGoTo('/play/tutorial')
      .waitForElementVisible('*[data-id="gameMode"]');

    for (let ii = 0; ii < gameModes.length; ii++) {
      await browser
        .click('*[data-id="gameMode"]')
        .waitForElementVisible(`*[data-id="${gameModes[ii]}"]`)
        .pause(1000)
        .click(`*[data-id="${gameModes[ii]}"]`)
        .waitForElementVisible('*[data-id="gameMode"]')
        .assert.urlContains(gameUrls[ii]);
    }

    await browser.end();
  });

  test('Game Modes (Conquest)', async function(browser) {
    await browser
      .openskyGoTo('/play/tutorial')
      .waitForElementVisible('*[data-id="gameMode"]')
      .click('*[data-id="gameMode"]')
      .waitForElementVisible('*[data-id="gameModeConquest"]')
      .pause(1000)
      .click('*[data-id="gameModeConquest"]')
      .waitForElementVisible('*[data-id="gameMode"]')
      .assert.urlContains('/play/conquest')
      .end();
  });

  test('Disclaimer Banner', async function(browser) {
    await browser
      .openskyGoTo('/play/tutorial')
      .waitForElementVisible('*[data-id="gameMode"]');

    const hasBanner = async() => {
      const result = await browser.isVisible({
        selector: '*[data-id="disclaimerBanner"]',
        suppressNotFoundErrors: true
      });

      if (result === true) {
        await browser.expect.elements('*[data-id="disclaimerBanner"]').count.equal(1);
      }

      return result === true;
    };

    let previousLevel = 'warning';

    while (await hasBanner()) {
      const level = await browser.getAttribute(
        '*[data-id="disclaimerBanner"]',
        'data-banner-type');

      if (previousLevel !== 'warning') {
        await browser.assert.notEqual(level, 'warning');
      }

      previousLevel = level;

      await browser.click('*[data-id="disclaimerClose"]')
        .pause(500);
    }

    await browser
      .openskyGoTo('/play/tutorial')
      .assert.ok(!await hasBanner(), 'No banner found!')
      .end();
  });
});
