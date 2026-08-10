module.exports = class OpenSkyLogin {
  async command(index) {
    await this.api.url(this.api.globals.SKYWEAVER_LOGIN)
      .waitForElementVisible('body');

    const url = await this.api.openskyUrl('/');

    await this.api
      .sequenceLogin(index)
      .url(url)
      .waitForElementNotVisible('#loader')
      .waitForElementVisible('*[data-id="existingAccount"]', 120000)
      .click('*[data-id="existingAccount"]')
      .focusSequence()
      .waitForElementVisible('*[data-id="signingContinue"]', 120000)
      .click('*[data-id="signingContinue"]')
      .pause(5000)
      .focusOpenSky()
      .waitForElementVisible('*[href^="/account/0x"]', 120000)
      .assert.urlContains('/home');
  }
};
