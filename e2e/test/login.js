describe('Login', function() {
  test('Login with Email, then Logout', async function(browser) {
    // Login
    // Navigate to Sequence/OpenSky once to save http username/password
    await browser.url(browser.globals.SKYWEAVER_LOGIN)
      .waitForElementVisible('body')
      .url(browser.globals.SEQUENCE_LOGIN)
      .waitForElementVisible('body');

    const url = await browser.openskyUrl('/');
    await browser
      .url(url)
      .waitForElementVisible('body')
      .click('*[data-id="existingAccount"]');

    const gameWindow = await browser.windowHandle();

    const XPATH_EMAIL_BTN = '//button[contains(., "Email")]';

    await browser
      .focusSequence()
      .useXpath()
      .waitForElementVisible(XPATH_EMAIL_BTN)
      .click(XPATH_EMAIL_BTN)
      .useCss()
      .waitForElementVisible('input[type="email"]');

    const walletWindow = await browser.windowHandle();

    await browser
      .updateValue('input[type="email"]', browser.globals.EMAIL)
      .click('*[data-id="continueButton"]:not([disabled])')
      .focusOpenSky()
      .pause(30000);

    const link = await browser.fetchSequenceEmail();
    await browser
      .popup(link)
      .pause(1000);

    let handles = await browser.windowHandles();
    handles = handles.filter(h => h !== gameWindow);
    handles = handles.filter(h => h !== walletWindow);

    browser.assert.equal(1, handles.length);

    await browser
      .switchWindow(handles[0])
      .waitForElementVisible('*[data-id="confirmSession"]')
      .click('*[data-id="confirmSession"]')
      .useXpath()
      .waitForElementVisible('//*[contains(., "You can close this window")]', 240000)
      .useCss()
      .closeWindow()
      .focusOpenSky()
      .waitForElementVisible('*[href^="/account/0x"]', 120000)
      .assert.urlContains('/home', 'Logged in via email!');

    const accountURLText = (await browser.getAttribute('*[href^="/account/0x"]', 'href'));
    const accountURL = new URL(accountURLText, browser.globals.SKYWEAVER_URL);

    // Logout
    await browser
      .openskyGoTo(accountURL.pathname)
      .waitForElementVisible('*[data-id="accountSettingsButton"]')
      .click('*[data-id="accountSettingsButton"]')
      .waitForElementVisible('*[data-id="logoutButton"]')
      .click('*[data-id="logoutButton"]')
      .assert.elementPresent('.startButton', 'Logged out!')
      .end();
  });
});
