
// TODO: I want to get all the tests into a build, will fix after
describe.skip('Practice', function() {
  beforeEach(async(browser) => {
    await browser.openskyLogin();
  });

  test('Entering a Discovery Bot Game', async function(browser) {
    await browser
      .openskyGoTo('/play/practice')
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
      .click('*[data-id="playButton"]')
      .gameOpeningHand()
      .gameConcede()
      .gamePostScreenContinue()
      .gamePostScreenContinue()
      .assert.urlContains('/play', 'Finished practice game!')
      .end();
  });
});
