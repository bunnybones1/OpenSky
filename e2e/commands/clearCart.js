module.exports = class ClearCart {
  async command() {
    const at = await this.api.url();

    if (at.indexOf('/market/cards/buy') === -1) {
      await this.api
        .openskyGoTo('/market/cards/buy');
    }

    await this.api
      .waitForElementVisible('#app *[data-id="searchBox"]');

    const cartEmpty = await this.api.getAttribute('*[data-id="reviewOrder"]', 'disabled');

    if (!cartEmpty) {
      await this.api
        .click('*[data-id="reviewOrder"]')
        .waitForElementVisible('*[data-id="processOrder"]')
        .click('*[data-id="clearCart"]')
        .waitForElementNotPresent('*[data-id="processOrder"]');
    }
  }
};
