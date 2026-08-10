describe('User Profile', function() {
  beforeEach(async(browser) => {
    await browser.openskyLogin();
  });

  test('Changing Account Cover Picture', async function(browser) {
    await browser.openskyGoTo('/');

    const accountURLText = await browser.getAttribute('*[href^="/account/0x"]', 'href');
    const accountURL = new URL(accountURLText, browser.globals.SKYWEAVER_URL);

    // Logout
    await browser.openskyGoTo(accountURL.pathname);

    await browser
      .waitForElementVisible('*[data-id="accountSettingsButton"]')
      .click('*[data-id="accountSettingsButton"]')
      .waitForElementVisible('*[data-id="tagArtButton"]')
      .click('*[data-id="tagArtButton"]')
      .updateValue('*[data-id="tagSettingsListControlsSearch"] input', 's'); // https://github.com/horizon-games/issue-tracker/issues/8330

    const banner = await browser.getAttribute(
      '*[data-tag-art-active="false"]',
      'data-tag-art-id'
    );

    await browser
      .click(`*[data-tag-art-id="${banner}"]`)
      .waitForElementVisible('*[data-id="accountSettingsSave"]')
      .assert.elementPresent(`img[src*="${banner}"]`, `Cover changed to ${banner}`)
      .click('*[data-id="accountSettingsSave"]:not([disabled])')
      .waitForElementNotVisible('form', 10000)
      .waitForElementVisible('*[data-id="accountSettingsButton"]')
      .assert.elementPresent(`img[src*="${banner}"]`, 'Banner saved!')
      .end();
  });

  test('Changing Account Region', async function(browser) {
    await browser.openskyGoTo('/');

    const accountURLText = await browser.getAttribute('*[href^="/account/0x"]', 'href');
    const accountURL = new URL(accountURLText, browser.globals.SKYWEAVER_URL);

    // Logout
    await browser.openskyGoTo(accountURL.pathname)
      .waitForElementVisible('*[data-id="accountSettingsButton"]')
      .click('*[data-id="accountSettingsButton"]')
      .waitForElementVisible('*[data-id="regionButton"]');

    // TODO: should be able to use `data-region-active` but it's broken right now
    let currentRegion = 'ca';

    const regionVisible = await browser.isVisible({
      selector: '.flag-icon',
      timeout: 5000,
      suppressNotFoundErrors: true
    });

    if (regionVisible === true) {
      currentRegion = (await browser.getAttribute(
        '.flag-icon',
        'src'
      )).substr(-6, 2);
    }

    await browser
      .click('*[data-id="regionButton"]');

    const region = await browser.getAttribute(
      `*[data-region]:not([data-region="${currentRegion}" i]):not([data-region=""])`,
      'data-region'
    );

    await browser
      .click(`*[data-region="${region}"]`)
      .waitForElementVisible('*[data-id="accountSettingsSave"]')
      .assert.elementPresent(`.flag-icon[src$="${region}.svg" i]`, `Region changed to ${region}`)
      .click('*[data-id="accountSettingsSave"]:not([disabled])')
      .waitForElementNotVisible('form', 10000)
      .waitForElementVisible('*[data-id="accountSettingsButton"]')
      .assert.elementPresent(`.flag-icon[src$="${region}.svg" i]`, 'Region saved!')
      .end();
  });
});
