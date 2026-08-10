
// TODO: I want to get all the tests into a build, will fix after
describe.skip('Private', function() {
  beforeEach(async(browser) => {
    await browser.openskyLogin();
  });

  test('Entering a Discovery Private Game', async function(browser) {
    await browser
      .openskyGoTo('/play/private')
      .waitForElementVisible('*[data-tab-id="general.DISCOVERY"]')
      .click({
        selector: '*:not(.isSelected) > *[data-tab-id="general.DISCOVERY"]',
        suppressNotFoundErrors: true
      })
      .click('*[data-id="typeHeroButton"]')
      .waitForElementVisible('*[data-hero-id="STR"]')
      .pause(1000)
      .click('*[data-hero-id="UNKNOWN_CLASS"]')
      .assert.not.elementPresent('*[data-hero-id="STR"]')
      .click('*[data-id="generateSessionCode"]');

    const sessionCode = await browser.getValue('*[data-id="sessionCode"] input');

    await browser
      .assert.not.equal(sessionCode, '', `Generated code: ${sessionCode}`)
      .triggerPlayer2('/play/private', sessionCode)
      .click('*[data-id="playButton"]')
      .focusSequence()
      .sequenceConfirm()
      .focusOpenSky()
      .waitForElementVisible('*[data-id="acceptMatch"]', 120000)
      .click('*[data-id="acceptMatch"]')
      .gameOpeningHand()
      .pause(16000);

    for (let ii = 0; ii < 10; ii++) {
      await browser.gamePostScreenContinue();
      const url = await browser.url();
      if (url.indexOf('/game') === -1) {
        break;
      }
    }

    await browser
      .assert.urlContains('/play')
      .end();
  });
});
